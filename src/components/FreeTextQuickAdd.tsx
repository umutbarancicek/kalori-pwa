import { useState } from 'react';
import type { AppDatabase } from '../db/database';
import { searchFoods } from '../db/foodRepository';
import { addDiaryEntry, resolveQuantityGrams } from '../domain/diaryService';
import { parseFreeText } from '../domain/freeTextParser';
import type { MealType } from '../db/schema';

interface FreeTextQuickAddProps {
  db: AppDatabase;
  date: string;
  mealType: MealType;
  onAdded: () => void;
}

export function FreeTextQuickAdd({ db, date, mealType, onAdded }: FreeTextQuickAddProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseFreeText(input);
    const matches = await searchFoods(db, parsed.name, 1);
    const food = matches[0];
    if (!food) {
      setError(`"${parsed.name}" için eşleşen besin bulunamadı.`);
      return;
    }
    const quantityGrams = resolveQuantityGrams(parsed.quantityGrams, food);
    await addDiaryEntry(db, food.id, quantityGrams, date, mealType);
    setInput('');
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Hızlı ekle (örn. "peynir 50")
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="peynir 50"
        />
      </label>
      <button type="submit">Ekle</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
