import type { MealType } from '../db/schema';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle Yemeği',
  dinner: 'Akşam Yemeği',
  snack: 'Atıştırmalık',
  other: 'Diğer',
};

/** Dative ("...'a ekle") form — Turkish vowel harmony needs this per word, not a suffix rule. */
export const MEAL_TYPE_LABELS_DATIVE: Record<MealType, string> = {
  breakfast: 'Kahvaltıya',
  lunch: 'Öğle Yemeğine',
  dinner: 'Akşam Yemeğine',
  snack: 'Atıştırmalığa',
  other: 'Diğerine',
};

const SELECTABLE_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface MealTypeSelectProps {
  value: MealType;
  onChange: (mealType: MealType) => void;
}

export function MealTypeSelect({ value, onChange }: MealTypeSelectProps) {
  return (
    <div className="meal-chips" role="group" aria-label="Öğün seç">
      {SELECTABLE_MEAL_TYPES.map((mealType) => (
        <button
          key={mealType}
          type="button"
          className={mealType === value ? 'active' : ''}
          onClick={() => onChange(mealType)}
        >
          {MEAL_TYPE_LABELS[mealType]}
        </button>
      ))}
    </div>
  );
}
