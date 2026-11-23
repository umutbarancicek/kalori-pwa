import type { AppDatabase } from '../db/database';
import type { DiaryEntry, Food, MealTemplate, SettingsEntry } from '../db/schema';

interface ExportedData {
  foods: Food[];
  diaryEntries: DiaryEntry[];
  mealTemplates: MealTemplate[];
  settings: SettingsEntry[];
}

export async function exportAllData(db: AppDatabase): Promise<string> {
  const data: ExportedData = {
    foods: await db.foods.toArray(),
    diaryEntries: await db.diaryEntries.toArray(),
    mealTemplates: await db.mealTemplates.toArray(),
    settings: await db.settings.toArray(),
  };
  return JSON.stringify(data);
}

function isValidExportedData(value: unknown): value is ExportedData {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.foods) &&
    Array.isArray(candidate.diaryEntries) &&
    Array.isArray(candidate.mealTemplates) &&
    Array.isArray(candidate.settings)
  );
}

export async function importAllData(
  db: AppDatabase,
  json: string,
  mode: 'overwrite' | 'merge',
): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Geçersiz dosya: JSON olarak okunamadı.');
  }
  if (!isValidExportedData(parsed)) {
    throw new Error(
      'Geçersiz dosya: beklenen foods/diaryEntries/mealTemplates/settings alanları eksik.',
    );
  }
  const data = parsed;

  await db.transaction(
    'rw',
    [db.foods, db.diaryEntries, db.mealTemplates, db.settings],
    async () => {
      if (mode === 'overwrite') {
        await Promise.all([
          db.foods.clear(),
          db.diaryEntries.clear(),
          db.mealTemplates.clear(),
          db.settings.clear(),
        ]);
      }
      await db.foods.bulkPut(data.foods);
      await db.diaryEntries.bulkPut(data.diaryEntries);
      await db.mealTemplates.bulkPut(data.mealTemplates);
      await db.settings.bulkPut(data.settings);
    },
  );
}
