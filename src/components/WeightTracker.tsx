import { useEffect, useState } from 'react';
import type { AppDatabase } from '../db/database';
import type { WeightLog } from '../db/schema';
import { getLocalDateString } from '../lib/localDate';
import { getWeightHistory, setWeightLog } from '../domain/trackingService';

interface WeightTrackerProps {
  db: AppDatabase;
}

export function WeightTracker({ db }: WeightTrackerProps) {
  const [history, setHistory] = useState<WeightLog[]>([]);
  const [weight, setWeight] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getWeightHistory(db).then(setHistory);
  }, [db]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(weight);
    if (!value || value <= 0) return;
    await setWeightLog(db, value, getLocalDateString());
    setHistory(await getWeightHistory(db));
    setSaved(true);
    setWeight('');
  }

  const latest = history[history.length - 1];

  return (
    <div>
      <h3>Kilo Takibi</h3>
      {latest && (
        <p>
          Son kayıt: {latest.weightKg} kg ({latest.date})
        </p>
      )}
      <form onSubmit={handleSubmit} className="row-form">
        <input
          type="number"
          value={weight}
          min={1}
          step="any"
          placeholder="kg"
          aria-label="Kilo"
          onChange={(e) => {
            setWeight(e.target.value);
            setSaved(false);
          }}
        />
        <button type="submit">Kaydet</button>
      </form>
      {saved && <p role="status">Kaydedildi.</p>}
      {history.length > 1 && (
        <ul>
          {history
            .slice(-7)
            .reverse()
            .map((log) => (
              <li key={log.id}>
                {log.date}: {log.weightKg} kg
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
