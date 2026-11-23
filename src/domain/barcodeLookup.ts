import type { AppDatabase } from '../db/database';
import { findByBarcode, upsertFood } from '../db/foodRepository';
import type { Food } from '../db/schema';

export async function lookupBarcode(
  db: AppDatabase,
  barcode: string,
  fetchFromOff: (barcode: string) => Promise<Food | null>,
): Promise<{ food: Food; isNew: boolean } | null> {
  const local = await findByBarcode(db, barcode);
  if (local) {
    return { food: local, isNew: false };
  }

  const fetched = await fetchFromOff(barcode);
  if (!fetched) {
    return null;
  }

  const food: Food = { ...fetched, source: 'bulk' };
  await upsertFood(db, food);
  return { food, isNew: true };
}
