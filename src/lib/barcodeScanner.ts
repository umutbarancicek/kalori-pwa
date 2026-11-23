import { BrowserMultiFormatReader } from '@zxing/library';

export interface BarcodeStreamHandle {
  stop: () => void;
}

interface NativeBarcodeDetectorCtor {
  new (options?: { formats?: string[] }): {
    detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
  };
}

function getNativeBarcodeDetector(): NativeBarcodeDetectorCtor | undefined {
  return (window as unknown as { BarcodeDetector?: NativeBarcodeDetectorCtor }).BarcodeDetector;
}

export function isNativeBarcodeDetectorAvailable(): boolean {
  return typeof getNativeBarcodeDetector() !== 'undefined';
}

export async function startBarcodeScan(
  videoElement: HTMLVideoElement,
  onDetect: (barcode: string) => void,
): Promise<BarcodeStreamHandle> {
  const NativeBarcodeDetector = getNativeBarcodeDetector();

  if (NativeBarcodeDetector) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    videoElement.srcObject = stream;
    await videoElement.play();
    const detector = new NativeBarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    let stopped = false;
    const scanLoop = async () => {
      while (!stopped) {
        try {
          const results = await detector.detect(videoElement);
          if (results[0]) {
            onDetect(results[0].rawValue);
          }
        } catch {
          // frame not ready yet; keep scanning
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    };
    scanLoop();
    return {
      stop: () => {
        stopped = true;
        stream.getTracks().forEach((track) => track.stop());
      },
    };
  }

  const reader = new BrowserMultiFormatReader();
  await reader.decodeFromVideoDevice(null, videoElement, (result) => {
    if (result) {
      onDetect(result.getText());
    }
  });
  return {
    stop: () => reader.reset(),
  };
}
