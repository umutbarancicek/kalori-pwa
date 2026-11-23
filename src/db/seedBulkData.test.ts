import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AppDatabase } from './database';
import { upsertFood } from './foodRepository';
import { seedBulkDataIfNeeded } from './seedBulkData';
import type { Food, Nutrients } from './schema';

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

function bulkFood(id: string, name: string): Food {
  return { id, name, nutrientsPer100g: nutrients, source: 'bulk', usageCount: 0 };
}

describe('seedBulkDataIfNeeded', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = new AppDatabase();
  });

  afterEach(async () => {
    await db.delete();
  });

  test('ilk çalıştırmada bulk veriler eklenir', async () => {
    const fetchBulk = vi.fn().mockResolvedValue([bulkFood('off-1', 'Peynir')]);
    const fetchGeneric = vi.fn().mockResolvedValue([bulkFood('usda-1', 'Tavuk')]);

    await seedBulkDataIfNeeded(db, fetchBulk, fetchGeneric);

    expect(await db.foods.get('off-1')).toMatchObject({ name: 'Peynir' });
    expect(await db.foods.get('usda-1')).toMatchObject({ name: 'Tavuk' });
    expect(fetchBulk).toHaveBeenCalledTimes(1);
  });

  test('ikinci çalıştırmada mevcut user kaydı korunur, tekrar seed çalışmaz', async () => {
    const fetchBulk = vi.fn().mockResolvedValue([bulkFood('off-1', 'Peynir')]);
    const fetchGeneric = vi.fn().mockResolvedValue([bulkFood('usda-1', 'Tavuk')]);

    await seedBulkDataIfNeeded(db, fetchBulk, fetchGeneric);
    await upsertFood(db, {
      id: 'user-1',
      name: 'Evde Yapılan Çorba',
      nutrientsPer100g: nutrients,
      source: 'user',
      usageCount: 3,
    });

    await seedBulkDataIfNeeded(db, fetchBulk, fetchGeneric);

    expect(fetchBulk).toHaveBeenCalledTimes(1);
    const userFood = await db.foods.get('user-1');
    expect(userFood?.source).toBe('user');
    expect(userFood?.usageCount).toBe(3);
  });
});
