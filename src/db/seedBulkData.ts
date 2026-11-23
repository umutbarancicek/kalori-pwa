import type { AppDatabase } from './database';
import { upsertFood } from './foodRepository';
import type { Food } from './schema';

export const BULK_DATA_VERSION = 1;
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
  for (const food of [...bulkFoods, ...genericFoods]) {
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

  await db.settings.put({ key: BULK_DATA_VERSION_KEY, value: BULK_DATA_VERSION });
}
