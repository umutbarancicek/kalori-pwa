import type { FoodSource } from '../db/schema';

const LABELS: Record<FoodSource, string> = {
  bulk: 'Toplu veri',
  user: 'Kullanıcı',
  verified: 'Doğrulandı',
};

const COLORS: Record<FoodSource, string> = {
  bulk: '#64748b',
  user: '#d97706',
  verified: '#16a34a',
};

export function SourceBadge({ source }: { source: FoodSource }) {
  return (
    <span
      style={{
        backgroundColor: COLORS[source],
        color: 'white',
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '0.75rem',
      }}
    >
      {LABELS[source]}
    </span>
  );
}
