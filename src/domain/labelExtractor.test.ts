import { describe, expect, test } from 'vitest';
import { extractNutrientsFromLabelText } from './labelExtractor';

const sampleLabelText = `Besin Değerleri 100 g 1 porsiyon (50 g)
Enerji 250 kcal 125 kcal
Protein 12 g 6 g
Karbonhidrat 30 g 15 g
içinde Şeker 10 g 5 g
Doymuş Yağ 3 g 1.5 g
Yağ 8 g 4 g
Lif 2 g 1 g
Tuz 1.2 g 0.6 g`;

const labelTextWithoutSalt = `Enerji 250 kcal 125 kcal
Protein 12 g 6 g`;

describe('extractNutrientsFromLabelText', () => {
  test('tipik TR etiket metninden değerleri ayıklar', () => {
    const result = extractNutrientsFromLabelText(sampleLabelText);
    expect(result.kcal?.per100g).toBeCloseTo(250);
    expect(result.kcal?.perServing).toBeCloseTo(125);
    expect(result.protein?.per100g).toBeCloseTo(12);
    expect(result.satFat?.per100g).toBeCloseTo(3);
    expect(result.fat?.per100g).toBeCloseTo(8);
    expect(result.salt?.per100g).toBeCloseTo(1.2);
  });

  test('Tuz satırı yoksa salt alanı undefined kalır, hata fırlatmaz', () => {
    expect(() => extractNutrientsFromLabelText(labelTextWithoutSalt)).not.toThrow();
    expect(extractNutrientsFromLabelText(labelTextWithoutSalt).salt).toBeUndefined();
  });

  test('Enerji satırında kJ ve kcal birlikte verilirse kJ değeri kcal olarak alınmaz', () => {
    const labelWithKj = `Enerji 1050 kJ / 250 kcal 525 kJ / 125 kcal
Protein 12 g 6 g`;
    const result = extractNutrientsFromLabelText(labelWithKj);
    expect(result.kcal?.per100g).toBeCloseTo(250);
    expect(result.kcal?.perServing).toBeCloseTo(125);
  });

  test('Sodyum mg biriminde verilirse salt alanına g olarak değil ham değer olarak çağrılan fonksiyon tarafından yorumlanmaz (ham sayı aynen döner)', () => {
    const labelWithSodiumMg = `Sodyum 400 mg 200 mg`;
    const result = extractNutrientsFromLabelText(labelWithSodiumMg);
    expect(result.salt?.per100g).toBeCloseTo(400);
  });
});
