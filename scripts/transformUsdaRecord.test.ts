import { describe, expect, test } from 'vitest';
import { transformUsdaRecord, type UsdaRawFood } from './buildFoodData';

describe('transformUsdaRecord', () => {
  test('KCAL birimli Energy değerini alır, kJ değerini almaz', () => {
    const raw: UsdaRawFood = {
      fdcId: 1,
      description: 'Tavuk Göğsü',
      foodNutrients: [
        { nutrientName: 'Energy', unitName: 'kJ', value: 690 },
        { nutrientName: 'Energy', unitName: 'KCAL', value: 165 },
      ],
    };
    const result = transformUsdaRecord(raw);
    expect(result?.nutrientsPer100g.kcal).toBeCloseTo(165);
  });

  test('Sodyum mg değerini tuz (g) değerine dönüştürür (sodyum * 2.5 / 1000)', () => {
    const raw: UsdaRawFood = {
      fdcId: 2,
      description: 'Test Ürünü',
      foodNutrients: [{ nutrientName: 'Sodium, Na', unitName: 'MG', value: 400 }],
    };
    const result = transformUsdaRecord(raw);
    expect(result?.nutrientsPer100g.salt).toBeCloseTo(1.0);
  });
});
