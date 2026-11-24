import { useState } from 'react';
import type { AppDatabase } from '../db/database';
import type { UserProfile } from '../db/schema';
import { AboutScreen } from './AboutScreen';
import { ExportImport } from './ExportImport';
import { MealTemplates } from './MealTemplates';
import { ProfileSettings } from './ProfileSettings';
import { WeightTracker } from './WeightTracker';

interface SettingsScreenProps {
  db: AppDatabase;
  visionApiKey: string | null;
  onSaved: (key: string) => void;
  profile: UserProfile | null;
  onProfileSaved: (profile: UserProfile) => void;
}

export function SettingsScreen({
  db,
  visionApiKey,
  onSaved,
  profile,
  onProfileSaved,
}: SettingsScreenProps) {
  const [key, setKey] = useState(visionApiKey ?? '');
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await db.settings.put({ key: 'visionApiKey', value: key });
    setSaved(true);
    onSaved(key);
  }

  return (
    <div>
      <h2>Ayarlar</h2>

      <div className="card">
        <ProfileSettings db={db} profile={profile} onSaved={onProfileSaved} />
      </div>

      <div className="card">
        <WeightTracker db={db} />
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <h3>Etiket Fotoğrafı (Vision API)</h3>
          <label>
            Google Cloud Vision API anahtarı
            <input
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <button type="submit">Kaydet</button>
          {saved && <p role="status">Kaydedildi.</p>}
        </form>
      </div>

      <div className="card">
        <MealTemplates db={db} mode="manage" />
      </div>

      <div className="card">
        <ExportImport db={db} />
      </div>

      <div className="card">
        <AboutScreen />
      </div>
    </div>
  );
}
