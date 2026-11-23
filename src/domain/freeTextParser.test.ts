import { describe, expect, test } from 'vitest';
import { parseFreeText } from './freeTextParser';

describe('parseFreeText', () => {
  test('miktarlı girişi ayrıştırır', () => {
    expect(parseFreeText('peynir 50')).toEqual({ name: 'peynir', quantityGrams: 50 });
  });

  test('miktarsız girişte quantityGrams undefined döner', () => {
    expect(parseFreeText('peynir')).toEqual({ name: 'peynir', quantityGrams: undefined });
  });

  test('g birimiyle yazılan miktarı ayrıştırır', () => {
    expect(parseFreeText('yoğurt 150g')).toEqual({ name: 'yoğurt', quantityGrams: 150 });
  });
});
