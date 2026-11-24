import { describe, expect, test } from 'vitest';
import { convertToGrams, getAvailableUnits, UNIT_LABELS } from './unitConversion';
import type { Food } from '../db/schema';

function makeFood(overrides: Partial<Food>): Food {
  return {
    id: '1',
    name: 'Test',
    nutrientsPer100g: {
      kcal: 0,
      protein: 0,
      carb: 0,
      sugar: 0,
      fat: 0,
      satFat: 0,
      fiber: 0,
      salt: 0,
    },
    source: 'bulk',
    usageCount: 0,
    ...overrides,
  };
}

describe('convertToGrams', () => {
  test('g birimi aynen döner', () => {
    expect(convertToGrams(50, 'g')).toBe(50);
  });

  test('ml birimi 1:1 yoğunlukla grama çevrilir (sıvılar için)', () => {
    expect(convertToGrams(200, 'ml')).toBe(200);
  });

  test('su bardağı yaklaşık 200 ml/g sayılır', () => {
    expect(convertToGrams(1, 'bardak')).toBe(200);
    expect(convertToGrams(2, 'bardak')).toBe(400);
  });

  test('kupa yaklaşık 250 ml/g sayılır', () => {
    expect(convertToGrams(1, 'kupa')).toBe(250);
  });

  test('yemek kaşığı yaklaşık 15 ml/g sayılır', () => {
    expect(convertToGrams(2, 'yemek_kasigi')).toBe(30);
  });

  test('tatlı kaşığı yaklaşık 10 ml/g sayılır', () => {
    expect(convertToGrams(1, 'tatli_kasigi')).toBe(10);
  });

  test('çay kaşığı yaklaşık 5 ml/g sayılır', () => {
    expect(convertToGrams(3, 'cay_kasigi')).toBe(15);
  });

  test('her birim için bir etiket tanımlı', () => {
    expect(UNIT_LABELS.g).toBe('g');
    expect(UNIT_LABELS.ml).toBe('ml');
    expect(UNIT_LABELS.bardak).toBeTruthy();
  });

  test('adet birimi pieceGrams ile grama çevrilir', () => {
    expect(convertToGrams(2, 'adet', 150)).toBe(300);
  });

  test('kibrit kutusu yaklaşık 30 g sayılır (et/peynir porsiyon referansı)', () => {
    expect(convertToGrams(2, 'kibrit_kutusu')).toBe(60);
  });
});

