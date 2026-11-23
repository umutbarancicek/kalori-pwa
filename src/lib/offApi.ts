import type { Food } from '../db/schema';

interface OffApiResponse {
  status: number;
  product?: {
    code?: string;
    product_name?: string;
    brands?: string;
    nutriments?: Record<string, number | undefined>;
  };
}

export async function fetchProductFromOff(barcode: string): Promise<Food | null> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
  if (!response.ok) return null;
  const data: OffApiResponse = await response.json();
  if (data.status !== 1 || !data.product?.product_name) return null;

  const n = data.product.nutriments ?? {};
  return {
    id: barcode,
    name: data.product.product_name,
    brand: data.product.brands,
    barcode,
    nutrientsPer100g: {
      kcal: n['energy-kcal_100g'] ?? 0,
      protein: n.proteins_100g ?? 0,
      carb: n.carbohydrates_100g ?? 0,
      sugar: n.sugars_100g ?? 0,
      fat: n.fat_100g ?? 0,
      satFat: n['saturated-fat_100g'] ?? 0,
      fiber: n.fiber_100g ?? 0,
      salt: n.salt_100g ?? 0,
    },
    source: 'bulk',
    usageCount: 0,
  };
}
