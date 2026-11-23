import { useEffect, useState } from 'react';
import type { AppDatabase } from '../db/database';
import { getFavoritesAndRecents, searchFoods } from '../db/foodRepository';
import type { Food } from '../db/schema';
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
    load();
    return () => {
      cancelled = true;
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
        {results.map((food) => (
          <li key={food.id}>
            <button type="button" onClick={() => onSelect(food)}>
              {food.name}
              {food.lastQuantityGrams ? ` · ${food.lastQuantityGrams} g` : ''}
            </button>
            <SourceBadge source={food.source} />
          </li>
        ))}
      </ul>
    </div>
  );
}
