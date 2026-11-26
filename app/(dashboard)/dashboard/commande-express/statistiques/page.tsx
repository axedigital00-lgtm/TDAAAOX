"use client";
// Statistiques Releasit COD AXSO : entonnoir réel (affichages → ouvertures → commandes → confirmées →
// livrées), CA commandé et encaissé, sources et villes, test A/B, quota du forfait.
import { useEffect, useState } from "react";
import { Page, PageHeader, Card, Badge, Banner } from "@/components/dashboard/design-system";
import { OngletsCommandeExpress } from "@/components/dashboard/commande-express/OngletsApp";
import { useT } from "@/components/I18nProvider";
import { formatMontant } from "@/lib/utils";

type Groupe = { nom: string; commandes: number; confirmees: number; livrees: number; ca: number; tauxConfirmation: number; tauxLivraison: number };
type Donnees = {
  jours: number; devise: string;
  entonnoir: { affichages: number; ouvertures: number; commandes: number; confirmees: number; livrees: number };
  ca: { commande: number; encaisse: number; panierMoyen: number };
  sources: Groupe[]; villes: Groupe[];
  ab: null | { actif: boolean; debut: string; texteA: string; texteB: string; A: { essais: number; succes: number }; B: { essais: number; succes: number }; tauxA: number; tauxB: number; confiance: number; gagnant: "A" | "B" | null; message: string };
  quota: { forfait: string; limite: number | null; utilisees: number };
};

export default function StatistiquesPage() {
  const t = useT();
  const [jours, setJours] = useState(30);
  const [d, setD] = useState<Donnees | null>(null);
  useEffect(() => { setD(null); fetch(`/api/commande-express/statistiques?jours=${jours}`).then((r) => (r.ok ? r.json() : null)).then((x) => x && setD(x)); }, [jours]);

  const e = d?.entonnoir;
  const etapes = e ? [["Fiches vues avec le bouton", e.affichages], ["Formulaires ouverts", e.ouvertures], ["Commandes", e.commandes], ["Confirmées", e.confirmees], ["Livrées", e.livrees]] as const : [];
  const max = Math.max(1, ...etapes.map(([, v]) => v));

  return (
    <Page width="narrow">
      <PageHeader icon="bars" title={t("Statistiques")} backHref="/dashboard/commande-express" />
      <OngletsCommandeExpress />
      <div style={{ display: "grid", gap: "var(--space-400)", marginTop: "var(--space-400)" }}>
        <nav className="axd-tabs" aria-label={t("Période")}>
          {[7, 30, 90].map((j) => <button key={j} type="button" className="axd-tab" aria-current={jours === j ? "page" : undefined} onClick={() => setJours(j)}>{t("{0} jours", j)}</button>)}
        </nav>
        {!d || !e ? <Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement...")}</p></Card> : <>
          {d.quota.limite !== null && (
            <Banner tone={d.quota.utilisees >= d.quota.limite ? "critical" : d.quota.utilisees >= d.quota.limite * 0.8 ? "warning" : "info"} title={t("Forfait {0} : {1} / {2} commandes ce mois-ci", d.quota.forfait, d.quota.utilisees, d.quota.limite)}>
              {t(d.quota.utilisees >= d.quota.limite ? "Le quota est atteint : les nouvelles commandes arrivent toujours, mais leur confirmation demande un forfait supérieur." : "Aucune commande n'est jamais perdue : au-delà du quota, elles arrivent et attendent un forfait supérieur pour être confirmées.")}
            </Banner>
          )}
          <Card title={t("Entonnoir")}>
            <div style={{ display: "grid", gap: 10 }}>
              {e.affichages < e.commandes && <p className="axd-muted" style={{ margin: 0, fontSize: 12.5 }}>{t("Les vues du formulaire sont comptées depuis l'installation de cette version : l'entonnoir sera complet après quelques jours.")}</p>}
              {etapes.map(([l, v], i) => (
                <div key={l}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
                    <span>{t(l)}</span>
                    <span><b>{v}</b>{i > 0 && etapes[i - 1][1] >= v && etapes[i - 1][1] ? <span className="axd-muted"> · {Math.round((v / etapes[i - 1][1]) * 100)} %</span> : null}</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 5, background: "var(--color-surface-secondary)" }}><div style={{ height: "100%", width: `${(v / max) * 100}%`, borderRadius: 5, background: "var(--color-text-strong)" }} /></div>
                </div>
              ))}
            </div>
          </Card>
          <Card title={t("Chiffre d'affaires")}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              {[[formatMontant(d.ca.commande, d.devise), "Commandé (hors annulées)"], [formatMontant(d.ca.encaisse, d.devise), "Encaissé (livré)"], [formatMontant(d.ca.panierMoyen, d.devise), "Panier moyen"]].map(([v, l]) => (
                <div key={l}><div style={{ fontSize: 20, fontWeight: 700 }}>{v}</div><div className="axd-muted" style={{ fontSize: 13 }}>{t(l)}</div></div>
              ))}
            </div>
          </Card>

          {d.ab && (
            <Card title={t("Test A/B du bouton")} actions={<Badge tone={d.ab.actif ? "success" : "neutral"}>{t(d.ab.actif ? "En cours" : "Arrêté")}</Badge>}>
              <div style={{ display: "grid", gap: 10 }}>
                {(["A", "B"] as const).map((v) => (
                  <div key={v} style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, borderRadius: 10, border: `1px solid ${d.ab!.gagnant === v ? "var(--color-text-success, #1a7f37)" : "var(--color-border-secondary)"}` }}>
                    <b>{v}</b>
                    <span style={{ flex: 1, minWidth: 0 }}>« {v === "A" ? d.ab!.texteA : d.ab!.texteB} »</span>
                    <span className="axd-muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>{t("{0} commandes / {1} vues", d.ab![v].succes, d.ab![v].essais)} · <b>{v === "A" ? d.ab!.tauxA : d.ab!.tauxB} %</b></span>
                    {d.ab!.gagnant === v && <Badge tone="success">{t("Gagnant")}</Badge>}
                  </div>
                ))}
                <p className="axd-muted" style={{ margin: 0, fontSize: 13 }}>{t(d.ab.message)} {t("Depuis le {0}.", new Date(d.ab.debut).toLocaleDateString(t.loc))}</p>
              </div>
            </Card>
          )}

          {([["Par source de trafic", d.sources], ["Par ville", d.villes]] as const).map(([titre, liste]) => (
            <Card key={titre} title={t(titre)} padding="none">
              {!liste.length ? <div style={{ padding: 16 }}><p className="axd-muted" style={{ margin: 0 }}>{t("Pas encore de commandes sur la période.")}</p></div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                    <thead><tr className="axd-muted" style={{ textAlign: "left" }}>{["", "Commandes", "Confirmées", "Livrées", "Encaissé"].map((h) => <th key={h} style={{ padding: "8px 12px", fontWeight: 500 }}>{t(h)}</th>)}</tr></thead>
                    <tbody>{liste.map((g) => (
                      <tr key={g.nom} style={{ borderTop: "1px solid var(--color-border-secondary)" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{g.nom === "Direct" ? t("Direct") : g.nom}</td>
                        <td style={{ padding: "8px 12px" }}>{g.commandes}</td>
                        <td style={{ padding: "8px 12px" }}>{g.tauxConfirmation} %</td>
                        <td style={{ padding: "8px 12px" }}>{g.tauxLivraison} %</td>
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{formatMontant(g.ca, d.devise)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </>}
      </div>
    </Page>
  );
}
