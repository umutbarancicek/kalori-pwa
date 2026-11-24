import { describe, expect, test } from 'vitest';
import { convertToGrams, getAvailableUnits, UNIT_LABELS } from './unitConversion';
import type { Food } from '../db/schema';

function makeFood(overrides: Partial<Food>): Food {
  return {
    id: '1',
    name: 'Test',
    nutrientsPer100g: {
      kcal: 0,
      protein: 0,
      carb: 0,
      sugar: 0,
      fat: 0,
      satFat: 0,
      fiber: 0,
      salt: 0,
    },
    source: 'bulk',
    usageCount: 0,
    ...overrides,
  };
}

describe('convertToGrams', () => {
  test('g birimi aynen döner', () => {
    expect(convertToGrams(50, 'g')).toBe(50);
  });

  test('ml birimi 1:1 yoğunlukla grama çevrilir (sıvılar için)', () => {
    expect(convertToGrams(200, 'ml')).toBe(200);
  });

  test('su bardağı yaklaşık 200 ml/g sayılır', () => {
    expect(convertToGrams(1, 'bardak')).toBe(200);
    expect(convertToGrams(2, 'bardak')).toBe(400);
  });

  test('kupa yaklaşık 250 ml/g sayılır', () => {
    expect(convertToGrams(1, 'kupa')).toBe(250);
  });

  test('yemek kaşığı yaklaşık 15 ml/g sayılır', () => {
    expect(convertToGrams(2, 'yemek_kasigi')).toBe(30);
  });

  test('tatlı kaşığı yaklaşık 10 ml/g sayılır', () => {
    expect(convertToGrams(1, 'tatli_kasigi')).toBe(10);
  });

  test('çay kaşığı yaklaşık 5 ml/g sayılır', () => {
    expect(convertToGrams(3, 'cay_kasigi')).toBe(15);
  });

  test('her birim için bir etiket tanımlı', () => {
    expect(UNIT_LABELS.g).toBe('g');
    expect(UNIT_LABELS.ml).toBe('ml');
    expect(UNIT_LABELS.bardak).toBeTruthy();
  });

  test('adet birimi pieceGrams ile grama çevrilir', () => {
    expect(convertToGrams(2, 'adet', 150)).toBe(300);
  });
});

describe('getAvailableUnits', () => {
  test('katı besin (varsayılan) sadece g döner', () => {
    const food = makeFood({});
    expect(getAvailableUnits(food)).toEqual(['g']);
  });

  test('pieceGrams tanımlı katı besin g + adet döner', () => {
    const food = makeFood({ pieceGrams: 150 });
    expect(getAvailableUnits(food)).toEqual(['g', 'adet']);
  });

  test('sıvı besin ml ve hacim birimlerini döner, g/adet döndürmez', () => {
    const food = makeFood({ isLiquid: true });
    const units = getAvailableUnits(food);
    expect(units).toEqual(['ml', 'bardak', 'kupa', 'yemek_kasigi', 'tatli_kasigi', 'cay_kasigi']);
    expect(units).not.toContain('g');
    expect(units).not.toContain('adet');
  });
});
