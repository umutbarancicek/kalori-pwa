interface MacroRingProps {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
}

const SIZE = 72;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function MacroRing({ label, value, goal, unit, color }: MacroRingProps) {
  const ratio = goal > 0 ? Math.min(value / goal, 1) : 0;
  const offset = CIRCUMFERENCE * (1 - ratio);

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="16"
          fontWeight="700"
          fill="var(--text)"
        >
          {Math.round(value)}
        </text>
      </svg>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {label}
        <br />
        {Math.round(value)}/{Math.round(goal)} {unit}
      </div>
    </div>
  );
}
