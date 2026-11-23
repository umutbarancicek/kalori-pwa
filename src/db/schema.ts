export interface Nutrients {
  kcal: number;
  protein: number;
  carb: number;
  sugar: number;
  fat: number;
  satFat: number;
  fiber: number;
  salt: number;
}

export type FoodSource = 'bulk' | 'user' | 'verified';

export interface Food {
  id: string;
  name: string;
  /** normalizeTurkish(name); populated by foodRepository.upsertFood */
  nameNormalized?: string;
  brand?: string;
  barcode?: string;
  nutrientsPer100g: Nutrients;
  source: FoodSource;
  lastQuantityGrams?: number;
  usageCount: number;
  lastUsedAt?: number;
}

export interface DiaryEntry {
  id: string;
  date: string;
  foodId: string;
  quantityGrams: number;
  snapshotNutrients: Nutrients;
  createdAt: number;
}

export interface MealTemplate {
  id: string;
  name: string;
  items: { foodId: string; quantityGrams: number }[];
}

export interface SettingsEntry {
  key: string;
  value: unknown;
}
