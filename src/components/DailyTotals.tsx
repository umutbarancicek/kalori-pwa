import { useEffect, useState } from 'react';
import type { AppDatabase } from '../db/database';
import { getDailyTotal, getEntriesGroupedByMeal, getHistory } from '../domain/diaryService';
import type { DailyGoal, DiaryEntry, MealType, Nutrients } from '../db/schema';
import { MacroRing } from './MacroRing';

interface DailyTotalsProps {
  db: AppDatabase;
  date: string;
  refreshKey: number;
  goal: DailyGoal | null;
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle Yemeği',
  dinner: 'Akşam Yemeği',
  snack: 'Atıştırmalık',
  other: 'Diğer',
};

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

export function DailyTotals({ db, date, refreshKey, goal }: DailyTotalsProps) {
  const [total, setTotal] = useState<Nutrients | null>(null);
  const [grouped, setGrouped] = useState<Record<MealType, DiaryEntry[]> | null>(null);
  const [history, setHistory] = useState<{ date: string; total: Nutrients }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [dailyTotal, byMeal, fullHistory] = await Promise.all([
        getDailyTotal(db, date),
        getEntriesGroupedByMeal(db, date),
        getHistory(db),
      ]);
      if (!cancelled) {
        setTotal(dailyTotal);
        setGrouped(byMeal);
        setHistory(fullHistory);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [db, date, refreshKey]);

  return (
    <div>
      <h2>Günlük Toplam ({date})</h2>
      {total && (
        <>
          <p className="kcal-total">
            {Math.round(total.kcal)}
            {goal ? ` / ${Math.round(goal.kcal)}` : ''} kcal
          </p>
          {goal && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'space-around', margin: '12px 0' }}>
              <MacroRing label="Protein" value={total.protein} goal={goal.protein} unit="g" color="#ef4444" />
              <MacroRing label="Yağ" value={total.fat} goal={goal.fat} unit="g" color="#f59e0b" />
              <MacroRing label="Karbon" value={total.carb} goal={goal.carb} unit="g" color="#3b82f6" />
              <MacroRing label="Lif" value={total.fiber} goal={goal.fiber} unit="g" color="#8b5c2e" />
            </div>
          )}
          {!goal && (
            <p>
              Protein {Math.round(total.protein)}g · Yağ {Math.round(total.fat)}g · Karbonhidrat{' '}
              {Math.round(total.carb)}g · Lif {Math.round(total.fiber)}g
            </p>
          )}
        </>
      )}

      {grouped &&
        MEAL_ORDER.filter((mealType) => grouped[mealType].length > 0).map((mealType) => {
          const entries = grouped[mealType];
          const mealKcal = entries.reduce((sum, e) => sum + e.snapshotNutrients.kcal, 0);
          return (
            <div key={mealType} style={{ marginTop: 12 }}>
              <h3>
                {MEAL_LABELS[mealType]} — {Math.round(mealKcal)} kcal
              </h3>
              <ul>
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <span>
                      {entry.quantityGrams} g — {Math.round(entry.snapshotNutrients.kcal)} kcal
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

      <h3>Geçmiş</h3>
      <ul>
        {history.map((day) => (
          <li key={day.date}>
            {day.date}: {Math.round(day.total.kcal)} kcal
          </li>
        ))}
      </ul>
    </div>
  );
}
