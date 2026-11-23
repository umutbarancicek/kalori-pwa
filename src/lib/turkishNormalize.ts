const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ö: 'o',
  Ö: 'o',
  ü: 'u',
  Ü: 'u',
  ı: 'i',
  İ: 'i',
  I: 'i',
};

export function normalizeTurkish(input: string): string {
  const replaced = input.replace(/[çÇşŞğĞöÖüÜıİI]/g, (ch) => TURKISH_CHAR_MAP[ch] ?? ch);
  return replaced.toLowerCase();
}