describe('getAvailableUnits', () => {
  test('tanınmayan katı besin g + kibrit kutusu döner (genel referans, her katıya uygulanır)', () => {
    const food = makeFood({ name: 'Rastgele Bilinmeyen Ürün' });
    expect(getAvailableUnits(food)).toEqual(['g', 'kibrit_kutusu']);
  });

  test('pieceGrams açıkça tanımlı katı besin g + kibrit kutusu + adet döner', () => {
    const food = makeFood({ name: 'Rastgele Bilinmeyen Ürün', pieceGrams: 150 });
    expect(getAvailableUnits(food)).toEqual(['g', 'kibrit_kutusu', 'adet']);
  });

  test('sıvı besin ml ve hacim birimlerini döner, g/kibrit kutusu/adet döndürmez', () => {
    const food = makeFood({ isLiquid: true });
    const units = getAvailableUnits(food);
    expect(units).toEqual(['ml', 'bardak', 'kupa', 'yemek_kasigi', 'tatli_kasigi', 'cay_kasigi']);
    expect(units).not.toContain('g');
    expect(units).not.toContain('kibrit_kutusu');
    expect(units).not.toContain('adet');
  });

  test('isLiquid alanı yoksa isme bakarak sıvı tahmin eder (eski/bulk veri için)', () => {
    expect(getAvailableUnits(makeFood({ name: 'Süt' }))).toContain('ml');
    expect(getAvailableUnits(makeFood({ name: 'Tam Yağlı Süt · Pınar' }))).toContain('ml');
    expect(getAvailableUnits(makeFood({ name: 'Ayran' }))).toContain('ml');
    expect(getAvailableUnits(makeFood({ name: 'Mercimek Çorbası' }))).toContain('ml');
  });

  test('isLiquid açıkça false ise isme bakılmaz', () => {
    expect(getAvailableUnits(makeFood({ name: 'Süt', isLiquid: false }))).toEqual(['g', 'kibrit_kutusu']);
  });

  test('pieceGrams yoksa isme bakarak tane besinler için adet tahmin eder (elma, yumurta vb.)', () => {
    expect(getAvailableUnits(makeFood({ name: 'Elma' }))).toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Gala Elma · Migros' }))).toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Yumurta' }))).toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Muz' }))).toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Domates' }))).toContain('adet');
  });

  test('tane tahmini sadece işlenmemiş çiğ besinde çalışır, işlenmiş/bileşik üründe çalışmaz', () => {
    expect(getAvailableUnits(makeFood({ name: 'Elmalı Kek' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Elma Suyu' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Elma Reçeli' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Muzlu Milkshake' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Domates Çorbası' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Domates Sosu' }))).not.toContain('adet');
  });

  test('food.pieceGrams açıkça set edilmişse isim tahminini ezer', () => {
    const units = getAvailableUnits(makeFood({ name: 'Elma', pieceGrams: 200 }));
    expect(units).toContain('adet');
  });

  test('food.pieceGrams açıkça 0/undefined ve isim eşleşmiyorsa adet gelmez', () => {
    const units = getAvailableUnits(makeFood({ name: 'Çikolata' }));
    expect(units).not.toContain('adet');
    expect(units).toEqual(['g', 'kibrit_kutusu']); // sıvı DEĞİL — "kola" kelimesi "çikolata" içinde geçiyor diye yanlışlıkla sıvı sayılmamalı
  });

  // Gerçek 1560 kayıtlık bulk veride substring eşleşmesinin ürettiği somut
  // yanlış pozitifler (bağımsız incelemede bulundu) — kelime sınırı olmadan
  // bunlar hep kırılır.
  test('"kola" kelimesi çikolata/gofret gibi besinlerin içinde geçtiği için onları sıvı yapmamalı', () => {
    expect(getAvailableUnits(makeFood({ name: 'Bitter Çikolata' }))).not.toContain('ml');
    expect(getAvailableUnits(makeFood({ name: 'Çikolatalı Gofret' }))).not.toContain('ml');
  });

  test('"süt" kelimesi Sütaş gibi marka adlarının içinde geçtiği için peynir/yoğurdu sıvı yapmamalı', () => {
    expect(getAvailableUnits(makeFood({ name: 'Sütaş beyaz peynir 500' }))).not.toContain('ml');
    expect(getAvailableUnits(makeFood({ name: 'Sütaş Yoğurt' }))).not.toContain('ml');
    expect(getAvailableUnits(makeFood({ name: 'Fırın Sütlaç' }))).not.toContain('ml');
  });

  test('"nar" kelimesi Pınar marka adının içinde geçtiği için 250g nar varsaymamalı', () => {
    expect(getAvailableUnits(makeFood({ name: 'Pınar Krem Peynir 100' }))).not.toContain('adet');
  });

  test('"muz" kelimesi domuz ürünlerinin içinde geçtiği için adet varsaymamalı', () => {
    expect(getAvailableUnits(makeFood({ name: 'Domuz Pastırması' }))).not.toContain('adet');
  });

  test('"erik" kelimesi "içerik" içinde geçtiği için yanlış tetiklenmemeli', () => {
    expect(getAvailableUnits(makeFood({ name: 'İçerik Bilgisi Olmayan Ürün' }))).not.toContain('adet');
  });

  test('"biber" kelimesi karabiber gibi baharatların içinde geçtiği için adet varsaymamalı', () => {
    expect(getAvailableUnits(makeFood({ name: 'Karabiberli Hindi But Füme' }))).not.toContain('adet');
  });

  test('ek almış sıfat biçimleri (elmalı, muzlu, sütlü) kök kelimeyle eşleşmemeli', () => {
    expect(getAvailableUnits(makeFood({ name: 'Elmalı Turta' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Muzlu Protein Bar' }))).not.toContain('adet');
  });

  test('nektarin, içindeki "nektarı" işlenmiş-ürün kelimesiyle yanlışlıkla engellenmemeli', () => {
    expect(getAvailableUnits(makeFood({ name: 'Nektarin' }))).toContain('adet');
  });

  test('kuru meyve taze meyve gram değeriyle karıştırılmamalı (kayısı/erik/incir çok daha az su içerir)', () => {
    expect(getAvailableUnits(makeFood({ name: 'Kuru Kayısı' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Kuru Erik' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Kuru İncir' }))).not.toContain('adet');
  });

  test('salça/ekşi gibi izafet eki almış işlenmiş ürünler çiğ sebze adediyle karıştırılmamalı', () => {
    expect(getAvailableUnits(makeFood({ name: 'Domates Salçası' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Tatlı Biber Salçası' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Nar Ekşisi' }))).not.toContain('adet');
  });

  test('süt/çikolata içeren ama kendisi tatlı/toz olan ürünler (kek, toz vb.) sıvı sayılmamalı', () => {
    expect(getAvailableUnits(makeFood({ name: 'Süt Kremalı Kek' }))).not.toContain('ml');
    expect(getAvailableUnits(makeFood({ name: 'Sıcak Çikolatalı İçecek Tozu' }))).not.toContain('ml');
    expect(getAvailableUnits(makeFood({ name: 'Süt Mısır' }))).not.toContain('ml');
  });

  test('isim lt/ml/cl gibi bir hacim birimi içeriyorsa sıvı sayılır (marka adı/dil fark etmez)', () => {
    expect(getAvailableUnits(makeFood({ name: 'Schweppes 1 lt mandalina' }))).toContain('ml');
    expect(getAvailableUnits(makeFood({ name: 'Uludağ 330 ml gazoz' }))).toContain('ml');
  });

  test('İngilizce "tea/juice/water" gibi yaygın ithal ürün isimleri de sıvı tanınır', () => {
    expect(getAvailableUnits(makeFood({ name: 'Ice tea limon' }))).toContain('ml');
    expect(getAvailableUnits(makeFood({ name: 'Orange juice' }))).toContain('ml');
  });

  test('İngilizce "biscuit/chocolate" gibi katı ürün isimleri süt/çay geçse bile sıvı sayılmaz', () => {
    expect(getAvailableUnits(makeFood({ name: 'Petit beurre biscuit Milk flavor' }))).not.toContain('ml');
    expect(getAvailableUnits(makeFood({ name: 'Digestive nibbles milk chocolate' }))).not.toContain('ml');
    expect(getAvailableUnits(makeFood({ name: 'Tea biscuits' }))).not.toContain('ml');
  });

  test('şekillendirilmiş atıştırmalıklar (cips, halka, çubuk, topu, bar) çiğ sebze/meyve adediyle karışmaz', () => {
    expect(getAvailableUnits(makeFood({ name: 'Patates Cipsi' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Soğan Halka' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Harras Hurma Topu' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Salatalık Turşusu' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Portakal ve Fındıklı Meyve Barı' }))).not.toContain('adet');
    expect(getAvailableUnits(makeFood({ name: 'Çıtır Elma' }))).not.toContain('adet');
  });
});
