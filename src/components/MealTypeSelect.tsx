import type { MealType } from '../db/schema';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle Yemeği',
  dinner: 'Akşam Yemeği',
  snack: 'Atıştırmalık',
  other: 'Diğer',
};

const SELECTABLE_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface MealTypeSelectProps {
  value: MealType;
  onChange: (mealType: MealType) => void;
}

export function MealTypeSelect({ value, onChange }: MealTypeSelectProps) {
  return (
    <label>
      Öğün
      <select value={value} onChange={(e) => onChange(e.target.value as MealType)}>
        {SELECTABLE_MEAL_TYPES.map((mealType) => (
          <option key={mealType} value={mealType}>
            {MEAL_TYPE_LABELS[mealType]}
          </option>
        ))}
      </select>
    </label>
  );
}
