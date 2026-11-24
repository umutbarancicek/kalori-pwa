import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { AppDatabase } from '../db/database';
import { upsertFood } from '../db/foodRepository';
import type { Food, Nutrients } from '../db/schema';
import {
  addDiaryEntry,
  addQuickKcalEntry,
  copyMealFromDate,
  deleteDiaryEntry,
  getDailyTotal,
  getEntriesGroupedByMeal,
  getHistory,
  getMealTypeForTime,
  resolveQuantityGrams,
  updateDiaryEntryQuantity,
} from './diaryService';

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

  test('addDiaryEntry öğün tipi verilmezse "other" olarak kaydedilir', async () => {
    await upsertFood(db, makeFood({ id: '1' }));
    const entry = await addDiaryEntry(db, '1', 50, '2026-11-23');
    expect(entry.mealType).toBe('other');
  });

  test('addDiaryEntry verilen öğün tipini kaydeder', async () => {
    await upsertFood(db, makeFood({ id: '1' }));
    const entry = await addDiaryEntry(db, '1', 50, '2026-11-23', 'breakfast');
    expect(entry.mealType).toBe('breakfast');
  });

  test('getEntriesGroupedByMeal kayıtları öğün tipine göre gruplar', async () => {
    await upsertFood(db, makeFood({ id: '1' }));
    await addDiaryEntry(db, '1', 100, '2026-11-23', 'breakfast');
    await addDiaryEntry(db, '1', 50, '2026-11-23', 'breakfast');
    await addDiaryEntry(db, '1', 200, '2026-11-23', 'lunch');

    const grouped = await getEntriesGroupedByMeal(db, '2026-11-23');

    expect(grouped.breakfast).toHaveLength(2);
    expect(grouped.lunch).toHaveLength(1);
    expect(grouped.dinner).toHaveLength(0);
    expect(grouped.snack).toHaveLength(0);
  });

  test('getEntriesGroupedByMeal öğün tipi olmayan eski kayıtları "other" grubuna koyar', async () => {
    await upsertFood(db, makeFood({ id: '1' }));
    await db.diaryEntries.add({
      id: 'legacy-1',
      date: '2026-11-23',
      foodId: '1',
      quantityGrams: 100,
      snapshotNutrients: nutrientsPer100g,
      createdAt: 1,
      // no mealType — simulates a pre-existing entry from before meal grouping
    });

    const grouped = await getEntriesGroupedByMeal(db, '2026-11-23');

    expect(grouped.other).toHaveLength(1);
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

  test('deleteDiaryEntry kaydı siler', async () => {
    await upsertFood(db, makeFood({ id: '1' }));
    const entry = await addDiaryEntry(db, '1', 100, '2026-11-23');

    await deleteDiaryEntry(db, entry.id);

    expect(await db.diaryEntries.get(entry.id)).toBeUndefined();
  });

  test('deleteDiaryEntry silinen kaydı geri eklemek için döner (geri al)', async () => {
    await upsertFood(db, makeFood({ id: '1' }));
    const entry = await addDiaryEntry(db, '1', 100, '2026-11-23');

    const deleted = await deleteDiaryEntry(db, entry.id);

    expect(deleted).toMatchObject({ id: entry.id, quantityGrams: 100 });
  });

  test('updateDiaryEntryQuantity miktarı ve besin değerlerini günceller', async () => {
    await upsertFood(db, makeFood({ id: '1' }));
    const entry = await addDiaryEntry(db, '1', 100, '2026-11-23');

    const updated = await updateDiaryEntryQuantity(db, entry.id, 50);

    expect(updated.quantityGrams).toBe(50);
    expect(updated.snapshotNutrients.kcal).toBe(100);
  });

  test('updateDiaryEntryQuantity besin artık silinmişse mevcut oranla ölçekler', async () => {
    await upsertFood(db, makeFood({ id: 'gone' }));
    const entry = await addDiaryEntry(db, 'gone', 100, '2026-11-23');
    await db.foods.delete('gone');

    const updated = await updateDiaryEntryQuantity(db, entry.id, 50);

    expect(updated.quantityGrams).toBe(50);
    expect(updated.snapshotNutrients.kcal).toBe(100); // scaled 200kcal@100g -> 100kcal@50g
  });

  test('getMealTypeForTime saate göre doğru öğünü döner', () => {
    expect(getMealTypeForTime(7)).toBe('breakfast');
    expect(getMealTypeForTime(10)).toBe('breakfast');
    expect(getMealTypeForTime(11)).toBe('lunch');
    expect(getMealTypeForTime(14)).toBe('lunch');
    expect(getMealTypeForTime(15)).toBe('snack');
    expect(getMealTypeForTime(17)).toBe('snack');
    expect(getMealTypeForTime(18)).toBe('dinner');
    expect(getMealTypeForTime(22)).toBe('dinner');
    expect(getMealTypeForTime(23)).toBe('snack');
    expect(getMealTypeForTime(2)).toBe('snack');
  });

  test('copyMealFromDate kaynak gündeki öğünün kalemlerini hedef güne kopyalar', async () => {
    await upsertFood(db, makeFood({ id: '1' }));
    await upsertFood(db, makeFood({ id: '2' }));
    await addDiaryEntry(db, '1', 100, '2026-11-22', 'breakfast');
    await addDiaryEntry(db, '2', 50, '2026-11-22', 'breakfast');
    await addDiaryEntry(db, '1', 999, '2026-11-22', 'lunch'); // different meal, must not copy

    const copied = await copyMealFromDate(db, '2026-11-22', 'breakfast', '2026-11-23');

    expect(copied).toHaveLength(2);
    const targetEntries = await db.diaryEntries.where('date').equals('2026-11-23').toArray();
    expect(targetEntries).toHaveLength(2);
    expect(targetEntries.every((e) => e.mealType === 'breakfast')).toBe(true);
  });

  test('copyMealFromDate kaynakta hiç kayıt yoksa boş dizi döner, hata fırlatmaz', async () => {
    const copied = await copyMealFromDate(db, '2026-11-22', 'breakfast', '2026-11-23');
    expect(copied).toEqual([]);
  });

  test('addQuickKcalEntry besin seçmeden sadece kcal ile kayıt oluşturur', async () => {
    const entry = await addQuickKcalEntry(db, 250, '2026-11-23', 'snack');
    expect(entry.snapshotNutrients.kcal).toBe(250);
    expect(entry.snapshotNutrients.protein).toBe(0);
    expect(entry.mealType).toBe('snack');
    expect(entry.label).toBeTruthy();
    expect(entry.foodId).toBe('');
  });

  test('addQuickKcalEntry günlük toplama dahil olur', async () => {
    await addQuickKcalEntry(db, 250, '2026-11-23');
    const total = await getDailyTotal(db, '2026-11-23');
    expect(total.kcal).toBe(250);
  });

  test('updateDiaryEntryQuantity hızlı kcal kaydının kcal değerini değiştirebilir', async () => {
    const entry = await addQuickKcalEntry(db, 250, '2026-11-23');
    const updated = await updateDiaryEntryQuantity(db, entry.id, 300);
    expect(updated.snapshotNutrients.kcal).toBe(300);
  });
});
