import { useEffect, useState } from 'react';
import type { AppDatabase } from '../db/database';
import type { MealTemplate } from '../db/schema';
import { applyMealTemplate, saveMealTemplateFromDiary } from '../domain/mealTemplateService';

interface MealTemplatesProps {
  db: AppDatabase;
  date: string;
  onApplied: () => void;
}

export function MealTemplates({ db, date, onApplied }: MealTemplatesProps) {
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
    await applyMealTemplate(db, templateId, date);
    onApplied();
  }

  async function handleSaveToday(e: React.FormEvent) {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    await saveMealTemplateFromDiary(db, newTemplateName.trim(), date);
    setNewTemplateName('');
    await refresh();
  }

  return (
    <div>
      <h2>Öğün Şablonları</h2>
      {templates.length > 0 && (
        <ul>
          {templates.map((template) => (
            <li key={template.id}>
              <button type="button" onClick={() => handleApply(template.id)}>
                {template.name} ekle
              </button>
            </li>
          ))}
        </ul>
      )}
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
    </div>
  );
}
