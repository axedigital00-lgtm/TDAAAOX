// Entonnoir (§7.8) : un trapèze par étape (--chart-funnel-1..3), valeur et part de la première étape.
import { formatValeur } from "./echelle";

const TEINTES = ["var(--chart-funnel-1)", "var(--chart-funnel-2)", "var(--chart-funnel-3)"];

export function FunnelChart({ etapes, ariaLabel }: { etapes: { libelle: string; valeur: number }[]; ariaLabel: string }) {
  const premiere = etapes[0]?.valeur || 0;
  const largeur = (v: number) => (premiere > 0 ? Math.max(8, (v / premiere) * 100) : 8);
  return (
    <div role="img" aria-label={ariaLabel} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${etapes.length}, minmax(0, 1fr))` }}>
      {etapes.map((e, i) => {
        const h0 = largeur(e.valeur), h1 = largeur(etapes[i + 1]?.valeur ?? e.valeur);
        return (
          <div key={e.libelle} className="min-w-0">
            <div className="truncate text-[12px] text-(--color-text-secondary)">{e.libelle}</div>
            <div className="font-[550] text-(--color-text-strong) tabular-nums">
              {formatValeur(e.valeur)}{" "}
              {i > 0 && premiere > 0 && <span className="text-[12px] font-normal text-(--color-text-secondary)">{formatValeur((e.valeur / premiere) * 100, "pourcent")}</span>}
            </div>
            {/* Trapèze : bord gauche à la hauteur de l'étape, bord droit à celle de la suivante. Pas de texte dans ce SVG. */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-2 block h-[120px] w-full" aria-hidden>
              <polygon points={`0,${100 - h0} 100,${100 - h1} 100,100 0,100`} style={{ fill: TEINTES[Math.min(i, TEINTES.length - 1)] }} />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
