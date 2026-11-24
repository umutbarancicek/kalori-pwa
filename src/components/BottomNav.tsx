export type AppView = 'diary' | 'add' | 'settings';

interface BottomNavProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
}

export function BottomNav({ view, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      <button
        type="button"
        className={view === 'diary' ? 'active' : ''}
        onClick={() => onNavigate('diary')}
      >
        Günlük
      </button>
      <button
        type="button"
        className={`add-fab ${view === 'add' ? 'active' : ''}`}
        onClick={() => onNavigate('add')}
        aria-label="Ekle"
      >
        +
      </button>
      <button
        type="button"
        className={view === 'settings' ? 'active' : ''}
        onClick={() => onNavigate('settings')}
      >
        Ayarlar
      </button>
    </nav>
  );
}
