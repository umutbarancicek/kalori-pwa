import { useEffect, useState } from 'react';
import type { AppDatabase } from '../db/database';
import type { MealTemplate, MealType } from '../db/schema';
import {
  applyMealTemplate,
  deleteMealTemplate,
  saveMealTemplateFromDiary,
} from '../domain/mealTemplateService';
import { getLocalDateString } from '../lib/localDate';

interface MealTemplatesProps {
  db: AppDatabase;
  /** 'manage': create/delete only (Ayarlar). 'apply': pick one to add to today's meal (Ekle). */
  mode: 'manage' | 'apply';
  date?: string;
  mealType?: MealType;
  onApplied?: (itemCount: number) => void;
}

export function MealTemplates({ db, mode, date, mealType, onApplied }: MealTemplatesProps) {
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');

  async function refresh() {
    setTemplates(await db.mealTemplates.toArray());
  }

  useEffect(() => {
    let cancelled = false;
    db.mealTemplates.toArray().then((all) => {
      if (!cancelled) setTemplates(all);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  async function handleApply(templateId: string) {
    const entries = await applyMealTemplate(db, templateId, date ?? getLocalDateString(), mealType);
    onApplied?.(entries.length);
  }

  async function handleDelete(templateId: string) {
    await deleteMealTemplate(db, templateId);
    await refresh();
  }

  async function handleSaveToday(e: React.FormEvent) {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    await saveMealTemplateFromDiary(db, newTemplateName.trim(), getLocalDateString());
    setNewTemplateName('');
    await refresh();
  }

  return (
    <div>
      <h2>Öğün Şablonlarım</h2>
      {templates.length > 0 && (
        <ul>
          {templates.map((template) => (
            <li key={template.id}>
              <button type="button" onClick={() => handleApply(template.id)}>
                {template.name} ekle
              </button>
              {mode === 'manage' && (
                <button type="button" className="secondary" onClick={() => handleDelete(template.id)}>
                  Sil
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {mode === 'manage' && (
        <form onSubmit={handleSaveToday}>
          <label>
            Bugünü şablon olarak kaydet
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Şablon adı (örn. Kahvaltı)"
            />
          </label>
          <button type="submit">Kaydet</button>
        </form>
      )}
    </div>
  );
}
