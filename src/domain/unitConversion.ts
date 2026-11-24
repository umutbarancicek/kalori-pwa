import type { Food } from '../db/schema';
import { normalizeTurkish } from '../lib/turkishNormalize';

export type QuantityUnit =
  | 'g'
  | 'ml'
  | 'bardak'
  | 'kupa'
  | 'yemek_kasigi'
  | 'tatli_kasigi'
  | 'cay_kasigi'
  | 'kibrit_kutusu'
  | 'adet';

export const UNIT_LABELS: Record<QuantityUnit, string> = {
  g: 'g',
  ml: 'ml',
  bardak: 'su bardağı (~200 ml)',
  kupa: 'kupa (~250 ml)',
  yemek_kasigi: 'yemek kaşığı (~15 ml)',
  tatli_kasigi: 'tatlı kaşığı (~10 ml)',
  cay_kasigi: 'çay kaşığı (~5 ml)',
  kibrit_kutusu: 'kibrit kutusu (~30 g)',
  adet: 'adet',
};

const LIQUID_UNITS: QuantityUnit[] = ['ml', 'bardak', 'kupa', 'yemek_kasigi', 'tatli_kasigi', 'cay_kasigi'];

// Grams per 1 unit, assuming water-like density (1 ml ≈ 1 g) for liquids —
// a reasonable default since exact food-specific density isn't tracked.
const UNIT_TO_GRAMS: Record<Exclude<QuantityUnit, 'adet'>, number> = {
  g: 1,
  ml: 1,
  bardak: 200,
  kupa: 250,
  yemek_kasigi: 15,
  tatli_kasigi: 10,
  cay_kasigi: 5,
  kibrit_kutusu: 30,
};

export function convertToGrams(quantity: number, unit: QuantityUnit, pieceGrams?: number): number {
  if (unit === 'adet') {
    return quantity * (pieceGrams ?? 100);
  }
  return quantity * UNIT_TO_GRAMS[unit];
}

// Plain .includes() matches a keyword inside an unrelated word too ("kola" ⊂
// "çikolata", "nar" ⊂ "pınar", "muz" ⊂ "domuz", "erik" ⊂ "içerik") and also
// matches Turkish suffixed adjective forms that are really a different word
// ("elmalı", "sütlü", "muzlu"). Requiring a non-letter/digit (or start/end)
// on both sides of the keyword rules out both — it only matches the keyword
// as its own whole word.
function hasWord(normalizedName: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(normalizedName);
}

// Average whole-item weight for common countable foods, keyed by the (single,
// root-form) Turkish keyword to match in the name. General rule applied to
// every food automatically — not a per-product lookup — so it covers the
// whole catalog, old and new, without manual curation.
const PIECE_GRAMS_BY_KEYWORD: [string, number][] = [
  ['elma', 150],
  ['armut', 160],
  ['muz', 120],
  ['portakal', 170],
  ['mandalina', 80],
  ['limon', 60],
  ['greyfurt', 250],
  ['seftali', 130],
  ['kayisi', 35],
  ['erik', 40],
  ['nar', 150],
  ['ayva', 160],
  ['kivi', 70],
  ['incir', 50],
  ['hurma', 8],
  ['nektarin', 140],
  ['avokado', 130],
  ['yumurta', 55],
  ['simit', 110],
  ['pogaca', 70],
  ['acma', 95],
  ['domates', 120],
  ['salatalik', 100],
  ['patates', 150],
  ['sogan', 110],
  ['biber', 35],
  ['patlican', 200],
  ['havuc', 70],
];

