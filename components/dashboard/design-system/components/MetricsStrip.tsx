// Bande de métriques (MASTERPROMPT §7.6) et sparkline (§7.8).
import { Traduit, LibelleDefini } from "./Traduit";
import Link from "next/link";
import { Icon } from "../icons/Icon";
import { PERIODES, pourcentage, type Periode } from "../format";

/** Sparkline 64×22, trait 1,6px. Série vide ou plate : ligne de base. */
export function Sparkline({ data, width = 64, height = 22 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) data = [0, 0];
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - min) / (max - min || 1)) * (height - 4)).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ flex: "none" }}>
      <polyline points={pts} fill="none" stroke="var(--chart-primary)" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

/** Variation : « ↗ 75 % » en vert, « ↘ 7 % » en gris (§16). */
export function Delta({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined || !isFinite(value) || value === 0) return null;
  const hausse = value > 0;
  return <span className={`axd-delta${hausse ? "" : " axd-delta--down"}`}>{hausse ? "↗" : "↘"} {pourcentage(Math.abs(value) * 100)}</span>;
}

export type Metric = {
  label: string;
  /** Définition affichée au survol du libellé souligné. */
  definition?: string;
  value: React.ReactNode;
  delta?: number | null;
  series?: number[];
};

/**
 * Carte horizontale : cellule période (ouvre le choix de période) puis N métriques.
 * `periodeHref(p)` construit l'URL de chaque période (filtre en query string, §6).
 */
export function MetricsStrip({ periode, periodeHref, metrics }: { periode?: Periode; periodeHref?: (p: Periode) => string; metrics: Metric[] }) {
  const label = PERIODES.find((p) => p.id === periode)?.label;
  return (
    <div className="axd-mstrip">
      {label && (
        periodeHref ? (
          <details className="axd-mstrip__per">
            <summary><Icon name="calendar" /><Traduit>{label}</Traduit></summary>
            <div className="axd-popover axd-mstrip__menu" role="menu">
              {PERIODES.map((p) => (
                <Link key={p.id} href={periodeHref(p.id)} className="axd-menu-item" data-active={p.id === periode || undefined} role="menuitem"><Traduit>{p.label}</Traduit></Link>
              ))}
            </div>
          </details>
        ) : <div className="axd-mstrip__per"><span className="axd-mstrip__sum"><Icon name="calendar" /><Traduit>{label}</Traduit></span></div>
      )}
      {metrics.map((m) => (
        <div key={m.label} className="axd-mstrip__m">
          <div className="axd-mstrip__t"><LibelleDefini label={m.label} definition={m.definition} /></div>
          <div className="axd-mstrip__v">
            <span className="axd-mstrip__val">{m.value}</span>
            <Delta value={m.delta} />
            {m.series && <Sparkline data={m.series} />}
          </div>
        </div>
      ))}
    </div>
  );
}
