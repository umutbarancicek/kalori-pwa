import { useState } from 'react';
import type { AppDatabase } from '../db/database';
import type { ActivityLevel, Gender, UserProfile, WeightGoal } from '../db/schema';

const PROFILE_SETTINGS_KEY = 'userProfile';

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Hareketsiz (masa başı iş, egzersiz yok)',
  light: 'Az hareketli (haftada 1-3 gün hafif egzersiz)',
  moderate: 'Orta hareketli (haftada 3-5 gün egzersiz)',
  active: 'Hareketli (haftada 6-7 gün egzersiz)',
  very_active: 'Çok hareketli (günde 2x egzersiz / fiziksel iş)',
};

const GOAL_LABELS: Record<WeightGoal, string> = {
  lose: 'Kilo ver',
  maintain: 'Kiloyu koru',
  gain: 'Kilo al',
};

interface ProfileSettingsProps {
  db: AppDatabase;
  profile: UserProfile | null;
  onSaved: (profile: UserProfile) => void;
}

const DEFAULT_PROFILE: UserProfile = {
  age: 30,
  weightKg: 70,
  heightCm: 170,
  gender: 'male',
  activityLevel: 'sedentary',
  goal: 'maintain',
};

export { PROFILE_SETTINGS_KEY };

export function ProfileSettings({ db, profile, onSaved }: ProfileSettingsProps) {
  const [form, setForm] = useState<UserProfile>(profile ?? DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await db.settings.put({ key: PROFILE_SETTINGS_KEY, value: form });
    setSaved(true);
    onSaved(form);
  }

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Profil ve Günlük Hedef</h3>
      <label>
        Yaş
        <input
          type="number"
          min={10}
          max={100}
          value={form.age}
          onChange={(e) => update('age', Number(e.target.value))}
        />
      </label>
      <label>
        Kilo (kg)
        <input
          type="number"
          min={30}
          max={300}
          value={form.weightKg}
          onChange={(e) => update('weightKg', Number(e.target.value))}
        />
      </label>
      <label>
        Boy (cm)
        <input
          type="number"
          min={100}
          max={250}
          value={form.heightCm}
          onChange={(e) => update('heightCm', Number(e.target.value))}
        />
      </label>

      <fieldset>
        <legend>Cinsiyet</legend>
        <label>
          <input
            type="radio"
            name="gender"
            checked={form.gender === 'male'}
            onChange={() => update('gender', 'male' as Gender)}
          />
          Erkek
        </label>
        <label>
          <input
            type="radio"
            name="gender"
            checked={form.gender === 'female'}
            onChange={() => update('gender', 'female' as Gender)}
          />
          Kadın
        </label>
      </fieldset>

      <label>
        Aktivite seviyesi
        <select
          value={form.activityLevel}
          onChange={(e) => update('activityLevel', e.target.value as ActivityLevel)}
        >
          {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Hedef
        <select
          value={form.goal}
          onChange={(e) => update('goal', e.target.value as WeightGoal)}
        >
          {Object.entries(GOAL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <button type="submit">Hedefi Hesapla ve Kaydet</button>
      {saved && <p role="status">Kaydedildi.</p>}
    </form>
  );
}
