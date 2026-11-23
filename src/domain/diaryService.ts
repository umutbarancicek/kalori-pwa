import { recordUsage } from '../db/foodRepository';
import type { AppDatabase } from '../db/database';
import type { DiaryEntry, Food, Nutrients } from '../db/schema';

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
  };
  await db.diaryEntries.add(entry);
  await recordUsage(db, foodId, quantityGrams);
  return entry;
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
