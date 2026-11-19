// Anneau (§7.8) : r 15,9 sur viewBox 42, épaisseur 5, total au centre + devise, légende en liste.
import { arcs, COULEURS, formatCompact, formatValeur } from "./echelle";

export type Segment = { libelle: string; valeur: number; couleur?: string };

export function DonutChart({ segments, devise, ariaLabel, taille = 150 }: { segments: Segment[]; devise?: string; ariaLabel: string; taille?: number }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.valeur), 0);
  const parts = arcs(segments.map((s) => s.valeur));
  return (
    <div>
      <div className="my-3.5 grid place-items-center">
        <svg width={taille} height={taille} viewBox="0 0 42 42" role="img" aria-label={ariaLabel}>
          <circle cx={21} cy={21} r={15.9} fill="none" style={{ stroke: "var(--color-border)" }} strokeWidth={5} />
          {segments.map((s, i) => parts[i].part > 0 && (
            <circle key={s.libelle} cx={21} cy={21} r={15.9} fill="none" style={{ stroke: s.couleur ?? COULEURS[i % COULEURS.length] }}
              strokeWidth={5} strokeDasharray={parts[i].dasharray} strokeDashoffset={parts[i].dashoffset} />
          ))}
          <text x={21} y={devise ? 22 : 23} textAnchor="middle" fontSize={5} fontWeight={700} style={{ fill: "var(--color-text-strong)" }}>{formatCompact(total)}</text>
          {devise && <text x={21} y={27} textAnchor="middle" fontSize={2.8} style={{ fill: "var(--color-text-subdued)" }}>{devise === "XAF" || devise === "XOF" ? "FCFA" : devise}</text>}
        </svg>
      </div>
      <ul className="text-[12px]">
        {segments.map((s, i) => (
          <li key={s.libelle} className="flex items-center gap-2 py-[3px]">
            <i className="size-2 flex-none rounded-full" style={{ background: s.couleur ?? COULEURS[i % COULEURS.length] }} />
            <span className="flex-1">{s.libelle}</span>
            <span className="tabular-nums">{formatValeur(Math.round(parts[i].part), "pourcent")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
