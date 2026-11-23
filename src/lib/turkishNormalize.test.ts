import { describe, expect, test } from 'vitest';
import { normalizeTurkish } from './turkishNormalize';

describe('normalizeTurkish', () => {
  test('çorba -> corba eşleşir', () => {
    expect(normalizeTurkish('ÇORBA')).toBe('corba');
  });

  test('İstanbul -> istanbul', () => {
    expect(normalizeTurkish('İstanbul')).toBe('istanbul');
  });

  test('peynir50 gibi karışık girişte harfleri korur', () => {
    expect(normalizeTurkish('Yoğurt')).toBe('yogurt');
  });
});
