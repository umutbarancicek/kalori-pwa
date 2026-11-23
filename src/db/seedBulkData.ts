import type { AppDatabase } from './database';
import { upsertFood } from './foodRepository';
import type { Food } from './schema';

export const BULK_DATA_VERSION = 1;
const BULK_DATA_VERSION_KEY = 'bulkDataVersion';

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
    await upsertFood(db, { ...food, source: 'bulk' });
  }

  await db.settings.put({ key: BULK_DATA_VERSION_KEY, value: BULK_DATA_VERSION });
}
