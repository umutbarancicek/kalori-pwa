import Dexie, { type Table } from 'dexie';
import type { DiaryEntry, Food, MealTemplate, SettingsEntry, WaterLog, WeightLog } from './schema';

export class AppDatabase extends Dexie {
  foods!: Table<Food, string>;
  diaryEntries!: Table<DiaryEntry, string>;
  mealTemplates!: Table<MealTemplate, string>;
  settings!: Table<SettingsEntry, string>;
  waterLogs!: Table<WaterLog, string>;
  weightLogs!: Table<WeightLog, string>;

  constructor() {
    super('kalori-pwa');
    this.version(1).stores({
      foods: 'id, barcode, name',
      diaryEntries: 'id, date',
      mealTemplates: 'id, name',
      settings: 'key',
    });
    // Additive only: existing tables/indexes above are untouched, this just adds two new ones.
    this.version(2).stores({
      waterLogs: 'id, date',
      weightLogs: 'id, date',
    });
  }
}
