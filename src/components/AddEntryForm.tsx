import { useState } from 'react';
import type { AppDatabase } from '../db/database';
import { addDiaryEntry } from '../domain/diaryService';
import { resolveQuantityGrams } from '../domain/diaryService';
import type { Food, MealType } from '../db/schema';

interface AddEntryFormProps {
  db: AppDatabase;
  food: Food;
  date: string;
  mealType: MealType;
  onAdded: () => void;
}

export function AddEntryForm({ db, food, date, mealType, onAdded }: AddEntryFormProps) {
  const [quantityGrams, setQuantityGrams] = useState(() => resolveQuantityGrams(undefined, food));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addDiaryEntry(db, food.id, quantityGrams, date, mealType);
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        {food.name} miktar (g)
        <input
          type="number"
          value={quantityGrams}
          min={1}
          onChange={(e) => setQuantityGrams(Number(e.target.value))}
        />
      </label>
      <button type="submit">Günlüğe ekle</button>
    </form>
  );
}
