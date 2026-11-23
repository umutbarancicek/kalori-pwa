import { describe, expect, test } from 'vitest';
import { transformOffRecord, type OffRawProduct } from './transformOffRecord';

const sampleTrProduct: OffRawProduct = {
  code: '8690000000001',
  product_name: 'Beyaz Peynir',
  brands: 'Pınar',
  countries_tags: ['en:turkey'],
  nutriments: {
    'energy-kcal_100g': 280,
    proteins_100g: 18,
    carbohydrates_100g: 2,
    sugars_100g: 1,
    fat_100g: 22,
    'saturated-fat_100g': 15,
    fiber_100g: 0,
    salt_100g: 1.8,
  },
};

const sampleNonTrProduct: OffRawProduct = {
  code: '0000000000002',
  product_name: 'Some Product',
  countries_tags: ['en:germany'],
  nutriments: {},
};

describe('transformOffRecord', () => {
  test('Türkiye ürünü geçerli Food kaydına dönüşür', () => {
    const result = transformOffRecord(sampleTrProduct);
    expect(result).toMatchObject({ name: 'Beyaz Peynir', source: 'bulk' });
  });

  test('Türkiye dışı ürün null döner', () => {
    expect(transformOffRecord(sampleNonTrProduct)).toBeNull();
  });

  test('isim veya besin değeri eksikse null döner', () => {
    const incomplete: OffRawProduct = {
      code: '0000000000003',
      product_name: '',
      countries_tags: ['en:turkey'],
      nutriments: {},
    };
    expect(transformOffRecord(incomplete)).toBeNull();
  });

  test('ismi ve barkodu olup kalori verisi hiç girilmemiş kayıt null döner', () => {
    const noCalorieData: OffRawProduct = {
      code: '8680679340281',
      product_name: 'Peynir',
      countries_tags: ['en:turkey'],
      nutriments: {},
    };
    expect(transformOffRecord(noCalorieData)).toBeNull();
  });
});
