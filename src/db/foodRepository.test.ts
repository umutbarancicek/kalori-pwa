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

  test('getFavoritesAndRecents hiç kullanılmamış (usageCount 0) besinleri listelemez', async () => {
    await upsertFood(db, makeFood({ id: '1', name: 'Hiç Kullanılmamış', usageCount: 0 }));
    await upsertFood(db, makeFood({ id: '2', name: 'Kullanılmış', usageCount: 1, lastUsedAt: 1 }));
    const favorites = await getFavoritesAndRecents(db);
    expect(favorites.map((f) => f.name)).toEqual(['Kullanılmış']);
  });

  test('tek karakterli arama onlarca alakasız sonuç döndürmez', async () => {
    await upsertFood(db, makeFood({ id: '1', name: 'Sprite' }));
    await upsertFood(db, makeFood({ id: '2', name: 'Cappy' }));
    await upsertFood(db, makeFood({ id: '3', name: 'Salam' }));
    const results = await searchFoods(db, 's');
    expect(results).toHaveLength(0);
  });

  test('iki karakterli arama anlamlı sonuçları yine de bulur', async () => {
    await upsertFood(db, makeFood({ id: '1', name: 'Süt' }));
    const results = await searchFoods(db, 'sü');
    expect(results.some((f) => f.name === 'Süt')).toBe(true);
  });

  test('yeni eklenen besin, arama indeksi önbelleklense bile hemen aranabilir olur', async () => {
    await upsertFood(db, makeFood({ id: 'cache-1', name: 'Mercimek Çorbası' }));
    await searchFoods(db, 'mercimek'); // builds/caches the search index

    await upsertFood(db, makeFood({ id: 'cache-2', name: 'Tarhana Çorbası' }));
    const results = await searchFoods(db, 'tarhana');

    expect(results.some((f) => f.id === 'cache-2')).toBe(true);
  });
});
