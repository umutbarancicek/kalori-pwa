import { describe, expect, test } from 'vitest';
import { getLocalDateString } from './localDate';

describe('getLocalDateString', () => {
  test('yerel saat 01:30 iken UTC bir önceki günü göstermemeli', () => {
    // UTC+3 örneği: yerelde 2026-11-23 01:30, UTC'de hâlâ 2026-11-22 22:30
    const localMidnightPlus = new Date(2026, 10, 23, 1, 30, 0);
    expect(getLocalDateString(localMidnightPlus)).toBe('2026-11-23');
  });

  test('tek haneli ay/gün sıfırla doldurulur', () => {
    const date = new Date(2026, 0, 5, 12, 0, 0);
    expect(getLocalDateString(date)).toBe('2026-01-05');
  });
});
