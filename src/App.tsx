import { useEffect, useState } from 'react';
import { AppDatabase } from './db/database';
import { upsertFood } from './db/foodRepository';
import type { Food } from './db/schema';
import { AddEntryForm } from './components/AddEntryForm';
import { BarcodeScanner } from './components/BarcodeScanner';
import { DailyTotals } from './components/DailyTotals';
import { FoodSearch } from './components/FoodSearch';
import { FreeTextQuickAdd } from './components/FreeTextQuickAdd';
import { LabelCaptureFlow } from './components/LabelCaptureFlow';
import { lookupBarcode } from './domain/barcodeLookup';
import { fetchProductFromOff } from './lib/offApi';

const db = new AppDatabase();

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function App() {
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [barcodeMessage, setBarcodeMessage] = useState<string | null>(null);
  const [capturingLabel, setCapturingLabel] = useState(false);
  const [visionApiKey, setVisionApiKey] = useState<string | null>(null);
  const date = getToday();

  useEffect(() => {
    db.settings.get('visionApiKey').then((entry) => {
      if (entry) setVisionApiKey(entry.value as string);
    });
  }, []);

  function handleAdded() {
    setSelectedFood(null);
    setRefreshKey((k) => k + 1);
  }

  async function handleBarcodeDetected(barcode: string) {
    setScanning(false);
    setBarcodeMessage(null);
    const result = await lookupBarcode(db, barcode, fetchProductFromOff);
    if (!result) {
      setBarcodeMessage(
        `"${barcode}" barkodu bulunamadı. Etiket fotoğrafı çekebilir veya elle ekleyebilirsin.`,
      );
      return;
    }
    setSelectedFood(result.food);
  }

  async function handleLabelSaved(food: Food) {
    await upsertFood(db, food);
    setCapturingLabel(false);
    setSelectedFood(food);
  }

  return (
    <div>
      <h1>Kalori Takip</h1>
      <FreeTextQuickAdd db={db} date={date} onAdded={handleAdded} />
      <FoodSearch db={db} onSelect={setSelectedFood} />
      <button type="button" onClick={() => setScanning(true)}>
        Barkod Tara
      </button>
      {scanning && (
        <BarcodeScanner onDetect={handleBarcodeDetected} onClose={() => setScanning(false)} />
      )}
      {barcodeMessage && <p role="alert">{barcodeMessage}</p>}

      {visionApiKey ? (
        <button type="button" onClick={() => setCapturingLabel(true)}>
          Etiket Fotoğrafından Ekle
        </button>
      ) : (
        <p>Etiket fotoğrafından ekleme için Ayarlar'dan Vision API anahtarını gir.</p>
      )}
      {capturingLabel && visionApiKey && (
        <LabelCaptureFlow
          visionApiKey={visionApiKey}
          onSaved={handleLabelSaved}
          onCancel={() => setCapturingLabel(false)}
        />
      )}

      {selectedFood && (
        <AddEntryForm db={db} food={selectedFood} date={date} onAdded={handleAdded} />
      )}
      <DailyTotals db={db} date={date} refreshKey={refreshKey} />
    </div>
  );
}

export default App;
