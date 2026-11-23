import type { Nutrients } from '../db/schema';

type ExtractedValue = { per100g?: number; perServing?: number };
export type ExtractedNutrients = Partial<Record<keyof Nutrients, ExtractedValue>>;

const NUTRIENT_LINE_PATTERNS: [keyof Nutrients, RegExp][] = [
  ['kcal', /Enerji|Energy/i],
  ['protein', /Protein/i],
  ['carb', /Karbonhidrat|Carbohydrate/i],
  ['sugar', /(?:içinde )?[Şş]eker|Sugars/i],
  ['satFat', /Doymu[şs]|Saturated/i],
  ['fat', /Ya[ğg]|Fat/i],
  ['fiber', /Lif|Fiber/i],
  ['salt', /Tuz|Sodyum|Salt/i],
];

function parseNumbersFromLine(line: string): number[] {
  const matches = line.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return matches.map((n) => Number(n.replace(',', '.')));
}

const NUMBER_BEFORE_KCAL = /(\d+(?:[.,]\d+)?)\s*kcal/gi;

function parseKcalValuesFromLine(line: string): number[] {
  const matches = [...line.matchAll(NUMBER_BEFORE_KCAL)];
  if (matches.length === 0) {
    // No "kcal" unit token present (e.g. "Energy" without kcal label) — fall back to
    // taking every number on the line, which is the pre-kJ-aware behavior.
    return parseNumbersFromLine(line);
  }
  return matches.map((m) => Number(m[1].replace(',', '.')));
}

export function extractNutrientsFromLabelText(text: string): ExtractedNutrients {
  const lines = text.split('\n');
  const usedLineIndexes = new Set<number>();
  const result: ExtractedNutrients = {};

  for (const [key, pattern] of NUTRIENT_LINE_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (usedLineIndexes.has(i) || !pattern.test(lines[i])) continue;

      const numbers =
        key === 'kcal' ? parseKcalValuesFromLine(lines[i]) : parseNumbersFromLine(lines[i]);
      if (numbers.length > 0) {
        result[key] = {
          per100g: numbers[0],
          ...(numbers[1] !== undefined ? { perServing: numbers[1] } : {}),
        };
      }
      usedLineIndexes.add(i);
      break;
    }
  }

  return result;
}
