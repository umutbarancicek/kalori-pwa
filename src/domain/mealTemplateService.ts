import type { AppDatabase } from '../db/database';
import type { DiaryEntry, MealTemplate, MealType } from '../db/schema';
import { addDiaryEntry } from './diaryService';

export async function saveMealTemplate(
  db: AppDatabase,
  name: string,
  items: { foodId: string; quantityGrams: number }[],
): Promise<MealTemplate> {
  const template: MealTemplate = { id: crypto.randomUUID(), name, items };
  await db.mealTemplates.add(template);
  return template;
}

export async function saveMealTemplateFromDiary(
  db: AppDatabase,
  name: string,
  date: string,
): Promise<MealTemplate> {
  const entries = await db.diaryEntries.where('date').equals(date).toArray();
  const quantityByFoodId = new Map<string, number>();
  for (const entry of entries) {
    quantityByFoodId.set(
      entry.foodId,
      (quantityByFoodId.get(entry.foodId) ?? 0) + entry.quantityGrams,
    );
  }
  const items = [...quantityByFoodId.entries()].map(([foodId, quantityGrams]) => ({
    foodId,
    quantityGrams,
  }));
  return saveMealTemplate(db, name, items);
}

export async function applyMealTemplate(
  db: AppDatabase,
  templateId: string,
  date: string,
  mealType: MealType = 'other',
): Promise<DiaryEntry[]> {
  const template = await db.mealTemplates.get(templateId);
  if (!template) {
    throw new Error(`Meal template not found: ${templateId}`);
  }
  const entries: DiaryEntry[] = [];
  for (const item of template.items) {
    entries.push(await addDiaryEntry(db, item.foodId, item.quantityGrams, date, mealType));
  }
  return entries;
}
