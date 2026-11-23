import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test } from 'vitest';
import { AppDatabase } from './database';
import type { Nutrients } from './schema';

const sampleNutrients: Nutrients = {
  kcal: 300,
  protein: 20,
  carb: 2,
  sugar: 1,
  fat: 25,
  satFat: 16,
  fiber: 0,
  salt: 1.5,
};

describe('AppDatabase', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = new AppDatabase();
  });

  test('food eklenip barkoddan okunabilir', async () => {
    await db.foods.add({
      id: '1',
      name: 'Peynir',
      barcode: '869000',
      nutrientsPer100g: sampleNutrients,
      source: 'bulk',
      usageCount: 0,
    });
    const found = await db.foods.where('barcode').equals('869000').first();
    expect(found?.name).toBe('Peynir');
  });
});
