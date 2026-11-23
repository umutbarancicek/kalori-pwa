import { useEffect, useRef, useState } from 'react';
import { startBarcodeScan, type BarcodeStreamHandle } from '../lib/barcodeScanner';

interface BarcodeScannerProps {
  onDetect: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onDetect, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let handle: BarcodeStreamHandle | undefined;
    let cancelled = false;

    async function start() {
      if (!videoRef.current) return;
      try {
        handle = await startBarcodeScan(videoRef.current, (barcode) => {
          if (!cancelled) onDetect(barcode);
        });
      } catch {
        if (!cancelled) setError('Kameraya erişilemedi. Lütfen kamera iznini kontrol et.');
      }
    }
    start();

    return () => {
      cancelled = true;
      handle?.stop();
    };
  }, [onDetect]);

  return (
    <div>
      <video ref={videoRef} aria-label="Barkod kamerası" muted playsInline />
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={onClose}>
        Kapat
      </button>
    </div>
  );
}
