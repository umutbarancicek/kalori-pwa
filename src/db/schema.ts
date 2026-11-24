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
  isFavorite?: boolean;
  /** True for liquids (su, çorba, süt...): birim seçimi ml/bardak/kaşık gösterir, g/adet değil. */
  isLiquid?: boolean;
  /** Tane ile ölçülen katı besinler için (elma, yumurta...): set edilirse birim seçimine "adet" eklenir. */
  pieceGrams?: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

export interface DiaryEntry {
  id: string;
  date: string;
  foodId: string;
  quantityGrams: number;
  snapshotNutrients: Nutrients;
  createdAt: number;
  /** Optional for backward compatibility with entries created before meal grouping existed. */
  mealType?: MealType;
  /** Set for entries with no real food (e.g. quick kcal-only entries) to label the row instead of a food name. */
  label?: string;
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

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type WeightGoal = 'lose' | 'maintain' | 'gain';

export interface UserProfile {
  age: number;
  weightKg: number;
  heightCm: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: WeightGoal;
}

export interface DailyGoal {
  kcal: number;
  protein: number;
  fat: number;
  carb: number;
  fiber: number;
}

export interface WaterLog {
  id: string;
  date: string;
  amountMl: number;
  createdAt: number;
}

export interface WeightLog {
  id: string;
  date: string;
  weightKg: number;
  createdAt: number;
}
