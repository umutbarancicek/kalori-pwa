import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AppDatabase } from './database';
import { upsertFood } from './foodRepository';
import { seedBulkDataIfNeeded, BULK_DATA_VERSION_KEY } from './seedBulkData';
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

  test('versiyon yükseltmesiyle yeniden seed çalışsa bile verified kayıt ve kullanım istatistikleri ezilmez', async () => {
    const fetchBulk = vi.fn().mockResolvedValue([bulkFood('off-1', 'Peynir')]);
    const fetchGeneric = vi.fn().mockResolvedValue([]);

    await seedBulkDataIfNeeded(db, fetchBulk, fetchGeneric);
    await db.foods.update('off-1', {
      source: 'verified',
      usageCount: 7,
      lastQuantityGrams: 42,
      lastUsedAt: 12345,
    });
    // force a re-seed as if a newer bulk data version shipped
    await db.settings.put({ key: BULK_DATA_VERSION_KEY, value: 0 });

    await seedBulkDataIfNeeded(db, fetchBulk, fetchGeneric);

    const food = await db.foods.get('off-1');
    expect(food?.source).toBe('verified');
    expect(food?.usageCount).toBe(7);
    expect(food?.lastQuantityGrams).toBe(42);
  });

  test('yeni veri setinde artık bulunmayan eski bulk kayıtlar re-seed sırasında silinir', async () => {
    const fetchBulk = vi.fn().mockResolvedValue([bulkFood('off-1', 'Peynir')]);
    const fetchGeneric = vi.fn().mockResolvedValue([]);

    await seedBulkDataIfNeeded(db, fetchBulk, fetchGeneric);
    // Simulate a stale bulk record from a previous (lower-quality) data version
    // that is no longer present in the new dataset.
    await upsertFood(db, {
      id: 'stale-gazoz',
      name: 'Uludağ gazoz 200',
      nutrientsPer100g: { ...nutrients, kcal: 0 },
      source: 'bulk',
      usageCount: 0,
    });
    await db.settings.put({ key: BULK_DATA_VERSION_KEY, value: 0 }); // force re-seed

    await seedBulkDataIfNeeded(db, fetchBulk, fetchGeneric);

    expect(await db.foods.get('stale-gazoz')).toBeUndefined();
    expect(await db.foods.get('off-1')).toMatchObject({ name: 'Peynir' }); // still-current record untouched
  });

  test('yeni veri setinde artık bulunmayan ama kullanıcının günlüğüne eklediği (usageCount>0) bulk kayıt yine de silinir', async () => {
    const fetchBulk = vi.fn().mockResolvedValue([bulkFood('off-1', 'Peynir')]);
    const fetchGeneric = vi.fn().mockResolvedValue([]);

    await seedBulkDataIfNeeded(db, fetchBulk, fetchGeneric);
    await upsertFood(db, {
      id: 'stale-used',
      name: 'Eski Ürün',
      nutrientsPer100g: nutrients,
      source: 'bulk',
      usageCount: 2,
      lastUsedAt: 1,
    });
    await db.settings.put({ key: BULK_DATA_VERSION_KEY, value: 0 });

    await seedBulkDataIfNeeded(db, fetchBulk, fetchGeneric);

    // Past diary entries keep their own snapshotNutrients, so removing the
    // stale foods-table row doesn't corrupt history — safe to clean up.
    expect(await db.foods.get('stale-used')).toBeUndefined();
  });
});
