import type { Food } from '../db/schema';

async function fetchFoodListOrEmpty(url: string): Promise<Food[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    return (await response.json()) as Food[];
  } catch {
    return [];
  }
}

export function fetchBulkFoodData(): Promise<Food[]> {
  return fetchFoodListOrEmpty('./data/foods-bulk.json');
}

export function fetchGenericFoodData(): Promise<Food[]> {
  return fetchFoodListOrEmpty('./data/foods-generic.json');
}
