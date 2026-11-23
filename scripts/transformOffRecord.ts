import type { Food } from '../src/db/schema';

export interface OffRawProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  countries_tags?: string[];
  nutriments?: Record<string, number | undefined>;
}

const TURKEY_COUNTRY_TAGS = new Set(['en:turkey', 'en:turkiye', 'tr']);

function num(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function transformOffRecord(raw: OffRawProduct): Food | null {
  const isTurkey = (raw.countries_tags ?? []).some((tag) => TURKEY_COUNTRY_TAGS.has(tag));
  if (!isTurkey) return null;
  if (!raw.product_name || !raw.code) return null;

  const n = raw.nutriments ?? {};
  return {
    id: raw.code,
    name: raw.product_name,
    brand: raw.brands,
    barcode: raw.code,
    nutrientsPer100g: {
      kcal: num(n['energy-kcal_100g']),
      protein: num(n.proteins_100g),
      carb: num(n.carbohydrates_100g),
      sugar: num(n.sugars_100g),
      fat: num(n.fat_100g),
      satFat: num(n['saturated-fat_100g']),
      fiber: num(n.fiber_100g),
      salt: num(n.salt_100g),
    },
    source: 'bulk',
    usageCount: 0,
  };
}
