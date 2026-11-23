import { useEffect, useState } from 'react';
import type { AppDatabase } from '../db/database';
import { getFavoritesAndRecents, searchFoods } from '../db/foodRepository';
import type { Food } from '../db/schema';
import { resolveQuantityGrams } from '../domain/diaryService';
import { SourceBadge } from './SourceBadge';

interface FoodSearchProps {
  db: AppDatabase;
  onSelect: (food: Food) => void;
}

export function FoodSearch({ db, onSelect }: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const foods = query.trim()
        ? await searchFoods(db, query)
        : await getFavoritesAndRecents(db);
      if (!cancelled) setResults(foods);
    }
    // Debounce so a fast typist doesn't trigger a Fuse search on every keystroke.
    const timeoutId = setTimeout(load, 150);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [db, query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Besin ara (örn. çorba)"
        aria-label="Besin ara"
      />
      <ul>
        {results.map((food) => {
          const quantity = resolveQuantityGrams(undefined, food);
          const kcal = Math.round((food.nutrientsPer100g.kcal * quantity) / 100);
          return (
            <li key={food.id}>
              <button type="button" onClick={() => onSelect(food)}>
                {food.name}
                <br />
                <small style={{ color: 'var(--text-muted)' }}>
                  {kcal} kcal, {quantity} g
                </small>
              </button>
              <SourceBadge source={food.source} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
