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
  const [pendingOverwrite, setPendingOverwrite] = useState<{ text: string; fileName: string } | null>(
    null,
  );

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

  async function runImport(text: string, importMode: 'overwrite' | 'merge') {
    try {
      await importAllData(db, text, importMode);
      setStatus(
        `İçe aktarma tamamlandı (${importMode === 'overwrite' ? 'üzerine yazıldı' : 'birleştirildi'}).`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'İçe aktarma başarısız oldu.');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const text = await file.text();
    if (mode === 'overwrite') {
      // Destructive — hold for an explicit confirmation instead of running it
      // the moment a file is picked.
      setStatus(null);
      setPendingOverwrite({ text, fileName: file.name });
      return;
    }
    await runImport(text, 'merge');
  }

  async function handleConfirmOverwrite() {
    if (!pendingOverwrite) return;
    await runImport(pendingOverwrite.text, 'overwrite');
    setPendingOverwrite(null);
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

      {pendingOverwrite ? (
        <div role="alert">
          <p>
            <strong>{pendingOverwrite.fileName}</strong> dosyasıyla <strong>üzerine yazılacak</strong>.
            Mevcut tüm besin/günlük/şablon/ayar verilerin kalıcı olarak silinip dosyadakiyle
            değiştirilecek. Bu geri alınamaz.
          </p>
          <div className="row-form">
            <button type="button" className="secondary" onClick={handleConfirmOverwrite}>
              Evet, üzerine yaz
            </button>
            <button type="button" onClick={() => setPendingOverwrite(null)}>
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <label>
          JSON dosyası seç
          <input type="file" accept="application/json" onChange={handleImport} />
        </label>
      )}
      {status && <p role="status">{status}</p>}
    </div>
  );
}
