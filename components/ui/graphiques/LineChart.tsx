"use client";
// Courbe (§7.8) : série principale 2 px, comparaison 1,6 px en pointillés, aire à 8 % en option,
// 3 lignes de grille, axe Y compact, 4-5 libellés en X, infobulle au survol et au clavier (← →).
// Le viewBox suit la largeur mesurée (ResizeObserver) : le texte des axes n'est jamais déformé.
import { useEffect, useRef, useState } from "react";
import { formatCompact, formatValeur, graduations, indicesLibelles, trace, variation, type FormatValeur } from "./echelle";

export type LineChartProps = {
  serie: number[];
  comparaison?: number[];
  /** Un libellé par point (date) : infobulle, axe X et tableau pour lecteurs d'écran. */
  libelles: string[];
  /** Résumé lu par les lecteurs d'écran (« Ventes sur 30 jours : 6,47 M FCFA »). */
  ariaLabel: string;
  legende?: { serie: string; comparaison?: string };
  hauteur?: number;
  area?: boolean;
  format?: FormatValeur;
  devise?: string;
};

const PL = 44, PR = 8, PT = 8, PB = 22;

export function LineChart({ serie, comparaison, libelles, ariaLabel, legende, hauteur = 180, area, format = "compact", devise = "XAF" }: LineChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(600);
  const [actif, setActif] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e.contentRect.width > 0 && setLargeur(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = serie.length;
  if (n === 0) return null;
  const ticks = graduations([...serie, ...(comparaison ?? [])]);
  const max = ticks[2];
  const boite = { x0: PL, x1: largeur - PR, y0: PT, y1: hauteur - PB };
  const X = (i: number) => (n === 1 ? PL : PL + (i / (n - 1)) * (boite.x1 - PL));
  const Y = (v: number) => boite.y1 - (Math.max(0, v) / max) * (boite.y1 - PT);
  const d = trace(serie, boite, max);
  const dComp = comparaison?.length ? trace(comparaison, boite, max) : null;

  function survol(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * largeur;
    setActif(Math.min(n - 1, Math.max(0, Math.round(((x - PL) / (boite.x1 - PL)) * (n - 1)))));
  }
  function clavier(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") setActif((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActif((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === "Escape") setActif(null);
    else return;
    e.preventDefault();
  }

  const v = actif === null ? null : serie[actif];
  const c = actif === null ? undefined : comparaison?.[actif];
  // Infobulle et tableau : valeur exacte, pas compacte.
  const detail: FormatValeur = format === "compact" ? "nombre" : format;
  const pct = v === null ? null : variation(v, c);

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={largeur} height={hauteur} viewBox={`0 0 ${largeur} ${hauteur}`} role="img" aria-label={ariaLabel}
        tabIndex={0} onPointerMove={survol} onPointerLeave={() => setActif(null)} onKeyDown={clavier} onBlur={() => setActif(null)}
        className="block max-w-full touch-pan-y"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PL} x2={boite.x1} y1={Y(t)} y2={Y(t)} style={{ stroke: "var(--chart-grid)" }} />
            <text x={PL - 8} y={Y(t) + 4} textAnchor="end" fontSize={10} style={{ fill: "var(--chart-axis-text)" }}>{formatCompact(t)}</text>
          </g>
        ))}
        {indicesLibelles(n).map((i) => (
          <text key={i} x={X(i)} y={hauteur - 4} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={10} style={{ fill: "var(--chart-axis-text)" }}>
            {libelles[i]}
          </text>
        ))}
        {area && <path d={`${d} L${X(n - 1)} ${Y(0)} L${X(0)} ${Y(0)}Z`} style={{ fill: "var(--chart-primary)" }} opacity={0.08} />}
        {dComp && <path d={dComp} fill="none" style={{ stroke: "var(--chart-compare)" }} strokeWidth={1.6} strokeDasharray="3 3" />}
        <path d={d} fill="none" style={{ stroke: "var(--chart-primary)" }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {actif !== null && (
          <g aria-hidden>
            <line x1={X(actif)} x2={X(actif)} y1={PT} y2={boite.y1} style={{ stroke: "var(--color-border)" }} />
            {c !== undefined && <circle cx={X(actif)} cy={Y(c)} r={3.5} fill="#fff" style={{ stroke: "var(--chart-compare)" }} strokeWidth={2} />}
            <circle cx={X(actif)} cy={Y(serie[actif])} r={3.5} fill="#fff" style={{ stroke: "var(--chart-primary)" }} strokeWidth={2} />
          </g>
        )}
      </svg>

      {actif !== null && v !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-1 z-10 min-w-[140px] rounded-(--radius-lg) bg-(--color-surface) px-3 py-2 text-[12px] shadow-(--shadow-popover)"
          style={X(actif) > largeur / 2 ? { right: largeur - X(actif) + 12 } : { left: X(actif) + 12 }}
        >
          <div className="text-(--color-text-secondary)">{libelles[actif]}</div>
          <div className="font-[550] text-(--color-text-strong) tabular-nums">{formatValeur(v, detail, devise)}</div>
          {pct !== null && (
            <div className={`tabular-nums ${pct >= 0 ? "text-(--badge-success-text)" : "text-(--color-text-secondary)"}`}>
              {pct >= 0 ? "↗" : "↘"} {formatValeur(Math.abs(pct), "pourcent")}
            </div>
          )}
        </div>
      )}

      {legende && (
        <div className="mt-2 flex flex-wrap justify-center gap-4 text-[12px] text-(--color-text-secondary)" aria-hidden>
          <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-(--chart-primary)" />{legende.serie}</span>
          {legende.comparaison && comparaison && <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-(--chart-compare)" />{legende.comparaison}</span>}
        </div>
      )}

      {/* Valeurs pour lecteurs d'écran (le SVG n'en donne que le résumé). */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>
          {serie.map((val, i) => (
            <tr key={i}>
              <th scope="row">{libelles[i]}</th>
              <td>{formatValeur(val, detail, devise)}</td>
              {comparaison && <td>{comparaison[i] !== undefined ? formatValeur(comparaison[i], detail, devise) : ""}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
