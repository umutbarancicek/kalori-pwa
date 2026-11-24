import type { FoodSource } from '../db/schema';

const LABELS: Record<FoodSource, string> = {
  bulk: 'Toplu veri',
  user: 'Kendi kaydım',
  verified: 'Doğrulandı',
};

const COLORS: Record<FoodSource, string> = {
  bulk: '#64748b',
  user: '#d97706',
  verified: '#16a34a',
};

export function SourceBadge({ source }: { source: FoodSource }) {
  // "Toplu veri" is the common case for ~1700 seeded records and shown on
  // every single search result row told the user nothing — only the
  // distinctive sources (their own entries, verified-correct entries) are
  // worth a badge.
  if (source === 'bulk') return null;

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
