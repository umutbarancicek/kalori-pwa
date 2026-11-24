import type { AppDatabase } from './database';
import { upsertFood } from './foodRepository';
import type { Food } from './schema';

// Bump this whenever public/data/foods-*.json changes meaningfully, so devices
// that already ran the seed (even with empty/stale data files) re-seed.
export const BULK_DATA_VERSION = 5;
export const BULK_DATA_VERSION_KEY = 'bulkDataVersion';

export async function seedBulkDataIfNeeded(
  db: AppDatabase,
  fetchBulkData: () => Promise<Food[]>,
  fetchGenericData: () => Promise<Food[]>,
): Promise<void> {
  const stored = await db.settings.get(BULK_DATA_VERSION_KEY);
  if (stored && (stored.value as number) >= BULK_DATA_VERSION) {
    return;
  }

  const [bulkFoods, genericFoods] = await Promise.all([fetchBulkData(), fetchGenericData()]);
  const incomingIds = new Set<string>();

  for (const food of [...bulkFoods, ...genericFoods]) {
    incomingIds.add(food.id);
    const existing = await db.foods.get(food.id);
    if (existing && existing.source !== 'bulk') {
      // User promoted/edited this record; never downgrade it or reset its usage stats.
      continue;
    }
    await upsertFood(db, {
      ...food,
      source: 'bulk',
      usageCount: existing?.usageCount ?? 0,
      lastUsedAt: existing?.lastUsedAt,
      lastQuantityGrams: existing?.lastQuantityGrams,
    });
  }

  // Drop bulk records dropped from the dataset (e.g. filtered out for bad data)
  // on a real re-seed — not on first run, where incomingIds already covers
  // everything written. Past diary entries keep their own snapshotNutrients,
  // so removing the stale foods-table row doesn't corrupt history.
  if (stored) {
    const staleBulkFoods = await db.foods
      .filter((food) => food.source === 'bulk' && !incomingIds.has(food.id))
      .toArray();
    await db.foods.bulkDelete(staleBulkFoods.map((food) => food.id));
  }

  await db.settings.put({ key: BULK_DATA_VERSION_KEY, value: BULK_DATA_VERSION });
}
