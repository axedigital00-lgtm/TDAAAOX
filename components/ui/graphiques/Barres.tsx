// Barres (§7.8) : HorizontalBar (18 px, rayon 3, cyan + valeur) et StackedBar (34 px multi-segments).
import { COULEURS, formatValeur, type FormatValeur } from "./echelle";
import type { Segment } from "./DonutChart";

export function HorizontalBar({ lignes, format = "nombre", devise }: { lignes: { libelle: string; valeur: number }[]; format?: FormatValeur; devise?: string }) {
  const max = Math.max(0, ...lignes.map((l) => l.valeur)) || 1;
  return (
    <ul>
      {lignes.map((l) => (
        <li key={l.libelle} className="mt-2.5 first:mt-0">
          <div className="truncate text-[12px] text-(--color-text-secondary)">{l.libelle}</div>
          <div className="flex items-center gap-2">
            <div className="h-[18px] rounded-[3px] bg-(--chart-cyan)" style={{ width: `${Math.max(1, (l.valeur / max) * 85)}%` }} />
            <span className="whitespace-nowrap text-[12px] tabular-nums">{formatValeur(l.valeur, format, devise)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StackedBar({ segments, ariaLabel, format = "nombre", devise }: { segments: Segment[]; ariaLabel: string; format?: FormatValeur; devise?: string }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.valeur), 0);
  const couleur = (s: Segment, i: number) => s.couleur ?? COULEURS[i % COULEURS.length];
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-3.5 text-[12px] text-(--color-text-secondary)">
        {segments.map((s, i) => (
          <span key={s.libelle} className="inline-flex items-center gap-1.5">
            <i className="size-2 rounded-full" style={{ background: couleur(s, i) }} />{s.libelle} <span className="tabular-nums">{formatValeur(s.valeur, format, devise)}</span>
          </span>
        ))}
      </div>
      <div role="img" aria-label={ariaLabel} className="flex h-[34px] overflow-hidden rounded-(--radius-sm) bg-(--color-surface-tertiary)">
        {total > 0 && segments.map((s, i) => s.valeur > 0 && <div key={s.libelle} style={{ flex: s.valeur, background: couleur(s, i) }} />)}
      </div>
    </div>
  );
}
