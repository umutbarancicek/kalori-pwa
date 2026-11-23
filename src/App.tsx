import { useState } from 'react';
import { AppDatabase } from './db/database';
import type { Food } from './db/schema';
import { AddEntryForm } from './components/AddEntryForm';
import { BarcodeScanner } from './components/BarcodeScanner';
import { DailyTotals } from './components/DailyTotals';
import { FoodSearch } from './components/FoodSearch';
import { FreeTextQuickAdd } from './components/FreeTextQuickAdd';
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
  const date = getToday();

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
      {selectedFood && (
        <AddEntryForm db={db} food={selectedFood} date={date} onAdded={handleAdded} />
      )}
      <DailyTotals db={db} date={date} refreshKey={refreshKey} />
    </div>
  );
}

export default App;
