import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AppDatabase } from '../db/database';
import { upsertFood } from '../db/foodRepository';
import { lookupBarcode } from './barcodeLookup';
import type { Food, Nutrients } from '../db/schema';

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

function food(id: string, name: string, barcode: string): Food {
  return { id, name, barcode, nutrientsPer100g: nutrients, source: 'bulk', usageCount: 0 };
}

describe('lookupBarcode', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = new AppDatabase();
  });

  afterEach(async () => {
    await db.delete();
  });

  test('yerelde bulunan barkod OFF API çağırmaz', async () => {
    await upsertFood(db, food('1', 'Süt', '869001'));
    const fetchFromOff = vi.fn();
    const result = await lookupBarcode(db, '869001', fetchFromOff);
    expect(result?.food.name).toBe('Süt');
    expect(result?.isNew).toBe(false);
    expect(fetchFromOff).not.toHaveBeenCalled();
  });

  test('yerelde yok, OFF APIden bulunursa bulk olarak kaydedilir', async () => {
    const fetchFromOff = vi.fn().mockResolvedValue(food('off-2', 'Ayran', '869002'));
    const result = await lookupBarcode(db, '869002', fetchFromOff);
    expect(result?.food.name).toBe('Ayran');
    expect(result?.isNew).toBe(true);
    const stored = await db.foods.get('off-2');
    expect(stored?.source).toBe('bulk');
  });

  test('hiçbir yerde bulunamazsa null döner', async () => {
    const fetchFromOff = vi.fn().mockResolvedValue(null);
    const result = await lookupBarcode(db, '869003', fetchFromOff);
    expect(result).toBeNull();
  });
});
