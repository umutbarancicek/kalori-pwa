const FREE_TEXT_PATTERN = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|gr)?$/i;

export interface ParsedFreeText {
  name: string;
  quantityGrams?: number;
}

export function parseFreeText(input: string): ParsedFreeText {
  const match = input.trim().match(FREE_TEXT_PATTERN);
  if (!match) {
    return { name: input.trim(), quantityGrams: undefined };
  }
  const [, name, amount] = match;
  return { name, quantityGrams: Number(amount.replace(',', '.')) };
}
