import { useEffect, useState } from 'react';
import { AppDatabase } from './db/database';
import { upsertFood } from './db/foodRepository';
import type { Food } from './db/schema';
import { AboutScreen } from './components/AboutScreen';
import { AddEntryForm } from './components/AddEntryForm';
import { BarcodeScanner } from './components/BarcodeScanner';
import { DailyTotals } from './components/DailyTotals';
import { ExportImport } from './components/ExportImport';
import { FoodSearch } from './components/FoodSearch';
import { FreeTextQuickAdd } from './components/FreeTextQuickAdd';
import { LabelCaptureFlow } from './components/LabelCaptureFlow';
import { MealTemplates } from './components/MealTemplates';
import { SettingsScreen } from './components/SettingsScreen';
import { lookupBarcode } from './domain/barcodeLookup';
import { seedBulkDataIfNeeded } from './db/seedBulkData';
import { fetchBulkFoodData, fetchGenericFoodData } from './lib/bulkDataSource';
import { fetchProductFromOff } from './lib/offApi';
import { getLocalDateString } from './lib/localDate';

const db = new AppDatabase();

type View = 'home' | 'settings' | 'about';

function App() {
  const [view, setView] = useState<View>('home');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [barcodeMessage, setBarcodeMessage] = useState<string | null>(null);
  const [capturingLabel, setCapturingLabel] = useState(false);
  const [visionApiKey, setVisionApiKey] = useState<string | null>(null);
  const date = getLocalDateString();

  useEffect(() => {
    db.settings.get('visionApiKey').then((entry) => {
      if (entry) setVisionApiKey(entry.value as string);
    });
    seedBulkDataIfNeeded(db, fetchBulkFoodData, fetchGenericFoodData);
  }, []);

  function handleAdded() {
    setSelectedFood(null);
    setRefreshKey((k) => k + 1);
  }

  async function handleBarcodeDetected(barcode: string) {
    setScanning(false);
    setBarcodeMessage(null);
    try {
      const result = await lookupBarcode(db, barcode, fetchProductFromOff);
      if (!result) {
        setBarcodeMessage(
          `"${barcode}" barkodu bulunamadı. Etiket fotoğrafı çekebilir veya elle ekleyebilirsin.`,
        );
        return;
      }
      setSelectedFood(result.food);
    } catch {
      setBarcodeMessage(
        `"${barcode}" için arama yapılamadı. Etiket fotoğrafı çekebilir veya elle ekleyebilirsin.`,
      );
    }
  }

  async function handleLabelSaved(food: Food) {
    await upsertFood(db, food);
    setCapturingLabel(false);
    setSelectedFood(food);
  }

  return (
    <div>
      <h1>Kalori Takip</h1>
      <nav>
        <button type="button" onClick={() => setView('home')}>
          Ana Sayfa
        </button>
        <button type="button" onClick={() => setView('settings')}>
          Ayarlar
        </button>
        <button type="button" onClick={() => setView('about')}>
          Hakkında
        </button>
      </nav>

      {view === 'settings' && (
        <SettingsScreen db={db} visionApiKey={visionApiKey} onSaved={setVisionApiKey} />
      )}
      {view === 'about' && <AboutScreen />}

      {view === 'home' && (
        <>
          <FreeTextQuickAdd db={db} date={date} onAdded={handleAdded} />
          <FoodSearch db={db} onSelect={setSelectedFood} />
          <MealTemplates db={db} date={date} onApplied={handleAdded} />
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
          <ExportImport db={db} />
        </>
      )}
    </div>
  );
}

export default App;
