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

function normalizeForComparison(s: string): string {
  return s.toLowerCase().replace(/[^a-zçğıöşü]/gi, '');
}

/**
 * Rejects records that are too unreliable to show in search: implausible
 * calorie values, a name that's just the brand repeated (no real product
 * description), or a stated kcal wildly inconsistent with its own macros.
 * These patterns come from unreviewed OFF community submissions.
 */
function isPlausibleFood(name: string, brand: string | undefined, n: Food['nutrientsPer100g']): boolean {
  if (n.kcal > 900 || n.kcal < 0) return false;

  if (brand && normalizeForComparison(name) === normalizeForComparison(brand)) return false;

  const calcKcal = n.protein * 4 + n.carb * 4 + n.fat * 9;
  if (n.kcal > 20 && Math.abs(calcKcal - n.kcal) / n.kcal > 0.5) return false;

  return true;
}

export function transformOffRecord(raw: OffRawProduct): Food | null {
  const isTurkey = (raw.countries_tags ?? []).some((tag) => TURKEY_COUNTRY_TAGS.has(tag));
  if (!isTurkey) return null;
  if (!raw.product_name || !raw.code) return null;

  const n = raw.nutriments ?? {};
  // Calorie-tracking is useless without an energy value — reject records where
  // OFF never got real nutrition data filled in, rather than silently storing
  // all-zero nutrients that would read as "0 kcal" to the user.
  if (typeof n['energy-kcal_100g'] !== 'number') return null;

  const nutrientsPer100g = {
    kcal: num(n['energy-kcal_100g']),
    protein: num(n.proteins_100g),
    carb: num(n.carbohydrates_100g),
    sugar: num(n.sugars_100g),
    fat: num(n.fat_100g),
    satFat: num(n['saturated-fat_100g']),
    fiber: num(n.fiber_100g),
    salt: num(n.salt_100g),
  };

  if (!isPlausibleFood(raw.product_name, raw.brands, nutrientsPer100g)) return null;

  return {
    id: raw.code,
    name: raw.product_name,
    brand: raw.brands,
    barcode: raw.code,
    nutrientsPer100g,
    source: 'bulk',
    usageCount: 0,
  };
}
