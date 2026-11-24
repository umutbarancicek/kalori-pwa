import { useEffect, useState } from 'react';
import type { AppDatabase } from '../db/database';
import { getFavoritesAndRecents, searchFoods, upsertFood } from '../db/foodRepository';
import type { Food, MealType } from '../db/schema';
import { addDiaryEntry } from '../domain/diaryService';
import { lookupBarcode } from '../domain/barcodeLookup';
import { parseFreeText } from '../domain/freeTextParser';
import { fetchProductFromOff } from '../lib/offApi';
import { BarcodeScanner } from './BarcodeScanner';
import { FoodDetailScreen } from './FoodDetailScreen';
import { LabelCaptureFlow } from './LabelCaptureFlow';
import { MEAL_TYPE_LABELS_DATIVE, MealTypeSelect } from './MealTypeSelect';
import { MealTemplates } from './MealTemplates';
import { SourceBadge } from './SourceBadge';

type AddMode = 'search' | 'barcode' | 'label' | 'templates';

interface AddScreenProps {
  db: AppDatabase;
  date: string;
  mealType: MealType;
  onMealTypeChange: (mealType: MealType) => void;
  visionApiKey: string | null;
  onDone: () => void;
}

export function AddScreen({
  db,
  date,
  mealType,
  onMealTypeChange,
  visionApiKey,
  onDone,
}: AddScreenProps) {
  const [mode, setMode] = useState<AddMode>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [prefillQuantityGrams, setPrefillQuantityGrams] = useState<number | undefined>(undefined);
  const [addedCount, setAddedCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'search' || selectedFood) return;
    let cancelled = false;
    async function load() {
      const parsed = parseFreeText(query);
      const nameQuery = parsed.name.trim();
      const foods = nameQuery
        ? await searchFoods(db, nameQuery)
        : await getFavoritesAndRecents(db);
      if (!cancelled) setResults(foods);
    }
    const timeoutId = setTimeout(load, 150);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [db, query, mode, selectedFood]);

  function openDetailFor(food: Food, quantityGrams?: number) {
    setPrefillQuantityGrams(quantityGrams);
    setSelectedFood(food);
  }

  async function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const parsed = parseFreeText(query);
    if (parsed.quantityGrams === undefined) {
      // Just a name with no quantity typed — fall through to picking from the
      // live results list instead of guessing.
      return;
    }
    const matches = await searchFoods(db, parsed.name, 1);
    const food = matches[0];
    if (!food) {
      setMessage(`"${parsed.name}" için eşleşen besin bulunamadı.`);
      return;
    }
    await addDiaryEntry(db, food.id, parsed.quantityGrams, date, mealType);
    setAddedCount((c) => c + 1);
    setQuery('');
  }

  function handleFoodAdded() {
    setSelectedFood(null);
    setPrefillQuantityGrams(undefined);
    setAddedCount((c) => c + 1);
    setQuery('');
  }

  async function handleBarcodeDetected(barcode: string) {
    setMessage(null);
    try {
      const result = await lookupBarcode(db, barcode, fetchProductFromOff);
      if (!result) {
        setMessage(
          `"${barcode}" barkodu bulunamadı. Etiket fotoğrafı çekebilir veya arayarak ekleyebilirsin.`,
        );
        setMode('search');
        return;
      }
      setMode('search');
      openDetailFor(result.food);
    } catch {
      setMessage(`"${barcode}" için arama yapılamadı.`);
      setMode('search');
    }
  }

  async function handleLabelSaved(food: Food) {
    await upsertFood(db, food);
    setMode('search');
    openDetailFor(food);
  }

  return (
    <div>
      <h2>{MEAL_TYPE_LABELS_DATIVE[mealType]} ekle</h2>
      <MealTypeSelect value={mealType} onChange={onMealTypeChange} />

      {selectedFood ? (
        <FoodDetailScreen
          key={selectedFood.id}
          db={db}
          food={selectedFood}
          date={date}
          mealType={mealType}
          initialQuantityGrams={prefillQuantityGrams}
          onAdded={handleFoodAdded}
          onCancel={() => setSelectedFood(null)}
        />
      ) : (
        <>
          <div className="mode-chips">
            <button type="button" className={mode === 'search' ? 'active' : ''} onClick={() => setMode('search')}>
              Ara
            </button>
            <button type="button" className={mode === 'barcode' ? 'active' : ''} onClick={() => setMode('barcode')}>
              Barkod
            </button>
            {visionApiKey && (
              <button type="button" className={mode === 'label' ? 'active' : ''} onClick={() => setMode('label')}>
                Etiket
              </button>
            )}
            <button
              type="button"
              className={mode === 'templates' ? 'active' : ''}
              onClick={() => setMode('templates')}
            >
              Şablonlar
            </button>
          </div>

          {mode === 'search' && (
            <form onSubmit={handleQuickSubmit}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Besin ara veya "peynir 50" yaz'
                aria-label="Besin ara"
                autoFocus
              />
              <ul>
                {results.map((food) => {
                  const n = food.nutrientsPer100g;
                  return (
                    <li key={food.id}>
                      <button
                        type="button"
                        onClick={() =>
                          openDetailFor(food, parseFreeText(query).quantityGrams)
                        }
                      >
                        {food.name}
                        {food.brand ? ` · ${food.brand}` : ''}
                        <br />
                        <small style={{ color: 'var(--text-muted)' }}>
                          {Math.round(n.kcal)} kcal/100g · P {Math.round(n.protein)} K{' '}
                          {Math.round(n.carb)} Y {Math.round(n.fat)}
                        </small>
                      </button>
                      <SourceBadge source={food.source} />
                    </li>
                  );
                })}
              </ul>
            </form>
          )}

          {mode === 'barcode' && (
            <BarcodeScanner onDetect={handleBarcodeDetected} onClose={() => setMode('search')} />
          )}

          {mode === 'label' && visionApiKey && (
            <LabelCaptureFlow
              visionApiKey={visionApiKey}
              onSaved={handleLabelSaved}
              onCancel={() => setMode('search')}
            />
          )}

          {mode === 'templates' && (
            <MealTemplates
              db={db}
              mode="apply"
              date={date}
              mealType={mealType}
              onApplied={(itemCount) => setAddedCount((c) => c + itemCount)}
            />
          )}

          {message && <p role="alert">{message}</p>}
        </>
      )}

      {addedCount > 0 && (
        <div className="card add-summary">
          <p>{addedCount} besin eklendi</p>
          <button type="button" onClick={onDone}>
            Bitti
          </button>
        </div>
      )}
    </div>
  );
}
