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

export async function importAllData(
  db: AppDatabase,
  json: string,
  mode: 'overwrite' | 'merge',
): Promise<void> {
  const data: ExportedData = JSON.parse(json);

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
