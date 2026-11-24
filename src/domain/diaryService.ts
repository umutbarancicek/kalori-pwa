import { recordUsage } from '../db/foodRepository';
import type { AppDatabase } from '../db/database';
import type { DiaryEntry, Food, MealType, Nutrients } from '../db/schema';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

const ZERO_NUTRIENTS: Nutrients = {
  kcal: 0,
  protein: 0,
  carb: 0,
  sugar: 0,
  fat: 0,
  satFat: 0,
  fiber: 0,
  salt: 0,
};

function scaleNutrients(per100g: Nutrients, quantityGrams: number): Nutrients {
  const ratio = quantityGrams / 100;
  return {
    kcal: per100g.kcal * ratio,
    protein: per100g.protein * ratio,
    carb: per100g.carb * ratio,
    sugar: per100g.sugar * ratio,
    fat: per100g.fat * ratio,
    satFat: per100g.satFat * ratio,
    fiber: per100g.fiber * ratio,
    salt: per100g.salt * ratio,
  };
}

function multiplyNutrients(n: Nutrients, factor: number): Nutrients {
  return {
    kcal: n.kcal * factor,
    protein: n.protein * factor,
    carb: n.carb * factor,
    sugar: n.sugar * factor,
    fat: n.fat * factor,
    satFat: n.satFat * factor,
    fiber: n.fiber * factor,
    salt: n.salt * factor,
  };
}

function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carb: a.carb + b.carb,
    sugar: a.sugar + b.sugar,
    fat: a.fat + b.fat,
    satFat: a.satFat + b.satFat,
    fiber: a.fiber + b.fiber,
    salt: a.salt + b.salt,
  };
}

export function resolveQuantityGrams(quantityGrams: number | undefined, food: Food): number {
  return quantityGrams ?? food.lastQuantityGrams ?? 100;
}

export async function addDiaryEntry(
  db: AppDatabase,
  foodId: string,
  quantityGrams: number,
  date: string,
  mealType: MealType = 'other',
): Promise<DiaryEntry> {
  const food = await db.foods.get(foodId);
  if (!food) {
    throw new Error(`Food not found: ${foodId}`);
  }
  const entry: DiaryEntry = {
    id: crypto.randomUUID(),
    date,
    foodId,
    quantityGrams,
    snapshotNutrients: scaleNutrients(food.nutrientsPer100g, quantityGrams),
    createdAt: Date.now(),
    mealType,
  };
  await db.diaryEntries.add(entry);
  await recordUsage(db, foodId, quantityGrams);
  return entry;
}

/** Removes the entry and returns what was deleted, so the caller can offer "undo" by re-adding it. */
export async function deleteDiaryEntry(db: AppDatabase, entryId: string): Promise<DiaryEntry> {
  const entry = await db.diaryEntries.get(entryId);
  if (!entry) {
    throw new Error(`Diary entry not found: ${entryId}`);
  }
  await db.diaryEntries.delete(entryId);
  return entry;
}

/** Re-inserts a previously deleted entry (for "undo"), preserving its original id and mealType. */
export async function restoreDiaryEntry(db: AppDatabase, entry: DiaryEntry): Promise<void> {
  await db.diaryEntries.add(entry);
}

export async function updateDiaryEntryQuantity(
  db: AppDatabase,
  entryId: string,
  quantityGrams: number,
): Promise<DiaryEntry> {
  const entry = await db.diaryEntries.get(entryId);
  if (!entry) {
    throw new Error(`Diary entry not found: ${entryId}`);
  }
  const food = await db.foods.get(entry.foodId);
  const snapshotNutrients = food
    ? scaleNutrients(food.nutrientsPer100g, quantityGrams)
    : // Food was deleted since this entry was logged — scale the entry's own
      // snapshot by the ratio of new/old quantity rather than losing the data.
      multiplyNutrients(entry.snapshotNutrients, quantityGrams / entry.quantityGrams);
  const updated: DiaryEntry = { ...entry, quantityGrams, snapshotNutrients };
  await db.diaryEntries.put(updated);
  return updated;
}

/**
 * Logs a bare kcal number with no food picked. Stores quantityGrams equal to
 * the kcal value itself (not grams) so updateDiaryEntryQuantity's existing
 * ratio-based rescale ("new/old") works unchanged for editing it later,
 * instead of dividing by a zero quantity.
 */
export async function addQuickKcalEntry(
  db: AppDatabase,
  kcal: number,
  date: string,
  mealType: MealType = 'other',
): Promise<DiaryEntry> {
  const entry: DiaryEntry = {
    id: crypto.randomUUID(),
    date,
    foodId: '',
    quantityGrams: kcal,
    snapshotNutrients: { ...ZERO_NUTRIENTS, kcal },
    createdAt: Date.now(),
    mealType,
    label: 'Hızlı kcal girişi',
  };
  await db.diaryEntries.add(entry);
  return entry;
}

const MEAL_TYPE_HOUR_RANGES: { mealType: MealType; startHour: number; endHour: number }[] = [
  { mealType: 'breakfast', startHour: 5, endHour: 11 },
  { mealType: 'lunch', startHour: 11, endHour: 15 },
  { mealType: 'snack', startHour: 15, endHour: 18 },
  { mealType: 'dinner', startHour: 18, endHour: 23 },
];

/** 05–11 Kahvaltı, 11–15 Öğle, 15–18 Atıştırmalık, 18–23 Akşam, else Atıştırmalık (gece). */
export function getMealTypeForTime(hour: number): MealType {
  const match = MEAL_TYPE_HOUR_RANGES.find((r) => hour >= r.startHour && hour < r.endHour);
  return match?.mealType ?? 'snack';
}

/** Re-logs every item from one date+meal onto another date (same meal), e.g. "copy yesterday's breakfast". */
export async function copyMealFromDate(
  db: AppDatabase,
  sourceDate: string,
  mealType: MealType,
  targetDate: string,
): Promise<DiaryEntry[]> {
  const sourceEntries = await db.diaryEntries
    .where('date')
    .equals(sourceDate)
    .filter((entry) => (entry.mealType ?? 'other') === mealType)
    .toArray();

  const copied: DiaryEntry[] = [];
  for (const entry of sourceEntries) {
    copied.push(await addDiaryEntry(db, entry.foodId, entry.quantityGrams, targetDate, mealType));
  }
  return copied;
}

export async function getEntriesGroupedByMeal(
  db: AppDatabase,
  date: string,
): Promise<Record<MealType, DiaryEntry[]>> {
  const entries = await db.diaryEntries.where('date').equals(date).toArray();
  const grouped = Object.fromEntries(
    MEAL_TYPES.map((type) => [type, [] as DiaryEntry[]]),
  ) as Record<MealType, DiaryEntry[]>;
  for (const entry of entries) {
    grouped[entry.mealType ?? 'other'].push(entry);
  }
  return grouped;
}

export async function getDailyTotal(db: AppDatabase, date: string): Promise<Nutrients> {
  const entries = await db.diaryEntries.where('date').equals(date).toArray();
  return entries.reduce((total, entry) => addNutrients(total, entry.snapshotNutrients), {
    ...ZERO_NUTRIENTS,
  });
}

export async function getHistory(db: AppDatabase): Promise<{ date: string; total: Nutrients }[]> {
  const entries = await db.diaryEntries.toArray();
  const totalsByDate = new Map<string, Nutrients>();
  for (const entry of entries) {
    const existing = totalsByDate.get(entry.date) ?? { ...ZERO_NUTRIENTS };
    totalsByDate.set(entry.date, addNutrients(existing, entry.snapshotNutrients));
  }
  return [...totalsByDate.entries()]
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
