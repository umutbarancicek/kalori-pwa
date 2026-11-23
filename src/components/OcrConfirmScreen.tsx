import { useState } from 'react';
import type { Food, Nutrients } from '../db/schema';
import type { ExtractedNutrients } from '../domain/labelExtractor';

const NUTRIENT_LABELS: Record<keyof Nutrients, string> = {
  kcal: 'Enerji (kcal)',
  protein: 'Protein (g)',
  carb: 'Karbonhidrat (g)',
  sugar: 'Şeker (g)',
  fat: 'Yağ (g)',
  satFat: 'Doymuş Yağ (g)',
  fiber: 'Lif (g)',
  salt: 'Tuz (g)',
};

const NUTRIENT_KEYS = Object.keys(NUTRIENT_LABELS) as (keyof Nutrients)[];

type Column = '100g' | 'serving';

function initialValues(extracted: ExtractedNutrients, column: Column): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of NUTRIENT_KEYS) {
    const value = column === '100g' ? extracted[key]?.per100g : extracted[key]?.perServing;
    values[key] = value !== undefined ? String(value) : '';
  }
  return values;
}

interface OcrConfirmScreenProps {
  extracted: ExtractedNutrients;
  onConfirm: (food: Food) => void;
  onCancel: () => void;
}

export function OcrConfirmScreen({ extracted, onConfirm, onCancel }: OcrConfirmScreenProps) {
  const [column, setColumn] = useState<Column>('100g');
  const [servingGrams, setServingGrams] = useState(100);
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(extracted, '100g'),
  );
  const [name, setName] = useState('');

  function handleColumnChange(next: Column) {
    setColumn(next);
    setValues(initialValues(extracted, next));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const scale = column === 'serving' ? 100 / servingGrams : 1;
    const nutrientsPer100g = NUTRIENT_KEYS.reduce((acc, key) => {
      const raw = Number(values[key].replace(',', '.')) || 0;
      acc[key] = raw * scale;
      return acc;
    }, {} as Nutrients);

    onConfirm({
      id: crypto.randomUUID(),
      name,
      nutrientsPer100g,
      source: 'user',
      usageCount: 0,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Ürün adı
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>

      <fieldset>
        <legend>Girdiğin değerler hangi sütuna ait?</legend>
        <label>
          <input
            type="radio"
            name="column"
            checked={column === '100g'}
            onChange={() => handleColumnChange('100g')}
          />
          100 g
        </label>
        <label>
          <input
            type="radio"
            name="column"
            checked={column === 'serving'}
            onChange={() => handleColumnChange('serving')}
          />
          1 porsiyon
        </label>
        {column === 'serving' && (
          <label>
            Porsiyon miktarı (g)
            <input
              type="number"
              value={servingGrams}
              min={1}
              onChange={(e) => setServingGrams(Number(e.target.value))}
            />
          </label>
        )}
      </fieldset>

      {NUTRIENT_KEYS.map((key) => (
        <label key={key}>
          {NUTRIENT_LABELS[key]}
          <input
            type="text"
            value={values[key]}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
          />
        </label>
      ))}

      <button type="submit">Kaydet</button>
      <button type="button" onClick={onCancel}>
        Vazgeç
      </button>
    </form>
  );
}
