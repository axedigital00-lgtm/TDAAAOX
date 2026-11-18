"use client";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { BarChart3 } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { EtatVide } from "@/components/ui";

interface DonneeVente { date: string; montant: number; commandes: number; }
interface SalesChartProps {
  donnees: DonneeVente[]; devise?: string;
  /** Période déjà choisie par la page (ex. « Aujourd'hui ») : toute la série est affichée,
   *  sans les onglets 7/14/30 j qui la contrediraient. */
  libellePeriode?: string;
}

const PERIODS = [
  { key: 7,  label: "7 j" },
  { key: 14, label: "14 j" },
  { key: 30, label: "30 j" },
] as const;

function TooltipCustom({ active, payload, label, devise }: any) {
  const t = useT();
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #EBEBEB",
      borderRadius: "16px",
      padding: "12px 16px",
      boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
      fontFamily: "'Poppins',system-ui,sans-serif",
      minWidth: "150px",
    }}>
      <p style={{ fontSize: "11px", color: "#AAA", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t(label)}</p>
      {payload[0]?.value > 0 && (
        <p style={{ fontSize: "17px", fontWeight: 800, color: "#111", marginBottom: "3px", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {payload[0].value.toLocaleString(t.loc)}
          <span style={{ fontSize: "11px", color: "#AAA", fontWeight: 500, marginLeft: "3px" }}>{t(devise)}</span>
        </p>
      )}
      {payload[1]?.value > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#111111" }} />
          <p style={{ fontSize: "12px", color: "#888", fontWeight: 500, margin: 0 }}>
            {t("{0} commande(s)", payload[1].value)}
          </p>
        </div>
      )}
    </div>
  );
}

export function SalesChart({ donnees, devise = "XOF", libellePeriode }: SalesChartProps) {
  const t = useT();
  const [period, setPeriod] = useState<7 | 14 | 30>(30);

  const data    = libellePeriode ? donnees : donnees.slice(-period);
  const total   = data.reduce((s, d) => s + d.montant, 0);
  const avgLine = total / Math.max(data.length, 1);
  const bestDay = data.reduce((best, d) => d.montant > best.montant ? d : best, data[0] ?? { date: "", montant: 0, commandes: 0 });
  const totalCmds = data.reduce((s, d) => s + d.commandes, 0);

  if (!donnees?.length || (total === 0 && totalCmds === 0 && libellePeriode)) {
    return (
      <section className="ax-card p-5" aria-labelledby="evolution-ventes">
        <h2 id="evolution-ventes" className="ax-titre-section">{t("Évolution des ventes")}</h2>
        {libellePeriode && <p className="ax-aide mt-0.5">{t(libellePeriode)}</p>}
        <EtatVide compact className="mt-4" icone={<BarChart3 />} titre={t("Aucune vente sur cette période")}
          texte={t("La courbe se remplira dès ta première commande.")} />
      </section>
    );
  }

  return (
    <div className="ax-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h2 className="ax-titre-section">{t("Évolution des ventes")}</h2>
          <p className="ax-aide mt-0.5">
            {libellePeriode ? <>{t(libellePeriode)}{" · "}{t("chiffre d'affaires des commandes payées")}</> : t("Chiffre d'affaires journalier")}
          </p>
        </div>
        {/* Onglets de période (seulement si la page n'en a pas déjà choisi une) */}
        {!libellePeriode && (
          <div className="flex items-center gap-1 bg-carte-2 border border-bordure rounded-controle p-1 flex-shrink-0" role="group" aria-label={t("Période")}>
            {PERIODS.map(p => (
              <button key={p.key} type="button" aria-pressed={period === p.key}
                onClick={() => setPeriod(p.key as 7 | 14 | 30)}
                className={`min-h-10 sm:min-h-8 px-3 rounded-controle text-xs font-semibold transition-colors ${period === p.key ? "bg-carte text-encre shadow-sm" : "text-doux hover:text-encre"}`}>
                {t(p.label)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-5 pb-4 border-b border-bordure">
        <div>
          <p className="ax-label">{t("Total période")}</p>
          <p className="text-[20px] font-bold text-encre tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
            {total.toLocaleString(t.loc)}
            <span className="text-[13px] text-doux font-normal ml-1">{t(devise)}</span>
          </p>
        </div>
        <div className="w-px h-8 bg-bordure" />
        <div>
          <p className="ax-label">{t("Commandes")}</p>
          <p className="text-[20px] font-bold text-encre tabular-nums">{t(totalCmds)}</p>
        </div>
        {bestDay.montant > 0 && (
          <>
            <div className="w-px h-8 bg-bordure" />
            <div>
              <p className="ax-label">{t("Meilleur jour")}</p>
              <p className="text-[13px] font-bold text-attention">
                {bestDay.date}
                <span className="text-[11px] text-doux font-normal ml-1.5">
                  {bestDay.montant.toLocaleString(t.loc)} {t(devise)}
                </span>
              </p>
            </div>
          </>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="gradCA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#F5A623" stopOpacity={0.22} />
              <stop offset="80%"  stopColor="#F5A623" stopOpacity={0.04} />
              <stop offset="100%" stopColor="#F5A623" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="gradCmd" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#111111" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#111111" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#F3F3F3" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="transparent"
            tick={{ fill: "#C8C8C8", fontSize: 10.5, fontFamily: "'Poppins',sans-serif", fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            interval={libellePeriode ? "preserveStartEnd" : period === 7 ? 0 : period === 14 ? 1 : 4}
          />
          <YAxis
            stroke="transparent"
            tick={{ fill: "#C8C8C8", fontSize: 10.5, fontFamily: "'Poppins',sans-serif" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
          />
          <Tooltip content={<TooltipCustom devise={devise} />}
            cursor={{ stroke: "#F5A623", strokeWidth: 1, strokeDasharray: "4 3", strokeOpacity: 0.5 }} />
          <ReferenceLine y={avgLine} stroke="#EBEBEB" strokeDasharray="4 3" />
          <Area
            type="monotone"
            dataKey="montant"
            stroke="#F5A623"
            strokeWidth={2.5}
            fill="url(#gradCA)"
            dot={false}
            activeDot={{ r: 5, fill: "#F5A623", stroke: "#fff", strokeWidth: 2.5 }}
          />
          <Area
            type="monotone"
            dataKey="commandes"
            stroke="#111111"
            strokeWidth={1.5}
            fill="url(#gradCmd)"
            dot={false}
            activeDot={{ r: 4, fill: "#111111", stroke: "#fff", strokeWidth: 2 }}
            strokeOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 pt-3 border-t border-bordure">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full" style={{ background: "#F5A623" }} />
          <span className="text-[11px] text-doux font-medium">{t("CA (")}{t(devise)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full" style={{ background: "#111111", opacity: 0.6 }} />
          <span className="text-[11px] text-doux font-medium">{t("Commandes")}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-3 h-px" style={{ borderTop: "1.5px dashed #EBEBEB" }} />
          <span className="text-[11px] text-doux">{t("Moyenne")}</span>
        </div>
      </div>
    </div>
  );
}
