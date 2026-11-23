import { useState } from 'react';
import type { AppDatabase } from '../db/database';
import { addDiaryEntry, resolveQuantityGrams } from '../domain/diaryService';
import { convertToGrams, UNIT_LABELS, type QuantityUnit } from '../domain/unitConversion';
import type { Food, MealType } from '../db/schema';

interface AddEntryFormProps {
  db: AppDatabase;
  food: Food;
  date: string;
  mealType: MealType;
  onAdded: () => void;
}

export function AddEntryForm({ db, food, date, mealType, onAdded }: AddEntryFormProps) {
  const [quantity, setQuantity] = useState(() => resolveQuantityGrams(undefined, food));
  const [unit, setUnit] = useState<QuantityUnit>('g');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addDiaryEntry(db, food.id, convertToGrams(quantity, unit), date, mealType);
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="row-form">
      <label>
        {food.name} miktar
        <input
          type="number"
          value={quantity}
          min={0.1}
          step="any"
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </label>
      <label>
        Birim
        <select value={unit} onChange={(e) => setUnit(e.target.value as QuantityUnit)}>
          {Object.entries(UNIT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">Günlüğe ekle</button>
    </form>
  );
}
