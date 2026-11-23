import { useEffect, useState } from 'react';
import './App.css';
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
    <div className="app-shell">
      <h1>Kalori Takip</h1>
      <nav className="tabs">
        <button
          type="button"
          className={view === 'home' ? 'active' : ''}
          onClick={() => setView('home')}
        >
          Ana Sayfa
        </button>
        <button
          type="button"
          className={view === 'settings' ? 'active' : ''}
          onClick={() => setView('settings')}
        >
          Ayarlar
        </button>
        <button
          type="button"
          className={view === 'about' ? 'active' : ''}
          onClick={() => setView('about')}
        >
          Hakkında
        </button>
      </nav>

      {view === 'settings' && (
        <div className="card">
          <SettingsScreen db={db} visionApiKey={visionApiKey} onSaved={setVisionApiKey} />
        </div>
      )}
      {view === 'about' && (
        <div className="card">
          <AboutScreen />
        </div>
      )}

      {view === 'home' && (
        <>
          <div className="card">
            <h2>Hızlı Ekle</h2>
            <FreeTextQuickAdd db={db} date={date} onAdded={handleAdded} />
          </div>

          <div className="card">
            <h2>Besin Ara</h2>
            <FoodSearch db={db} onSelect={setSelectedFood} />
          </div>

          <div className="card">
            <MealTemplates db={db} date={date} onApplied={handleAdded} />
          </div>

          <div className="card">
            <h2>Barkod / Etiket</h2>
            <button type="button" className="secondary" onClick={() => setScanning(true)}>
              Barkod Tara
            </button>{' '}
            {visionApiKey && (
              <button
                type="button"
                className="secondary"
                onClick={() => setCapturingLabel(true)}
              >
                Etiket Fotoğrafından Ekle
              </button>
            )}
            {scanning && (
              <BarcodeScanner
                onDetect={handleBarcodeDetected}
                onClose={() => setScanning(false)}
              />
            )}
            {barcodeMessage && <p role="alert">{barcodeMessage}</p>}
            {!visionApiKey && (
              <p>Etiket fotoğrafından ekleme için Ayarlar'dan Vision API anahtarını gir.</p>
            )}
            {capturingLabel && visionApiKey && (
              <LabelCaptureFlow
                visionApiKey={visionApiKey}
                onSaved={handleLabelSaved}
                onCancel={() => setCapturingLabel(false)}
              />
            )}
          </div>

          {selectedFood && (
            <div className="card">
              <AddEntryForm db={db} food={selectedFood} date={date} onAdded={handleAdded} />
            </div>
          )}

          <div className="card">
            <DailyTotals db={db} date={date} refreshKey={refreshKey} />
          </div>

          <div className="card">
            <ExportImport db={db} />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
