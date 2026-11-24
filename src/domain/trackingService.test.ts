import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { AppDatabase } from '../db/database';
import {
  addWaterLog,
  getLatestWeightLog,
  getWaterTotal,
  getWeightHistory,
  removeLastWaterLog,
  setWeightLog,
} from './trackingService';

describe('trackingService', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = new AppDatabase();
  });

  afterEach(async () => {
    await db.delete();
  });

  test('addWaterLog ve getWaterTotal o güne ait suyu toplar', async () => {
    await addWaterLog(db, 250, '2026-11-24');
    await addWaterLog(db, 330, '2026-11-24');
    await addWaterLog(db, 500, '2026-11-23');
    const total = await getWaterTotal(db, '2026-11-24');
    expect(total).toBe(580);
  });

  test('removeLastWaterLog en son eklenen su kaydını siler', async () => {
    await addWaterLog(db, 250, '2026-11-24');
    await addWaterLog(db, 330, '2026-11-24');
    await removeLastWaterLog(db, '2026-11-24');
    const total = await getWaterTotal(db, '2026-11-24');
    expect(total).toBe(250);
  });

  test('removeLastWaterLog kayıt yoksa hata fırlatmaz', async () => {
    await expect(removeLastWaterLog(db, '2026-11-24')).resolves.toBeUndefined();
  });

  test('setWeightLog aynı güne tekrar yazınca üzerine yazar, ayrı kayıt oluşturmaz', async () => {
    await setWeightLog(db, 70, '2026-11-24');
    await setWeightLog(db, 69.5, '2026-11-24');
    const history = await getWeightHistory(db);
    expect(history).toHaveLength(1);
    expect(history[0].weightKg).toBe(69.5);
  });

  test('getLatestWeightLog en güncel tarihli kaydı döner', async () => {
    await setWeightLog(db, 70, '2026-11-20');
    await setWeightLog(db, 69, '2026-11-24');
    const latest = await getLatestWeightLog(db);
    expect(latest?.weightKg).toBe(69);
  });

  test('getLatestWeightLog hiç kayıt yoksa undefined döner', async () => {
    const latest = await getLatestWeightLog(db);
    expect(latest).toBeUndefined();
  });
});
