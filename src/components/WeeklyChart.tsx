interface WeeklyChartProps {
  history: { date: string; total: { kcal: number } }[];
  goalKcal?: number | null;
}

const CHART_HEIGHT = 100;
const BAR_WIDTH = 28;
const GAP = 10;

export function WeeklyChart({ history, goalKcal }: WeeklyChartProps) {
  if (history.length === 0) return null;

  const maxKcal = Math.max(...history.map((d) => d.total.kcal), goalKcal ?? 0, 1);
  const width = history.length * (BAR_WIDTH + GAP);

  return (
    <svg
      viewBox={`0 0 ${width} ${CHART_HEIGHT + 20}`}
      width="100%"
      height={CHART_HEIGHT + 20}
      role="img"
      aria-label={`Son ${history.length} günün kalori geçmişi: ${history
        .map((d) => `${d.date} ${Math.round(d.total.kcal)} kcal`)
        .join(', ')}`}
    >
      {goalKcal && (
        <line
          x1={0}
          x2={width}
          y1={CHART_HEIGHT - (goalKcal / maxKcal) * CHART_HEIGHT}
          y2={CHART_HEIGHT - (goalKcal / maxKcal) * CHART_HEIGHT}
          stroke="var(--text-muted)"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
      )}
      {history.map((day, i) => {
        const barHeight = (day.total.kcal / maxKcal) * CHART_HEIGHT;
        const x = i * (BAR_WIDTH + GAP);
        const dayLabel = day.date.slice(5).replace('-', '/');
        return (
          <g key={day.date}>
            <rect
              x={x}
              y={CHART_HEIGHT - barHeight}
              width={BAR_WIDTH}
              height={barHeight}
              fill="var(--primary)"
              rx={3}
            />
            <text
              x={x + BAR_WIDTH / 2}
              y={CHART_HEIGHT + 14}
              textAnchor="middle"
              fontSize="9"
              fill="var(--text-muted)"
            >
              {dayLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
