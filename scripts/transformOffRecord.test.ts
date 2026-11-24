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

  test('imkansız kcal (>900/100g) kaydı null döner', () => {
    const extremeKcal: OffRawProduct = {
      code: '8690000000004',
      product_name: 'Doritos taco',
      countries_tags: ['en:turkey'],
      nutriments: { 'energy-kcal_100g': 4960, proteins_100g: 5, carbohydrates_100g: 60, fat_100g: 25 },
    };
    expect(transformOffRecord(extremeKcal)).toBeNull();
  });

  test('isim marka ile aynıysa (gerçek ürün adı yoksa) null döner', () => {
    const junkName: OffRawProduct = {
      code: '8690000000005',
      product_name: 'nestle',
      brands: 'nestle',
      countries_tags: ['en:turkey'],
      nutriments: { 'energy-kcal_100g': 372, proteins_100g: 5, carbohydrates_100g: 60, fat_100g: 5 },
    };
    expect(transformOffRecord(junkName)).toBeNull();
  });

  test('beyan edilen kcal makro toplamından %50+ sapıyorsa null döner', () => {
    const macroMismatch: OffRawProduct = {
      code: '8690000000006',
      product_name: 'migros süt',
      brands: 'migros',
      countries_tags: ['en:turkey'],
      // P*4 + C*4 + F*9 = 2.9*4 + 4.7*4 + 31*9 = 309.9, stated 58 — %80+ sapma
      nutriments: { 'energy-kcal_100g': 58, proteins_100g: 2.9, carbohydrates_100g: 4.7, fat_100g: 31 },
    };
    expect(transformOffRecord(macroMismatch)).toBeNull();
  });

  test('makro toplamı kcal ile tutarlı ise kabul edilir', () => {
    expect(transformOffRecord(sampleTrProduct)).not.toBeNull();
  });
});
