import { useState } from 'react';
import type { AppDatabase } from '../db/database';
import type { UserProfile } from '../db/schema';
import { ProfileSettings } from './ProfileSettings';

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
      <ProfileSettings db={db} profile={profile} onSaved={onProfileSaved} />
      <form onSubmit={handleSubmit}>
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
  );
}
