import { useState } from 'react';
import type { AppDatabase } from '../db/database';
import { exportAllData, importAllData } from '../domain/exportImportService';
import { getLocalDateString } from '../lib/localDate';

interface ExportImportProps {
  db: AppDatabase;
}

export function ExportImport({ db }: ExportImportProps) {
  const [mode, setMode] = useState<'overwrite' | 'merge'>('merge');
  const [status, setStatus] = useState<string | null>(null);

  async function handleExport() {
    const json = await exportAllData(db);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalori-takip-${getLocalDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importAllData(db, text, mode);
      setStatus(
        `İçe aktarma tamamlandı (${mode === 'overwrite' ? 'üzerine yazıldı' : 'birleştirildi'}).`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'İçe aktarma başarısız oldu.');
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div>
      <h2>Dışa / İçe Aktarma</h2>
      <button type="button" onClick={handleExport}>
        JSON olarak dışa aktar
      </button>

      <fieldset>
        <legend>İçe aktarma modu</legend>
        <label>
          <input
            type="radio"
            name="import-mode"
            checked={mode === 'merge'}
            onChange={() => setMode('merge')}
          />
          Birleştir (çakışan kayıtlarda içe aktarılan veri öncelikli)
        </label>
        <label>
          <input
            type="radio"
            name="import-mode"
            checked={mode === 'overwrite'}
            onChange={() => setMode('overwrite')}
          />
          Üzerine yaz (mevcut tüm veriler silinir)
        </label>
      </fieldset>

      <label>
        JSON dosyası seç
        <input type="file" accept="application/json" onChange={handleImport} />
      </label>
      {status && <p role="status">{status}</p>}
    </div>
  );
}
