import { useState } from 'react';
import type { Food } from '../db/schema';
import { extractNutrientsFromLabelText, type ExtractedNutrients } from '../domain/labelExtractor';
import { callVisionTextDetection } from '../lib/visionApi';
import { OcrConfirmScreen } from './OcrConfirmScreen';

interface LabelCaptureFlowProps {
  visionApiKey: string;
  onSaved: (food: Food) => void;
  onCancel: () => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function LabelCaptureFlow({ visionApiKey, onSaved, onCancel }: LabelCaptureFlowProps) {
  const [extracted, setExtracted] = useState<ExtractedNutrients | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const text = await callVisionTextDetection(base64, visionApiKey);
      setExtracted(extractNutrientsFromLabelText(text));
    } catch {
      setError('Etiket okunamadı. Fotoğrafı tekrar çekmeyi deneyebilirsin.');
    } finally {
      setLoading(false);
    }
  }

  if (extracted) {
    return (
      <OcrConfirmScreen extracted={extracted} onConfirm={onSaved} onCancel={onCancel} />
    );
  }

  return (
    <div>
      <label>
        Etiket fotoğrafı çek veya seç
        <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
      </label>
      {loading && <p>Okunuyor...</p>}
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={onCancel}>
        Vazgeç
      </button>
    </div>
  );
}
