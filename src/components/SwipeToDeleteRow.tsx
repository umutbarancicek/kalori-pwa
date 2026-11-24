import { useRef, useState } from 'react';

const DELETE_THRESHOLD_PX = 72;

interface SwipeToDeleteRowProps {
  onDelete: () => void;
  onTap?: () => void;
  children: React.ReactNode;
}

/**
 * A row that can be deleted either by swiping left past a threshold (touch)
 * or by a visible "Sil" button underneath (always-available, keyboard/mouse
 * accessible — swipe gestures alone would lock out non-touch input).
 */
export function SwipeToDeleteRow({ onDelete, onTap, children }: SwipeToDeleteRowProps) {
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const dragged = useRef(false);

  function handlePointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    dragged.current = false;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (startX.current === null) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 5) dragged.current = true;
    setDragX(Math.min(0, Math.max(delta, -120)));
  }

  function handlePointerUp() {
    if (dragX <= -DELETE_THRESHOLD_PX) {
      onDelete();
    }
    setDragX(0);
    startX.current = null;
  }

  function handleClick() {
    if (!dragged.current) onTap?.();
  }

  return (
    <div className="swipe-row">
      <button type="button" className="swipe-row-delete" onClick={onDelete} aria-label="Sil">
        Sil
      </button>
      <div
        className="swipe-row-content"
        style={{ transform: `translateX(${dragX}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
      >
        {children}
      </div>
    </div>
  );
}
