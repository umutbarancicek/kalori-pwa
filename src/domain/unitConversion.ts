import type { Food } from '../db/schema';

export type QuantityUnit = 'g' | 'ml' | 'bardak' | 'kupa' | 'yemek_kasigi' | 'tatli_kasigi' | 'cay_kasigi' | 'adet';

export const UNIT_LABELS: Record<QuantityUnit, string> = {
  g: 'g',
  ml: 'ml',
  bardak: 'su bardağı (~200 ml)',
  kupa: 'kupa (~250 ml)',
  yemek_kasigi: 'yemek kaşığı (~15 ml)',
  tatli_kasigi: 'tatlı kaşığı (~10 ml)',
  cay_kasigi: 'çay kaşığı (~5 ml)',
  adet: 'adet',
};

const LIQUID_UNITS: QuantityUnit[] = ['ml', 'bardak', 'kupa', 'yemek_kasigi', 'tatli_kasigi', 'cay_kasigi'];

// Grams per 1 unit, assuming water-like density (1 ml ≈ 1 g) for liquids —
// a reasonable default since exact food-specific density isn't tracked.
const UNIT_TO_GRAMS: Record<Exclude<QuantityUnit, 'adet'>, number> = {
  g: 1,
  ml: 1,
  bardak: 200,
  kupa: 250,
  yemek_kasigi: 15,
  tatli_kasigi: 10,
  cay_kasigi: 5,
};

export function convertToGrams(quantity: number, unit: QuantityUnit, pieceGrams?: number): number {
  if (unit === 'adet') {
    return quantity * (pieceGrams ?? 100);
  }
  return quantity * UNIT_TO_GRAMS[unit];
}

/** Besinin türüne göre anlamlı birimleri döner: sıvıya g/adet, katıya ml/kaşık önerilmez. */
export function getAvailableUnits(food: Pick<Food, 'isLiquid' | 'pieceGrams'>): QuantityUnit[] {
  if (food.isLiquid) {
    return LIQUID_UNITS;
  }
  return food.pieceGrams ? ['g', 'adet'] : ['g'];
}
