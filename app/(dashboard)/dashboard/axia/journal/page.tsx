"use client";

import { useEffect, useState, useCallback } from "react";
import { dateRelative } from "@/lib/utils";
import {
  Sparkles, TrendingUp, Radar, Rocket, Package, Heart, Megaphone,
  BarChart3, Users, ShoppingBag, Truck, Loader2, Filter, Zap,
} from "lucide-react";

import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
import { ouvrirAxia } from "@/components/dashboard/AxiaPanneau";
import { EtatErreur, SqueletteListe } from "@/components/ui";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui/adm";
import { IllustrationGenerique } from "@/components/ui/illustrations";
interface Decision {
  id: string;
  agentId: string;
  type: string;
  description: string;
  donnees: Record<string, any>;
  impactEstime: number | null;
  impactReel: number | null;
  statut: string;
  createdAt: string;
}

const AGENT_META: Record<string, { label: string; Icon: any; couleur: string }> = {
  axia:              { label: "AXIA",          Icon: Sparkles,    couleur: "#F5A623" },
  orchestrator:      { label: "Orchestrateur", Icon: Sparkles,    couleur: "#1B2A4A" },
  "agent-revenue":    { label: "Agent Revenue", Icon: TrendingUp,  couleur: "#F5A623" },
  "agent-veille":     { label: "Agent Veille",  Icon: Radar,       couleur: "#0ea5e9" },
  "agent-growth":     { label: "Agent Growth",  Icon: Rocket,      couleur: "#ef4444" },
  "agent-stock":      { label: "Agent Stock",   Icon: Package,     couleur: "#8b5cf6" },
  "agent-fidelite":   { label: "Agent Fidélité",Icon: Heart,       couleur: "#ec4899" },
  "agent-marketing":  { label: "Agent Marketing", Icon: Megaphone, couleur: "#f97316" },
  "agent-analytics":  { label: "Agent Analytics", Icon: BarChart3, couleur: "#3b82f6" },
  "agent-clients":    { label: "Agent Clients", Icon: Users,       couleur: "#10b981" },
  "agent-produits":   { label: "Agent Produits", Icon: ShoppingBag, couleur: "#F5A623" },
  "agent-livraison":  { label: "Agent Livraison", Icon: Truck,     couleur: "#0ea5e9" },
};

function metaPour(agentId: string) {
  return AGENT_META[agentId] ?? { label: agentId, Icon: Zap, couleur: "#9ca3af" };
}

