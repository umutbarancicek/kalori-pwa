import type { AppDatabase } from '../db/database';
import type { DiaryEntry, MealTemplate } from '../db/schema';
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

export async function applyMealTemplate(
  db: AppDatabase,
  templateId: string,
  date: string,
): Promise<DiaryEntry[]> {
  const template = await db.mealTemplates.get(templateId);
  if (!template) {
    throw new Error(`Meal template not found: ${templateId}`);
  }
  const entries: DiaryEntry[] = [];
  for (const item of template.items) {
    entries.push(await addDiaryEntry(db, item.foodId, item.quantityGrams, date));
  }
  return entries;
}
