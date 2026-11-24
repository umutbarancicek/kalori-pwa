import { useEffect, useRef, useState } from 'react';
import type { AppDatabase } from '../db/database';
import type { DailyGoal, DiaryEntry, MealType, Nutrients } from '../db/schema';
import {
  deleteDiaryEntry,
  getDailyTotal,
  getEntriesGroupedByMeal,
  getHistory,
  restoreDiaryEntry,
  updateDiaryEntryQuantity,
} from '../domain/diaryService';
import { addDaysToDateString } from '../lib/localDate';
import { MacroRing } from './MacroRing';
import { MEAL_TYPE_LABELS } from './MealTypeSelect';
import { SwipeToDeleteRow } from './SwipeToDeleteRow';

interface DiaryScreenProps {
  db: AppDatabase;
  date: string;
  onDateChange: (date: string) => void;
  refreshKey: number;
  onRefresh: () => void;
  goal: DailyGoal | null;
  onAddToMeal: (mealType: MealType) => void;
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
const UNDO_WINDOW_MS = 5000;

function EntryRow({
  entry,
  onDelete,
  onUpdateQuantity,
}: {
  entry: DiaryEntry;
  onDelete: () => void;
  onUpdateQuantity: (quantityGrams: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftQuantity, setDraftQuantity] = useState(entry.quantityGrams);

  if (editing) {
    return (
      <li>
        <form
          className="row-form"
          onSubmit={(e) => {
            e.preventDefault();
            onUpdateQuantity(draftQuantity);
            setEditing(false);
          }}
        >
          <input
            type="number"
            value={draftQuantity}
            min={0.1}
            step="any"
            autoFocus
            onChange={(e) => setDraftQuantity(Number(e.target.value))}
          />
          <button type="submit">Kaydet</button>
          <button type="button" className="secondary" onClick={() => setEditing(false)}>
            Vazgeç
          </button>
        </form>
      </li>
    );
  }

  return (
    <li>
      <SwipeToDeleteRow onDelete={onDelete} onTap={() => setEditing(true)}>
        <span>
          {entry.label
            ? `${entry.label} — ${Math.round(entry.snapshotNutrients.kcal)} kcal`
            : `${entry.quantityGrams} g — ${Math.round(entry.snapshotNutrients.kcal)} kcal`}
        </span>
      </SwipeToDeleteRow>
    </li>
  );
}

export function DiaryScreen({
  db,
  date,
  onDateChange,
  refreshKey,
  onRefresh,
  goal,
  onAddToMeal,
}: DiaryScreenProps) {
  const [total, setTotal] = useState<Nutrients | null>(null);
  const [grouped, setGrouped] = useState<Record<MealType, DiaryEntry[]> | null>(null);
  const [history, setHistory] = useState<{ date: string; total: Nutrients }[]>([]);
  const [pendingUndo, setPendingUndo] = useState<DiaryEntry | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setHistory(fullHistory.slice(-7));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [db, date, refreshKey]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  async function handleDelete(entryId: string) {
    const deleted = await deleteDiaryEntry(db, entryId);
    setPendingUndo(deleted);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setPendingUndo(null), UNDO_WINDOW_MS);
    onRefresh();
  }

  async function handleUndo() {
    if (!pendingUndo) return;
    await restoreDiaryEntry(db, pendingUndo);
    setPendingUndo(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    onRefresh();
  }

  async function handleUpdateQuantity(entryId: string, quantityGrams: number) {
    await updateDiaryEntryQuantity(db, entryId, quantityGrams);
    onRefresh();
  }

  return (
    <div>
      <div className="day-nav">
        <button type="button" onClick={() => onDateChange(addDaysToDateString(date, -1))}>
          ‹
        </button>
        <span>{date}</span>
        <button type="button" onClick={() => onDateChange(addDaysToDateString(date, 1))}>
          ›
        </button>
      </div>

      {total && (
        <>
          <p className="kcal-total">
            {Math.round(total.kcal)}
            {goal ? ` / ${Math.round(goal.kcal)}` : ''} kcal
          </p>
          {goal && (
            <div
              className="progress-bar"
              role="progressbar"
              aria-valuenow={Math.round(total.kcal)}
              aria-valuemax={Math.round(goal.kcal)}
            >
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min((total.kcal / goal.kcal) * 100, 100)}%` }}
              />
            </div>
          )}
          {goal && (
            <div
              style={{ display: 'flex', gap: 12, justifyContent: 'space-around', margin: '12px 0' }}
            >
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

      {pendingUndo && (
        <p role="status" className="undo-toast">
          Kayıt silindi.{' '}
          <button type="button" onClick={handleUndo}>
            Geri Al
          </button>
        </p>
      )}

      {grouped &&
        MEAL_ORDER.filter((mealType) => mealType !== 'other' || grouped.other.length > 0).map(
          (mealType) => {
            const entries = grouped[mealType];
            const mealKcal = entries.reduce((sum, e) => sum + e.snapshotNutrients.kcal, 0);
            return (
              <div key={mealType} className="meal-card">
                <div className="meal-card-header">
                  <h3>
                    {MEAL_TYPE_LABELS[mealType]} — {Math.round(mealKcal)} kcal
                  </h3>
                  {mealType !== 'other' && (
                    <button
                      type="button"
                      className="round-add"
                      onClick={() => onAddToMeal(mealType)}
                      aria-label={`${MEAL_TYPE_LABELS[mealType]} ekle`}
                    >
                      +
                    </button>
                  )}
                </div>
                {entries.length > 0 && (
                  <ul>
                    {entries.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        onDelete={() => handleDelete(entry.id)}
                        onUpdateQuantity={(q) => handleUpdateQuantity(entry.id, q)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          },
        )}

      <h3>Son 7 gün</h3>
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