// If any of these appear, the product is a processed/compound dish, drink, or
// preserved form built FROM the ingredient (e.g. "elmalı kek", "domates
// çorbası", "kuru kayısı") rather than the raw countable item itself — skip
// the piece guess rather than attach a misleading "1 adet = 150 g" to a slice
// of cake, a sauce, or a dried fruit (far denser than the fresh one).
const PROCESSED_INDICATORS = [
  'kek',
  'pasta',
  'turta',
  'borek',
  'corba',
  'corbasi', // "domates çorbası" gibi izafet eki almış biçim, kök "corba" kelimesiyle eşleşmez
  'salata',
  'sos',
  'sosu', // "domates sosu" izafet biçimi
  'dondurma',
  'recel',
  'receli', // "elma reçeli" izafet biçimi
  'marmelat',
  'salcasi', // "domates salçası" izafet biçimi ("salca" zaten listede, kökü yakalar)
  'eksisi', // "nar ekşisi" izafet biçimi
  'kurabiye',
  'kompost',
  'suyu',
  'nektari',
  'jole',
  'cips',
  'puresi',
  'likor',
  'sarap',
  'biskuvi',
  'krema',
  'dolma',
  'yogurt',
  'ezme',
  'milkshake',
  'kraker',
  'cikolata',
  'kuru',
  'kurutulmus',
  'icecek',
  'soda',
  'cay',
  'aromali',
  'salca',
  'eksi',
  'sirke',
  'baharat',
  'bar',
  'bari', // "meyve barı" izafet biçimi
  'citir', // "çıtır elma" gibi kurutulmuş/kızartılmış çıtır atıştırmalık
  'puding',
  'gofret',
  'seker',
  'sakiz',
  'draje',
  'lokum',
  'helva',
  'mamul',
  'kofte',
  'pilav',
  'makarna',
  'eriste',
  'peynir',
  'salam',
  'sosis',
  'sucuk',
  'fume',
  'tursu',
  'tursusu', // "salatalık turşusu" izafet biçimi
  'konserve',
  'dilim',
  'kesim', // "ince kesim patates" gibi dilimlenmiş/işlenmiş ürün belirteci
  'sarma',
  'cipsi', // "patates cipsi" izafet biçimi
  'halka', // "soğan halka" gibi şekillendirilmiş atıştırmalık
  'cubuk', // "portakal çubuk" gibi şekerleme/çubuk atıştırmalık
  'topu', // "hurma topu" gibi top şeklinde atıştırmalık
  // İngilizce yazılmış ithal ürünlerde de aynı işlenmiş-ürün belirtisi geçerli.
  'biscuit',
  'biscuits',
  'cookie',
  'chocolate',
  'candy',
];

function guessPieceGrams(name: string): number | undefined {
  const normalized = normalizeTurkish(name);
  if (PROCESSED_INDICATORS.some((indicator) => hasWord(normalized, indicator))) {
    return undefined;
  }
  const match = PIECE_GRAMS_BY_KEYWORD.find(([keyword]) => hasWord(normalized, keyword));
  return match?.[1];
}

// isLiquid is missing on most bulk/imported foods (OFF/USDA records don't carry
// it), so fall back to a name-based guess rather than defaulting every drink/
// soup to solid-only units.
const LIQUID_NAME_KEYWORDS = [
  'sut', // süt
  'ayran',
  'corba', // çorba
  'corbasi', // "mercimek çorbası" gibi izafet eki almış biçim
  'meyve suyu',
  'kola',
  'gazoz',
  'limonata',
  'surup', // şurup
  'smoothie',
  'salgam', // şalgam
  'sivi yag', // sıvı yağ
  'icecek', // içecek
  'soda',
  'kefir',
  // Imported/international products on the Turkish market are often named in
  // English rather than Turkish.
  'tea',
  'juice',
  'drink',
  'water',
  'milk',
];

// A product described as a cake, cookie, ice cream, or powder is solid even
// when it's flavored with or made from a liquid ("Süt Kremalı Kek", "Sıcak
// Çikolatalı İçecek Tozu") — the liquid keyword there names an ingredient,
// not the product's own form. "sut misir" (corn-on-the-cob, lit. "milk corn")
// is a fixed compound where "süt" is a quality descriptor, not milk.
const SOLID_OVERRIDE_PHRASES = [
  'kek',
  'pasta',
  'turta',
  'kurabiye',
  'dondurma',
  'biskuvi',
  'toz',
  'tozu',
  'sut misir',
  'biscuit',
  'biscuits',
  'cookie',
  'chocolate',
  'candy',
];

// A number followed by a volume unit (1 lt, 330 ml, 33 cl) is a strong,
// language/brand-independent signal that the product is a liquid.
const VOLUME_PATTERN = /(^|[^a-z0-9])\d+\s?(ml|cl|lt|litre|milim)([^a-z0-9]|$)/;

function guessIsLiquid(name: string): boolean {
  const normalized = normalizeTurkish(name);
  if (SOLID_OVERRIDE_PHRASES.some((phrase) => hasWord(normalized, phrase))) {
    return false;
  }
  if (VOLUME_PATTERN.test(normalized)) {
    return true;
  }
  return LIQUID_NAME_KEYWORDS.some((keyword) => hasWord(normalized, keyword));
}

/** food.pieceGrams varsa onu kullanır, yoksa isimden tahmin eder. convertToGrams'a verilecek değer budur. */
export function resolvePieceGrams(food: Pick<Food, 'pieceGrams' | 'name'>): number | undefined {
  return food.pieceGrams ?? guessPieceGrams(food.name);
}

/** Besinin türüne göre anlamlı birimleri döner: sıvıya g/adet, katıya ml/kaşık önerilmez. */
export function getAvailableUnits(food: Pick<Food, 'isLiquid' | 'pieceGrams' | 'name'>): QuantityUnit[] {
  const isLiquid = food.isLiquid ?? guessIsLiquid(food.name);
  if (isLiquid) {
    return LIQUID_UNITS;
  }
  return resolvePieceGrams(food) ? ['g', 'kibrit_kutusu', 'adet'] : ['g', 'kibrit_kutusu'];
}
