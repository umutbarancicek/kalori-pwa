import { afterEach, describe, expect, test, vi } from 'vitest';
import { fetchBulkFoodData, fetchGenericFoodData } from './bulkDataSource';

describe('bulkDataSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('dosya mevcutsa listeyi döner', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: '1', name: 'Peynir' }] }),
    );
    const result = await fetchBulkFoodData();
    expect(result).toEqual([{ id: '1', name: 'Peynir' }]);
  });

  test('dosya bulunamazsa (404) boş liste döner, hata fırlatmaz', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchGenericFoodData()).resolves.toEqual([]);
  });

  test('ağ hatasında boş liste döner, hata fırlatmaz', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(fetchBulkFoodData()).resolves.toEqual([]);
  });
});
