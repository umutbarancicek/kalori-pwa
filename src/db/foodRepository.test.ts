import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test } from 'vitest';
import { AppDatabase } from './database';
import {
  findByBarcode,
  getFavoritesAndRecents,
  recordUsage,
  searchFoods,
  upsertFood,
} from './foodRepository';
import type { Food, Nutrients } from './schema';

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

function makeFood(overrides: Partial<Food>): Food {
  return {
    id: overrides.id ?? '1',
    name: overrides.name ?? 'Çorba',
    nutrientsPer100g: sampleNutrients,
    source: 'bulk',
    usageCount: 0,
    ...overrides,
  };
}

describe('foodRepository', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = new AppDatabase();
  });

  test('corba araması Çorba kaydını bulur', async () => {
    await upsertFood(db, makeFood({ id: '1', name: 'Çorba' }));
    const results = await searchFoods(db, 'corba');
    expect(results.some((f) => f.name === 'Çorba')).toBe(true);
  });

  test('recordUsage son miktarı ve kullanım sayısını günceller', async () => {
    await upsertFood(db, makeFood({ id: '1', name: 'Peynir', usageCount: 0 }));
    await recordUsage(db, '1', 50);
    const updated = await db.foods.get('1');
    expect(updated?.usageCount).toBe(1);
    expect(updated?.lastQuantityGrams).toBe(50);
    expect(updated?.lastUsedAt).toEqual(expect.any(Number));
  });

  test('findByBarcode mevcut barkodu bulur', async () => {
    await upsertFood(db, makeFood({ id: '1', name: 'Süt', barcode: '869001' }));
    const found = await findByBarcode(db, '869001');
    expect(found?.name).toBe('Süt');
  });

  test('getFavoritesAndRecents en çok kullanılanı önce getirir', async () => {
    await upsertFood(db, makeFood({ id: '1', name: 'Ekmek', usageCount: 5, lastUsedAt: 1 }));
    await upsertFood(db, makeFood({ id: '2', name: 'Elma', usageCount: 1, lastUsedAt: 2 }));
    const favorites = await getFavoritesAndRecents(db);
    expect(favorites[0].name).toBe('Ekmek');
  });
});
