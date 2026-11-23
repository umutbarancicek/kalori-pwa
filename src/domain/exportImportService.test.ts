import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { AppDatabase } from '../db/database';
import { upsertFood } from '../db/foodRepository';
import type { Nutrients } from '../db/schema';
import { exportAllData, importAllData } from './exportImportService';

const nutrients: Nutrients = {
  kcal: 100,
  protein: 1,
  carb: 1,
  sugar: 1,
  fat: 1,
  satFat: 1,
  fiber: 1,
  salt: 1,
};

describe('exportImportService', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = new AppDatabase();
  });

  afterEach(async () => {
    await db.delete();
  });

  test('export edilen veri import edilince aynı kayıtları üretir (round-trip)', async () => {
    await upsertFood(db, {
      id: 'food-1',
      name: 'Peynir',
      nutrientsPer100g: nutrients,
      source: 'user',
      usageCount: 2,
    });
    await db.diaryEntries.add({
      id: 'entry-1',
      date: '2026-11-23',
      foodId: 'food-1',
      quantityGrams: 50,
      snapshotNutrients: nutrients,
      createdAt: 1,
    });

    const json = await exportAllData(db);
    await db.delete();
    db = new AppDatabase();
    await importAllData(db, json, 'overwrite');

    const food = await db.foods.get('food-1');
    const entry = await db.diaryEntries.get('entry-1');
    expect(food?.name).toBe('Peynir');
    expect(entry?.quantityGrams).toBe(50);
  });

  test('merge modunda id çakışmasında mevcut diary geçmişi kaybolmaz', async () => {
    await upsertFood(db, {
      id: 'food-1',
      name: 'Eski Peynir',
      nutrientsPer100g: nutrients,
      source: 'user',
      usageCount: 0,
    });
    await db.diaryEntries.add({
      id: 'existing-entry',
      date: '2026-11-22',
      foodId: 'food-1',
      quantityGrams: 30,
      snapshotNutrients: nutrients,
      createdAt: 1,
    });

    const incomingJson = JSON.stringify({
      foods: [
        {
          id: 'food-1',
          name: 'Yeni Peynir',
          nutrientsPer100g: nutrients,
          source: 'user',
          usageCount: 0,
        },
      ],
      diaryEntries: [
        {
          id: 'imported-entry',
          date: '2026-11-23',
          foodId: 'food-1',
          quantityGrams: 40,
          snapshotNutrients: nutrients,
          createdAt: 2,
        },
      ],
      mealTemplates: [],
      settings: [],
    });

    await importAllData(db, incomingJson, 'merge');

    const existingEntry = await db.diaryEntries.get('existing-entry');
    const importedEntry = await db.diaryEntries.get('imported-entry');
    const food = await db.foods.get('food-1');

    expect(existingEntry?.quantityGrams).toBe(30);
    expect(importedEntry?.quantityGrams).toBe(40);
    expect(food?.name).toBe('Yeni Peynir');
  });

  test('bozuk JSON içe aktarılırsa anlaşılır bir hata fırlatır, veriyi bozmaz', async () => {
    await expect(importAllData(db, 'not valid json', 'merge')).rejects.toThrow(
      /geçersiz|invalid/i,
    );
  });

  test('beklenen alanlardan biri eksikse anlaşılır bir hata fırlatır', async () => {
    const malformed = JSON.stringify({ foods: [] }); // diaryEntries/mealTemplates/settings missing
    await expect(importAllData(db, malformed, 'merge')).rejects.toThrow(/geçersiz|invalid/i);
  });
});
