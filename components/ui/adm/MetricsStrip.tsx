"use client";
// MetricsStrip (masterprompt §7.6) : période à gauche, puis N métriques (libellé en pointillés + définition, valeur, variation, sparkline).
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Icon } from "@/components/ui/icones";
import { Sparkline } from "@/components/ui/graphiques";
import { Menu, Popover, Tooltip } from "./Popover";

export type Metric = {
  id: string;
  label: string;
  /** Définition affichée au survol du libellé (« Unités vendues / unités reçues sur la période »). */
  definition?: string;
  /** Valeur déjà formatée (« 14 », « 62 900 FCFA »). */
  value: string;
  /** Variation en % vs période précédente ; null/absent = pas de comparaison possible (rien n'est affiché). */
  delta?: number | null;
  sparkline?: number[];
};

export type MetricsStripProps = {
  metrics: Metric[];
  /** Libellé de la période active (« Aujourd'hui »). */
  period: string;
  /** Périodes proposées ; sans elles, la cellule période n'est pas cliquable. */
  periods?: { id: string; label: string }[];
  onPeriodChange?: (id: string) => void;
};

/** « ↗ 75 % » / « ↘ 7 % » ; null si pas de variation calculable. */
export function formatDelta(delta: number | null | undefined): { texte: string; hausse: boolean } | null {
  if (delta == null || !Number.isFinite(delta)) return null;
  const hausse = delta >= 0;
  return { texte: `${hausse ? "↗" : "↘"} ${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.abs(delta))} %`, hausse };
}

export function MetricsStrip({ metrics, period, periods, onPeriodChange }: MetricsStripProps) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const cellulePeriode = (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-[550] text-(--color-text-strong)">
      <Icon name="calendar" />{period}
    </span>
  );
  // ponytail: au-dessus de 1040 px pas de débordement, pour que l'infobulle de définition ne soit pas rognée ;
  // en dessous (défilement horizontal) elle peut l'être — passer l'infobulle en position fixe si besoin.
  return (
    <div className="mb-4 flex items-stretch rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card) max-[1040px]:overflow-x-auto [scrollbar-width:none]">
      <div className="flex flex-none items-center border-r border-(--color-border-secondary) px-2">
        {periods?.length && onPeriodChange ? (
          <Popover open={ouvert} onClose={() => setOuvert(false)} activator={
            <button type="button" aria-haspopup="menu" aria-expanded={ouvert} aria-label={t("Période : {0}", period)}
              onClick={() => setOuvert(!ouvert)} className="rounded-(--radius-md) px-2 py-1.5 hover:bg-(--color-surface-secondary)">
              {cellulePeriode}
            </button>
          }>
            <Menu label={t("Période")} onItem={() => setOuvert(false)}
              items={periods.map((p) => ({ content: p.label, onAction: () => onPeriodChange(p.id) }))} />
          </Popover>
        ) : <span className="px-2">{cellulePeriode}</span>}
      </div>
      {metrics.map((m) => {
        const d = formatDelta(m.delta);
        return (
          <div key={m.id} className="min-w-[160px] flex-1 border-r border-(--color-border-secondary) px-4 py-3 last:border-r-0 max-[1040px]:min-w-[170px] max-[820px]:min-w-[160px]">
            <div className="whitespace-nowrap font-[550] text-(--color-text-strong)">
              {m.definition
                ? <Tooltip content={m.definition}><span tabIndex={0} className="border-b border-dashed border-[#b5b5b5]">{m.label}</span></Tooltip>
                : m.label}
            </div>
            <div className="mt-0.5 flex items-center gap-2 whitespace-nowrap">
              <span className="font-[550] text-(--color-text-strong) tabular-nums">{m.value}</span>
              {d && <span className={d.hausse ? "text-(--badge-success-text)" : "text-(--color-text-secondary)"}>{d.texte}</span>}
              {m.sparkline && <span className="ml-auto"><Sparkline data={m.sparkline} /></span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
