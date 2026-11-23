import { describe, expect, test } from 'vitest';
import { convertToGrams, UNIT_LABELS } from './unitConversion';

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
});
