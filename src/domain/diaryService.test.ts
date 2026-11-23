import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { AppDatabase } from '../db/database';
import { upsertFood } from '../db/foodRepository';
import type { Food, Nutrients } from '../db/schema';
import { addDiaryEntry, getDailyTotal, getHistory, resolveQuantityGrams } from './diaryService';

const nutrientsPer100g: Nutrients = {
  kcal: 200,
  protein: 10,
  carb: 20,
  sugar: 5,
  fat: 8,
  satFat: 2,
  fiber: 1,
  salt: 0.5,
};

function makeFood(overrides: Partial<Food>): Food {
  return {
    id: '1',
    name: 'Peynir',
    nutrientsPer100g,
    source: 'bulk',
    usageCount: 0,
    ...overrides,
  };
}

describe('diaryService', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = new AppDatabase();
  });

  afterEach(async () => {
    await db.delete();
  });

  test('addDiaryEntry miktara göre besin değerlerini ölçekler', async () => {
    await upsertFood(db, makeFood({ id: '1' }));
    const entry = await addDiaryEntry(db, '1', 50, '2026-11-23');
    expect(entry.snapshotNutrients.kcal).toBe(100);
    expect(entry.snapshotNutrients.protein).toBe(5);
  });

  test('addDiaryEntry kullanım bilgisini günceller', async () => {
    await upsertFood(db, makeFood({ id: '1' }));
    await addDiaryEntry(db, '1', 50, '2026-11-23');
    const updated = await db.foods.get('1');
    expect(updated?.usageCount).toBe(1);
    expect(updated?.lastQuantityGrams).toBe(50);
  });

  test('getDailyTotal o güne ait tüm kayıtları toplar', async () => {
    await upsertFood(db, makeFood({ id: '1' }));
    await addDiaryEntry(db, '1', 100, '2026-11-23');
    await addDiaryEntry(db, '1', 100, '2026-11-23');
    const total = await getDailyTotal(db, '2026-11-23');
    expect(total.kcal).toBe(400);
  });

  test('getHistory tarihe göre gruplanmış toplamları döner', async () => {
    await upsertFood(db, makeFood({ id: '1' }));
    await addDiaryEntry(db, '1', 100, '2026-11-22');
    await addDiaryEntry(db, '1', 100, '2026-11-23');
    const history = await getHistory(db);
    expect(history).toHaveLength(2);
  });

  test('resolveQuantityGrams miktar yoksa ve lastQuantityGrams de yoksa 100 döner', () => {
    const food = makeFood({ id: '1', lastQuantityGrams: undefined });
    expect(resolveQuantityGrams(undefined, food)).toBe(100);
  });

  test('resolveQuantityGrams miktar yoksa lastQuantityGrams kullanılır', () => {
    const food = makeFood({ id: '1', lastQuantityGrams: 75 });
    expect(resolveQuantityGrams(undefined, food)).toBe(75);
  });

  test('resolveQuantityGrams miktar verilmişse onu kullanır', () => {
    const food = makeFood({ id: '1', lastQuantityGrams: 75 });
    expect(resolveQuantityGrams(30, food)).toBe(30);
  });
});
