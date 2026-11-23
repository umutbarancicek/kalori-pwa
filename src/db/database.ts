import Dexie, { type Table } from 'dexie';
import type { DiaryEntry, Food, MealTemplate, SettingsEntry } from './schema';

export class AppDatabase extends Dexie {
  foods!: Table<Food, string>;
  diaryEntries!: Table<DiaryEntry, string>;
  mealTemplates!: Table<MealTemplate, string>;
  settings!: Table<SettingsEntry, string>;

  constructor() {
    super('kalori-pwa');
    this.version(1).stores({
      foods: 'id, barcode, name',
      diaryEntries: 'id, date',
      mealTemplates: 'id, name',
      settings: 'key',
    });
  }
}
