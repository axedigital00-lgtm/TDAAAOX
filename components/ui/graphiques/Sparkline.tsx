// Mini-courbe de tendance (MetricsStrip) : 64×22, trait 1,6 px. Décorative : la valeur est écrite à côté.
export function Sparkline({ data, width = 64, height = 22, color = "var(--chart-primary)" }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const mx = Math.max(...data), mn = Math.min(...data);
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - mn) / (mx - mn || 1)) * (height - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden focusable="false" style={{ flex: "none" }}>
      <polyline points={pts} fill="none" style={{ stroke: color }} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