function grouperParJour(decisions: Decision[]): Array<{ jour: string; items: Decision[] }> {
  const groupes = new Map<string, Decision[]>();
  for (const d of decisions) {
    const jour = new Date(d.createdAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    if (!groupes.has(jour)) groupes.set(jour, []);
    groupes.get(jour)!.push(d);
  }
  return [...groupes.entries()].map(([jour, items]) => ({ jour, items }));
}

export default function JournalAxiaPage() {
  const t = useT();
  const { fmt } = useDevise();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [filtre, setFiltre] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPlus, setLoadingPlus] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback((agent: string | null, curseur: string | null, append: boolean) => {
    const params = new URLSearchParams();
    if (agent) params.set("agent", agent);
    if (curseur) params.set("cursor", curseur);
    (append ? setLoadingPlus : setLoading)(true);
    setErreur(null);
    fetch(`/api/agent-decisions?${params}`)
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "");
        return d;
      })
      .then(d => {
        setDecisions(prev => append ? [...prev, ...(d.decisions ?? [])] : (d.decisions ?? []));
        setCursor(d.nextCursor ?? null);
        setAgents(d.agents ?? []);
      })
      .catch((e: Error) => setErreur(e.message || t("Vérifiez votre connexion internet puis réessayez.")))
      .finally(() => { setLoading(false); setLoadingPlus(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { charger(filtre, null, false); }, [filtre, charger]);

  const groupes = grouperParJour(decisions);

  return (
    <div className="space-y-6">
      <PageHeader icon="history" title={t("Journal d'activité AXIA")} backHref="/dashboard/accueil?axia" />
      <p className="m-0 -mt-2 max-w-3xl text-(--color-text-secondary)">{t("Chaque action faite par AXIA et ses agents pour votre boutique, avec son résultat. Les actions sensibles n'apparaissent ici qu'après votre accord.")}</p>

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 text-[11px] font-bold text-doux uppercase tracking-wide"><Filter size={11} />{" "}{t("Filtrer par agent")}</span>
        <button onClick={() => setFiltre(null)} aria-pressed={filtre === null}
          className="min-h-10 px-3 rounded-full text-xs font-semibold transition-all"
          style={filtre === null ? { background: "#1B2A4A", color: "white" } : { background: "#F3F4F6", color: "#6b7280" }}>
          {t("Tout")}
        </button>
        {agents.map(a => {
          const meta = metaPour(a);
          const active = filtre === a;
          return (
            <button key={a} onClick={() => setFiltre(active ? null : a)} aria-pressed={active}
              title={active ? t("Retirer ce filtre") : undefined}
              className="flex min-h-10 items-center gap-1.5 px-3 rounded-full text-xs font-semibold transition-all"
              style={active ? { background: meta.couleur, color: "white" } : { background: "#F3F4F6", color: "#6b7280" }}>
              <meta.Icon size={11} /> {t(meta.label)}{active && <span aria-hidden> ×</span>}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {loading ? (
        <SqueletteListe libelle={t("Chargement du journal…")} />
      ) : erreur ? (
        <EtatErreur titre={t("Le journal n'a pas pu se charger")} texte={erreur} onReessayer={() => charger(filtre, null, false)} />
      ) : groupes.length === 0 ? (
        <EmptyState
          image={<IllustrationGenerique />}
          title={filtre ? t("Aucune action de cet agent pour le moment") : t("AXIA n'a encore rien fait pour votre boutique")}
          actions={filtre
            ? <Button variant="default" onClick={() => setFiltre(null)}>{t("Voir toutes les actions")}</Button>
            : <Button variant="primary" onClick={() => ouvrirAxia()}>{t("Demander quelque chose à AXIA")}</Button>}
        >
          {t("Dès qu'AXIA ou un agent agit (après votre accord quand c'est sensible), l'action s'affiche ici avec son résultat.")}
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {groupes.map(({ jour, items }) => (
            <div key={jour}>
              <p className="text-[11px] font-black text-(--color-text-subdued) uppercase tracking-[0.12em] mb-3 capitalize">{t(jour)}</p>
              <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-(--color-surface-tertiary)">
                {items.map(d => {
                  const meta = metaPour(d.agentId);
                  return (
                    <div key={d.id} className="relative ax-card p-4 hover:!translate-y-0">
                      <span className="absolute -left-6 top-5 w-3.5 h-3.5 rounded-full border-2 border-white" style={{ background: meta.couleur }} />
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${meta.couleur}15` }}>
                          <meta.Icon size={16} style={{ color: meta.couleur }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] font-bold" style={{ color: meta.couleur }}>{t(meta.label)}</span>
                            <span className="text-[11px] text-doux">{dateRelative(d.createdAt)}</span>
                          </div>
                          <p className="text-sm text-encre mt-1 leading-relaxed">{t(d.description)}</p>
                          {/* Action sensible : faite seulement après l'accord du marchand ; on montre son résultat. */}
                          {d.type === "action_autorisee" && typeof d.donnees?.succes === "boolean" && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Badge tone="info">{t("Autorisée par vous")}</Badge>
                              {d.donnees.succes ? <Badge tone="success">{t("Réussie")}</Badge> : <Badge tone="critical">{t("Échouée")}</Badge>}
                            </div>
                          )}
                          {(d.impactEstime != null || d.impactReel != null) && (
                            <div className="flex items-center gap-2 mt-2">
                              {d.impactEstime != null && (
                                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-(--banner-success-bg) text-(--badge-success-text) border border-(--badge-success-bg)">
                                  {t("Impact estimé :")}{" "}{fmt(d.impactEstime)}
                                </span>
                              )}
                              {d.impactReel != null && (
                                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-(--color-surface-selected) text-(--color-text-strong) border border-(--color-border-strong)">
                                  {t("Impact réel :")}{" "}{fmt(d.impactReel)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {cursor && (
            <div className="flex justify-center pt-2">
              <button onClick={() => charger(filtre, cursor, true)} disabled={loadingPlus}
                className="min-h-10 px-5 rounded-xl text-xs font-bold text-doux border border-bordure hover:bg-carte-2 transition-all flex items-center gap-2 disabled:opacity-60">
                {loadingPlus && <Loader2 size={12} className="animate-spin" />}
                {loadingPlus ? t("Chargement…") : t("Voir les actions plus anciennes")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
