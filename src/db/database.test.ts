import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, test } from 'vitest';
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
  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('kalori-pwa');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });

  test('food eklenip barkoddan okunabilir', async () => {
    const db = new AppDatabase();
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
    db.close();
  });

  test('mevcut veri, şema sürümü yükseltilse bile kayıp olmadan okunabilir kalır', async () => {
    // Regression guard: this app's data lives only in the user's browser, so a
    // schema change that can't read existing records is permanent data loss for
    // them. Any future version() bump must stay additive — this test seeds data
    // under today's schema and re-opens it, standing in for "yesterday's data
    // under tomorrow's code" until a real second version() exists to test against.
    const db = new AppDatabase();
    await db.foods.add({
      id: 'food-1',
      name: 'Yumurta',
      nutrientsPer100g: sampleNutrients,
      source: 'user',
      usageCount: 3,
      lastQuantityGrams: 55,
      lastUsedAt: 12345,
    });
    await db.diaryEntries.add({
      id: 'entry-1',
      date: '2026-11-23',
      foodId: 'food-1',
      quantityGrams: 55,
      snapshotNutrients: sampleNutrients,
      createdAt: 1,
      mealType: 'breakfast',
    });
    await db.mealTemplates.add({ id: 'tmpl-1', name: 'Kahvaltı', items: [] });
    await db.settings.add({ key: 'visionApiKey', value: 'secret' });
    db.close();

    const reopened = new AppDatabase();
    const food = await reopened.foods.get('food-1');
    const entry = await reopened.diaryEntries.get('entry-1');
    const template = await reopened.mealTemplates.get('tmpl-1');
    const setting = await reopened.settings.get('visionApiKey');

    expect(food).toMatchObject({ name: 'Yumurta', usageCount: 3, lastQuantityGrams: 55 });
    expect(entry).toMatchObject({ foodId: 'food-1', mealType: 'breakfast' });
    expect(template).toMatchObject({ name: 'Kahvaltı' });
    expect(setting).toMatchObject({ value: 'secret' });
    reopened.close();
  });

  test('v1 şemasındaki veri, su/kilo tabloları eklenen v2 kodunda kayıpsız okunur', async () => {
    // Simulates "yesterday's data under tomorrow's code" for the water/weight
    // tables added in version 2: open a plain version-1 database (no knowledge
    // of the new tables at all), seed a food under it, close it, then reopen
    // with today's AppDatabase (version 2) and confirm the old row survives
    // and the new tables are present and usable.
    const v1 = new Dexie('kalori-pwa');
    v1.version(1).stores({
      foods: 'id, barcode, name',
      diaryEntries: 'id, date',
      mealTemplates: 'id, name',
      settings: 'key',
    });
    await v1.open();
    await v1.table('foods').add({
      id: 'food-v1',
      name: 'Zeytin',
      nutrientsPer100g: sampleNutrients,
      source: 'user',
      usageCount: 0,
    });
    v1.close();

    const reopened = new AppDatabase();
    const food = await reopened.foods.get('food-v1');
    expect(food).toMatchObject({ name: 'Zeytin' });

    const waterLog = await reopened.waterLogs.add({
      id: 'water-1',
      date: '2026-11-24',
      amountMl: 250,
      createdAt: Date.now(),
    });
    expect(waterLog).toBe('water-1');

    const weightLog = await reopened.weightLogs.add({
      id: 'weight-1',
      date: '2026-11-24',
      weightKg: 70,
      createdAt: Date.now(),
    });
    expect(weightLog).toBe('weight-1');

    reopened.close();
  });
});
