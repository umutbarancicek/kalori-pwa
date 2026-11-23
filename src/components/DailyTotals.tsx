import { useEffect, useState } from 'react';
import type { AppDatabase } from '../db/database';
import { getDailyTotal, getHistory } from '../domain/diaryService';
import type { Nutrients } from '../db/schema';

interface DailyTotalsProps {
  db: AppDatabase;
  date: string;
  refreshKey: number;
}

export function DailyTotals({ db, date, refreshKey }: DailyTotalsProps) {
  const [total, setTotal] = useState<Nutrients | null>(null);
  const [history, setHistory] = useState<{ date: string; total: Nutrients }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [dailyTotal, fullHistory] = await Promise.all([
        getDailyTotal(db, date),
        getHistory(db),
      ]);
      if (!cancelled) {
        setTotal(dailyTotal);
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
      {total && <p>{Math.round(total.kcal)} kcal</p>}
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
