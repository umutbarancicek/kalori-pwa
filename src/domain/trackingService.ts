import type { AppDatabase } from '../db/database';
import type { WaterLog, WeightLog } from '../db/schema';

export async function addWaterLog(
  db: AppDatabase,
  amountMl: number,
  date: string,
): Promise<WaterLog> {
  const log: WaterLog = { id: crypto.randomUUID(), date, amountMl, createdAt: Date.now() };
  await db.waterLogs.add(log);
  return log;
}

export async function getWaterTotal(db: AppDatabase, date: string): Promise<number> {
  const logs = await db.waterLogs.where('date').equals(date).toArray();
  return logs.reduce((sum, log) => sum + log.amountMl, 0);
}

/** Removes the most recently added water log for a date, for a lightweight "undo last tap". */
export async function removeLastWaterLog(db: AppDatabase, date: string): Promise<void> {
  const logs = await db.waterLogs.where('date').equals(date).toArray();
  if (logs.length === 0) return;
  const latest = logs.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
  await db.waterLogs.delete(latest.id);
}

/** One weight entry per day: logging again for the same date overwrites that day's value. */
export async function setWeightLog(
  db: AppDatabase,
  weightKg: number,
  date: string,
): Promise<WeightLog> {
  const existing = await db.weightLogs.where('date').equals(date).first();
  const log: WeightLog = {
    id: existing?.id ?? crypto.randomUUID(),
    date,
    weightKg,
    createdAt: existing?.createdAt ?? Date.now(),
  };
  await db.weightLogs.put(log);
  return log;
}

export async function getLatestWeightLog(db: AppDatabase): Promise<WeightLog | undefined> {
  const all = await db.weightLogs.toArray();
  return all.sort((a, b) => b.date.localeCompare(a.date))[0];
}

export async function getWeightHistory(db: AppDatabase): Promise<WeightLog[]> {
  const all = await db.weightLogs.toArray();
  return all.sort((a, b) => a.date.localeCompare(b.date));
}
