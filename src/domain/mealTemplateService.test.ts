import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { AppDatabase } from '../db/database';
import { upsertFood } from '../db/foodRepository';
import type { Nutrients } from '../db/schema';
import { addDiaryEntry } from './diaryService';
import {
  applyMealTemplate,
  deleteMealTemplate,
  saveMealTemplateFromDiary,
  saveMealTemplate,
} from './mealTemplateService';

const nutrients: Nutrients = {
  kcal: 200,
  protein: 10,
  carb: 20,
  sugar: 5,
  fat: 8,
  satFat: 2,
  fiber: 1,
  salt: 0.5,
};

describe('mealTemplateService', () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = new AppDatabase();
    await upsertFood(db, {
      id: 'food-1',
      name: 'Yumurta',
      nutrientsPer100g: nutrients,
      source: 'bulk',
      usageCount: 0,
    });
    await upsertFood(db, {
      id: 'food-2',
      name: 'Ekmek',
      nutrientsPer100g: nutrients,
      source: 'bulk',
      usageCount: 0,
    });
  });

  afterEach(async () => {
    await db.delete();
  });

  test('şablon uygulanınca tüm kalemler günlüğe eklenir', async () => {
    const template = await saveMealTemplate(db, 'Kahvaltı', [
      { foodId: 'food-1', quantityGrams: 100 },
      { foodId: 'food-2', quantityGrams: 50 },
    ]);

    const entries = await applyMealTemplate(db, template.id, '2026-11-23');

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.foodId).sort()).toEqual(['food-1', 'food-2']);
    const diaryEntries = await db.diaryEntries.where('date').equals('2026-11-23').toArray();
    expect(diaryEntries).toHaveLength(2);
  });

  test('şablon belirli bir öğün tipiyle uygulanabilir', async () => {
    const template = await saveMealTemplate(db, 'Kahvaltı', [{ foodId: 'food-1', quantityGrams: 100 }]);
    const entries = await applyMealTemplate(db, template.id, '2026-11-23', 'breakfast');
    expect(entries[0].mealType).toBe('breakfast');
  });

  test('saveMealTemplateFromDiary o günün kayıtlarından, aynı besin tekrarlanırsa miktarları toplayarak şablon oluşturur', async () => {
    await addDiaryEntry(db, 'food-1', 100, '2026-11-23');
    await addDiaryEntry(db, 'food-1', 50, '2026-11-23');
    await addDiaryEntry(db, 'food-2', 30, '2026-11-23');
    await addDiaryEntry(db, 'food-1', 999, '2026-11-24'); // different day, must be excluded

    const template = await saveMealTemplateFromDiary(db, 'Kahvaltı', '2026-11-23');

    expect(template.items.sort((a, b) => a.foodId.localeCompare(b.foodId))).toEqual([
      { foodId: 'food-1', quantityGrams: 150 },
      { foodId: 'food-2', quantityGrams: 30 },
    ]);
  });

  test('deleteMealTemplate şablonu kaldırır', async () => {
    const template = await saveMealTemplate(db, 'Kahvaltı', [
      { foodId: 'food-1', quantityGrams: 100 },
    ]);

    await deleteMealTemplate(db, template.id);

    expect(await db.mealTemplates.get(template.id)).toBeUndefined();
  });
});
