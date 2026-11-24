import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
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

  afterEach(async () => {
    await db.delete();
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

  test('tam eşleşme, sadece içeren sonuçlardan önce gelir', async () => {
    await upsertFood(db, makeFood({ id: 'exact', name: 'Peynir' }));
    await upsertFood(db, makeFood({ id: 'contains-1', name: 'Küp Peynirli Poğaça' }));
    await upsertFood(db, makeFood({ id: 'contains-2', name: 'Peynirli Börek' }));

    const results = await searchFoods(db, 'peynir');

    expect(results[0].id).toBe('exact');
  });

  test('kelime başı eşleşmesi, sadece içeren sonuçlardan önce gelir', async () => {
    await upsertFood(db, makeFood({ id: 'prefix', name: 'Peynirli Tost' }));
    await upsertFood(db, makeFood({ id: 'contains', name: 'Tost Peynirli' }));

    const results = await searchFoods(db, 'peynir');

    expect(results[0].id).toBe('prefix');
    expect(results[1].id).toBe('contains');
  });

  test('aynı katmanda (ör. tam eşleşme) sık kullanılan kayıt önce gelir', async () => {
    await upsertFood(db, makeFood({ id: 'rare', name: 'Peynir', usageCount: 0 }));
    await upsertFood(db, makeFood({ id: 'frequent', name: 'Peynir', usageCount: 10, lastUsedAt: 5 }));

    // Different ids with the identical name would collide under dedup — give
    // them distinct barcodes so this test isolates ranking from dedup.
    await db.foods.update('rare', { barcode: '111' });
    await db.foods.update('frequent', { barcode: '222' });

    const results = await searchFoods(db, 'peynir');

    expect(results[0].id).toBe('frequent');
  });

  test('tüm besin değerleri sıfır olan toplu veri kaydı arama sonuçlarında gizlenir', async () => {
    await upsertFood(
      db,
      makeFood({ id: 'empty-data', name: 'Peynir', source: 'bulk', nutrientsPer100g: ZERO_NUTRIENTS }),
    );
    await upsertFood(db, makeFood({ id: 'has-data', name: 'Peynir Light', nutrientsPer100g: sampleNutrients }));

    const results = await searchFoods(db, 'peynir');

    expect(results.some((f) => f.id === 'empty-data')).toBe(false);
    expect(results.some((f) => f.id === 'has-data')).toBe(true);
  });

  test('kullanıcının kendi eklediği sıfır değerli kayıt (ör. su) gizlenmez', async () => {
    await upsertFood(
      db,
      makeFood({ id: 'user-zero', name: 'Su', source: 'user', nutrientsPer100g: ZERO_NUTRIENTS }),
    );

    const results = await searchFoods(db, 'su');

    expect(results.some((f) => f.id === 'user-zero')).toBe(true);
  });

  test('aynı normalize isme sahip tekrarlar tek sonuca indirgenir, en eksiksiz kayıt kalır', async () => {
    await upsertFood(
      db,
      makeFood({
        id: 'incomplete',
        name: 'Lor Peyniri',
        nutrientsPer100g: { ...sampleNutrients, fiber: 0, salt: 0 },
      }),
    );
    await db.foods.update('incomplete', { barcode: '1' });
    await upsertFood(
      db,
      makeFood({
        id: 'complete',
        name: 'lor peyniri', // different casing — same normalized name
        nutrientsPer100g: { ...sampleNutrients, fiber: 2, salt: 1.1 },
      }),
    );
    await db.foods.update('complete', { barcode: '2' });

    const results = await searchFoods(db, 'lor peyniri');

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('complete');
  });

  test('aynı katmanda markasız/kısa isimli genel ürün, markalı/aromalı üründen önce gelir', async () => {
    await upsertFood(
      db,
      makeFood({ id: 'branded', name: 'Peynir ve baharat aromalı', brand: 'Cheetos' }),
    );
    await db.foods.update('branded', { barcode: '1' });
    await upsertFood(db, makeFood({ id: 'generic', name: 'Beyaz Peynir' }));
    await db.foods.update('generic', { barcode: '2' });

    const results = await searchFoods(db, 'peynir');

    expect(results[0].id).toBe('generic');
  });

  test('tam eşleşmeyen çok sayıda markalı sonuç arasında genel ürün 20 sonuç limitinin dışında kalmaz', async () => {
    for (let i = 0; i < 25; i++) {
      await upsertFood(db, makeFood({ id: `branded-${i}`, name: `Peynirli Atıştırmalık ${i}`, brand: `Marka${i}` }));
      await db.foods.update(`branded-${i}`, { barcode: `b${i}` });
    }
    await upsertFood(db, makeFood({ id: 'generic', name: 'Beyaz Peynir' }));
    await db.foods.update('generic', { barcode: 'g1' });

    const results = await searchFoods(db, 'peynir');

    expect(results.some((f) => f.id === 'generic')).toBe(true);
  });

  test('yeterli tam/kelime başı/içerir eşleşmesi yoksa bulanık (fuse) arama son çare olarak devreye girer', async () => {
    await upsertFood(db, makeFood({ id: '1', name: 'Çorba' }));
    const results = await searchFoods(db, 'corbaa'); // one extra letter — no exact/prefix/contains match
    expect(results.some((f) => f.name === 'Çorba')).toBe(true);
  });
});
