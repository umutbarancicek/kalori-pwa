import { useEffect, useState } from 'react';
import type { AppDatabase } from '../db/database';
import type { MealTemplate } from '../db/schema';
import { applyMealTemplate } from '../domain/mealTemplateService';

interface MealTemplatesProps {
  db: AppDatabase;
  date: string;
  onApplied: () => void;
}

export function MealTemplates({ db, date, onApplied }: MealTemplatesProps) {
  const [templates, setTemplates] = useState<MealTemplate[]>([]);

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

  if (templates.length === 0) {
    return null;
  }

  return (
    <div>
      <h2>Öğün Şablonları</h2>
      <ul>
        {templates.map((template) => (
          <li key={template.id}>
            <button type="button" onClick={() => handleApply(template.id)}>
              {template.name} ekle
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
