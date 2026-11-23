import Fuse from 'fuse.js';
import { normalizeTurkish } from '../lib/turkishNormalize';
import type { AppDatabase } from './database';
import type { Food } from './schema';

export async function upsertFood(db: AppDatabase, food: Food): Promise<void> {
  await db.foods.put({ ...food, nameNormalized: normalizeTurkish(food.name) });
}

export async function findByBarcode(db: AppDatabase, barcode: string): Promise<Food | undefined> {
  return db.foods.where('barcode').equals(barcode).first();
}

export async function searchFoods(db: AppDatabase, query: string, limit = 20): Promise<Food[]> {
  const normalizedQuery = normalizeTurkish(query);
  const all = await db.foods.toArray();
  const fuse = new Fuse(all, { keys: ['nameNormalized'], threshold: 0.4 });
  return fuse
    .search(normalizedQuery)
    .slice(0, limit)
    .map((result) => result.item);
}

export async function recordUsage(
  db: AppDatabase,
  foodId: string,
  quantityGrams: number,
): Promise<void> {
  const food = await db.foods.get(foodId);
  if (!food) return;
  await db.foods.update(foodId, {
    usageCount: food.usageCount + 1,
    lastUsedAt: Date.now(),
    lastQuantityGrams: quantityGrams,
  });
}

export async function getFavoritesAndRecents(db: AppDatabase, limit = 10): Promise<Food[]> {
  const all = await db.foods.toArray();
  return all
    .sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
      return (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0);
    })
    .slice(0, limit);
}
