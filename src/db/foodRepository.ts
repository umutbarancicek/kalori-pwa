import Fuse from 'fuse.js';
import { normalizeTurkish } from '../lib/turkishNormalize';
import type { AppDatabase } from './database';
import type { Food } from './schema';

interface SearchIndexCacheEntry {
  count: number;
  fuse: Fuse<Food>;
}

// Rebuilding a Fuse index from a full table scan on every keystroke is the slowest
// path in the app once the bulk dataset is loaded (tens of thousands of rows). Cache
// the index per database and only rebuild when the row count changes — cheap via
// Dexie's indexed count() — rather than on every search call.
const searchIndexCache = new WeakMap<AppDatabase, SearchIndexCacheEntry>();

export async function upsertFood(db: AppDatabase, food: Food): Promise<void> {
  await db.foods.put({ ...food, nameNormalized: normalizeTurkish(food.name) });
}

export async function findByBarcode(db: AppDatabase, barcode: string): Promise<Food | undefined> {
  return db.foods.where('barcode').equals(barcode).first();
}

async function getSearchIndex(db: AppDatabase): Promise<Fuse<Food>> {
  const count = await db.foods.count();
  const cached = searchIndexCache.get(db);
  if (cached && cached.count === count) {
    return cached.fuse;
  }
  const all = await db.foods.toArray();
  const fuse = new Fuse(all, { keys: ['nameNormalized'], threshold: 0.4 });
  searchIndexCache.set(db, { count, fuse });
  return fuse;
}

export async function searchFoods(db: AppDatabase, query: string, limit = 20): Promise<Food[]> {
  const normalizedQuery = normalizeTurkish(query);
  const fuse = await getSearchIndex(db);
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
    .filter((food) => food.usageCount > 0)
    .sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
      return (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0);
    })
    .slice(0, limit);
}
