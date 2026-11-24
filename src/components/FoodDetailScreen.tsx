import { useState } from 'react';
import type { AppDatabase } from '../db/database';
import { toggleFavorite } from '../db/foodRepository';
import { addDiaryEntry, resolveQuantityGrams } from '../domain/diaryService';
import { convertToGrams, UNIT_LABELS, type QuantityUnit } from '../domain/unitConversion';
import type { Food, MealType } from '../db/schema';

interface FoodDetailScreenProps {
  db: AppDatabase;
  food: Food;
  date: string;
  mealType: MealType;
  initialQuantityGrams?: number;
  onAdded: () => void;
  onCancel: () => void;
}

function MacroBar({ label, grams, color }: { label: string; grams: number; color: string }) {
  // Scaled against a rough 60g/day reference just to give the bar a sense of
  // proportion at a glance — it is not a daily-goal comparison (that lives in
  // the diary screen's rings), just a quick relative read of this one food.
  const widthPercent = Math.min((grams / 60) * 100, 100);
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
        <span>{label}</span>
        <span>{Math.round(grams)} g</span>
      </div>
      <div style={{ background: 'var(--border)', borderRadius: 4, height: 6 }}>
        <div
          style={{
            width: `${widthPercent}%`,
            background: color,
            height: '100%',
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}

export function FoodDetailScreen({
  db,
  food,
  date,
  mealType,
  initialQuantityGrams,
  onAdded,
  onCancel,
}: FoodDetailScreenProps) {
  const [quantity, setQuantity] = useState(
    () => initialQuantityGrams ?? resolveQuantityGrams(undefined, food),
  );
  const [unit, setUnit] = useState<QuantityUnit>('g');
  const [isFavorite, setIsFavorite] = useState(!!food.isFavorite);

  const grams = convertToGrams(quantity, unit);
  const ratio = grams / 100;
  const n = food.nutrientsPer100g;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addDiaryEntry(db, food.id, grams, date, mealType);
    onAdded();
  }

  async function handleToggleFavorite() {
    const updated = await toggleFavorite(db, food.id);
    setIsFavorite(!!updated.isFavorite);
  }

  return (
    <form onSubmit={handleSubmit} className="food-detail">
      <h3>
        {food.name}
        {food.brand ? ` · ${food.brand}` : ''}
        <button
          type="button"
          className="favorite-star"
          aria-label={isFavorite ? 'Favoriden çıkar' : 'Favoriye ekle'}
          aria-pressed={isFavorite}
          onClick={handleToggleFavorite}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </h3>
      <p className="kcal-total">{Math.round(n.kcal * ratio)} kcal</p>

      <div className="row-form">
        <label>
          Miktar
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
      </div>

      <MacroBar label="Protein" grams={n.protein * ratio} color="#ef4444" />
      <MacroBar label="Karbonhidrat" grams={n.carb * ratio} color="#3b82f6" />
      <MacroBar label="Yağ" grams={n.fat * ratio} color="#f59e0b" />
      <MacroBar label="Lif" grams={n.fiber * ratio} color="#8b5c2e" />

      <div className="row-form">
        <button type="submit">Ekle</button>
        <button type="button" className="secondary" onClick={onCancel}>
          Vazgeç
        </button>
      </div>
    </form>
  );
}
