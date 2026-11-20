// Graphiques légers en SVG (MASTERPROMPT §7.8). Le texte des axes n'est jamais
// déformé : viewBox à proportions fixes, mise à l'échelle uniforme.

/** Courbe compacte sans texte (vignettes du fil) : série principale + comparaison en pointillés. */
export function MiniLineChart({ data, compare, width = 300, height = 110 }: { data: number[]; compare?: number[]; width?: number; height?: number }) {
  const tout = [...data, ...(compare ?? [])];
  const max = Math.max(...tout, 1) * 1.15;
  const pl = 8, pr = 8, pt = 8, pb = 8;
  const x = (i: number, n: number) => pl + (i / Math.max(1, n - 1)) * (width - pl - pr);
  const y = (v: number) => pt + (height - pt - pb) * (1 - v / max);
  const chemin = (s: number[]) => s.map((v, i) => `${i ? "L" : "M"}${x(i, s.length).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden>
      {[0, 1, 2].map((k) => <line key={k} x1={pl} x2={width - pr} y1={y((max / 2) * k)} y2={y((max / 2) * k)} stroke="var(--chart-grid)" vectorEffect="non-scaling-stroke" />)}
      {compare && <path d={chemin(compare)} fill="none" stroke="var(--chart-compare)" strokeWidth={1.6} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      <path d={chemin(data)} fill="none" stroke="var(--chart-primary)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const compact = (v: number) => v >= 1e6 ? `${(v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M` : v >= 1e3 ? `${Math.round(v / 1e3)} k` : v.toLocaleString("fr-FR", { maximumFractionDigits: v < 10 ? 1 : 0 });

/** Courbe avec axes, comparaison en pointillés et légende (§7.8). */
export function LineChart({ data, compare, labels = [], height = 240, width = 720, area, legend, summary }: {
  data: number[]; compare?: number[]; labels?: string[]; height?: number; width?: number; area?: boolean;
  legend?: [string, string?]; summary: string;
}) {
  const pl = 44, pr = 8, pt = 8, pb = 22;
  // Échelle « ronde » : au moins 2 pour garder des graduations distinctes.
  const max = Math.max(2, Math.ceil(Math.max(...data, ...(compare ?? []), 0) * 1.15));
  const n = Math.max(2, data.length);
  const X = (i: number) => pl + (i / (n - 1)) * (width - pl - pr);
  const Y = (v: number) => pt + (height - pt - pb) * (1 - v / max);
  const chemin = (s: number[]) => s.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: "block", height: "auto" }} role="img" aria-label={summary}>
        {[0, 1, 2].map((k) => {
          const v = (max / 2) * k, y = Y(v);
          return <g key={k}><line x1={pl} x2={width - pr} y1={y} y2={y} stroke="var(--chart-grid)" /><text x={pl - 8} y={y + 4} textAnchor="end" fontSize={10} fill="var(--chart-axis-text)">{compact(v)}</text></g>;
        })}
        {labels.map((l, i) => (
          <text key={i} x={X(Math.round((i * (n - 1)) / Math.max(1, labels.length - 1)))} y={height - 4} textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"} fontSize={10} fill="var(--chart-axis-text)">{l}</text>
        ))}
        {area && <path d={`${chemin(data)} L${X(data.length - 1)} ${Y(0)} L${X(0)} ${Y(0)}Z`} fill="var(--chart-primary)" opacity={0.08} />}
        {compare && <path d={chemin(compare)} fill="none" stroke="var(--chart-compare)" strokeWidth={1.6} strokeDasharray="3 3" />}
        <path d={chemin(data)} fill="none" stroke="var(--chart-primary)" strokeWidth={2} strokeLinejoin="round" />
      </svg>
      {legend && (
        <figcaption className="axd-legend">
          <span><i style={{ background: "var(--chart-primary)" }} />{legend[0]}</span>
          {legend[1] && <span><i style={{ background: "var(--chart-compare)" }} />{legend[1]}</span>}
        </figcaption>
      )}
    </figure>
  );
}

const PALETTE = ["var(--chart-cyan)", "var(--chart-primary)", "var(--chart-violet)", "var(--chart-compare)", "var(--chart-funnel-3)"];

/** Anneau (rayon 15,9 sur viewBox 42, épaisseur 5) avec valeur centrale et légende (§7.8). */
export function DonutChart({ parts, centre, unite }: { parts: { label: string; value: number }[]; centre: string; unite?: string }) {
  const total = parts.reduce((t, p) => t + p.value, 0);
  let decalage = 25;
  return (
    <div>
      <div style={{ display: "grid", placeItems: "center", margin: "14px 0" }}>
        <svg width={150} height={150} viewBox="0 0 42 42" role="img" aria-label={parts.map((p) => `${p.label} ${total ? Math.round((p.value / total) * 100) : 0} %`).join(", ")}>
          <circle cx={21} cy={21} r={15.9} fill="none" stroke="var(--color-border)" strokeWidth={5} />
          {total > 0 && parts.map((p, i) => {
            const pct = (p.value / total) * 100;
            const el = <circle key={p.label} cx={21} cy={21} r={15.9} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth={5} strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={decalage} />;
            decalage -= pct;
            return el;
          })}
          <text x={21} y={22} textAnchor="middle" fontSize={5} fontWeight={700} fill="var(--color-text-strong)">{centre}</text>
          {unite && <text x={21} y={27} textAnchor="middle" fontSize={2.8} fill="var(--color-text-subdued)">{unite}</text>}
        </svg>
      </div>
      <div style={{ fontSize: 12 }}>
        {parts.map((p, i) => (
          <div key={p.label} className="axd-kv" style={{ border: 0, padding: "3px 0" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><i className="axd-legend-dot" style={{ background: PALETTE[i % PALETTE.length] }} />{p.label}</span>
            <span>{total ? Math.round((p.value / total) * 100) : 0} %</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Barres horizontales de 18px (§7.8). */
export function HorizontalBars({ items, format = (v) => compact(v) }: { items: { label: string; value: number }[]; format?: (v: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div>
      {items.map((i) => (
        <div key={i.label} style={{ margin: "10px 0" }}>
          <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.label}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="axd-hbar" style={{ width: `${Math.max(2, (i.value / max) * 85)}%` }} />
            <span className="axd-muted" style={{ fontSize: 12 }}>{format(i.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Lignes « libellé … valeur » (§7.13). */
export function KeyValue({ rows }: { rows: { label: React.ReactNode; value: React.ReactNode; strong?: boolean }[] }) {
  return (
    <div>
      {rows.map((r, i) => (
        <div key={i} className="axd-kv" style={r.strong ? { fontWeight: 600, color: "var(--color-text-strong)" } : undefined}>
          <span>{r.label}</span><span className="axd-tabular">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
