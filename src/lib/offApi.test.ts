import { afterEach, describe, expect, test, vi } from 'vitest';
import { fetchProductFromOff } from './offApi';

describe('fetchProductFromOff', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('ürün bulunursa Food döner', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          product: { product_name: 'Ayran', nutriments: { 'energy-kcal_100g': 40 } },
        }),
      }),
    );
    const result = await fetchProductFromOff('869002');
    expect(result?.name).toBe('Ayran');
  });

  test('ağ isteği reddedilirse (offline) hata fırlatmaz, null döner', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(fetchProductFromOff('869003')).resolves.toBeNull();
  });

  test('yanıt başarısızsa (ör. 404) null döner', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchProductFromOff('869004')).resolves.toBeNull();
  });
});
