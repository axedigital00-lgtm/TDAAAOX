"use client";
// Lancements planifiés : le brouillon du Constructeur passe en ligne à l'heure dite, avec retour automatique.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Card, EmptyState, Field } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";

type Lancement = { id: string; nom: string; statut: string; debut: string; fin: string | null; erreur: string | null };
const STATUTS: Record<string, { l: string; tone?: "success" | "attention" | "critical" | "info" }> = {
  planifie: { l: "Planifié", tone: "info" }, en_ligne: { l: "En ligne", tone: "success" }, termine: { l: "Terminé" }, annule: { l: "Annulé" },
  conflit: { l: "Retour non appliqué", tone: "attention" }, echec: { l: "Échec", tone: "critical" },
};

export default function LancementsPage() {
  const t = useT();
  const [liste, setListe] = useState<Lancement[] | null>(null);
  const [brouillon, setBrouillon] = useState(false);
  const [nom, setNom] = useState(""); const [debut, setDebut] = useState(""); const [fin, setFin] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const charger = () => fetch("/api/lancements").then((r) => r.json()).then((d) => { setListe(d.lancements ?? []); setBrouillon(!!d.brouillon); }).catch(() => setListe([]));
  useEffect(() => { charger(); }, []);

  async function planifier() {
    setEnvoi(true);
    const r = await fetch("/api/lancements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom, debut: new Date(debut).toISOString(), fin: fin ? new Date(fin).toISOString() : null }) });
    const d = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) return void toast.error(t(d.error ?? "Planification impossible"));
    toast.success(t("Lancement planifié")); setNom(""); setDebut(""); setFin(""); charger();
  }
  async function annuler(id: string) {
    if (!window.confirm(t("Annuler ce lancement ?"))) return;
    const r = await fetch(`/api/lancements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) { toast.success(t("Lancement annulé")); charger(); } else toast.error(t("Action impossible"));
  }
  const date = (s: string) => new Date(s).toLocaleString(t.loc, { dateStyle: "medium", timeStyle: "short" });

  return (
    <Page width="narrow">
      <PageHeader icon="calendar" title={t("Lancements")} backHref="/dashboard/boutique" />
      <div className="axd-stack">
        <Banner>{t("Le contenu du brouillon est figé au moment de la planification. Vous pouvez continuer à modifier votre brouillon ensuite : il ne sera pas touché.")}</Banner>
        <Card title={t("Planifier un lancement")}>
          {liste !== null && !brouillon ? (
            <div><p className="axd-muted" style={{ marginTop: 0 }}>{t("Préparez d'abord vos changements dans le Constructeur : ils seront enregistrés en brouillon.")}</p><Button href="/dashboard/builder">{t("Ouvrir le Constructeur")}</Button></div>
          ) : (
            <div style={{ display: "grid", gap: "var(--space-300)" }}>
              <Field label={t("Nom")}>{(p) => <input {...p} className="axd-input" placeholder={t("Ex. Soldes de Noël")} value={nom} onChange={(e) => setNom(e.target.value)} />}</Field>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "var(--space-300)" }}>
                <Field label={t("Mise en ligne")}>{(p) => <input {...p} type="datetime-local" className="axd-input" value={debut} onChange={(e) => setDebut(e.target.value)} />}</Field>
                <Field label={t("Retour à la version d'avant (facultatif)")}>{(p) => <input {...p} type="datetime-local" className="axd-input" value={fin} onChange={(e) => setFin(e.target.value)} />}</Field>
              </div>
              <div><Button variant="primary" onClick={planifier} loading={envoi} disabled={!nom.trim() || !debut}>{t("Planifier")}</Button></div>
            </div>
          )}
        </Card>
        {liste === null ? <Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement…")}</p></Card> : liste.length === 0 ? (
          <Card><EmptyState heading={t("Aucun lancement")}>{t("Préparez une opération à l'avance : elle se met en ligne et se retire toute seule.")}</EmptyState></Card>
        ) : (
          <Card title={t("Historique")} padding="none">
            <div style={{ overflowX: "auto" }}>
              <table className="axd-ix">
                <thead><tr><th>{t("Nom")}</th><th>{t("Statut")}</th><th>{t("Début")}</th><th>{t("Fin")}</th><th /></tr></thead>
                <tbody>
                  {liste.map((l) => (
                    <tr key={l.id}>
                      <td className="axd-ix-primary">{l.nom}{l.erreur && <div className="axd-muted" style={{ fontWeight: 400, fontSize: 12, whiteSpace: "normal" }}>{t(l.erreur)}</div>}</td>
                      <td><Badge tone={STATUTS[l.statut]?.tone}>{t(STATUTS[l.statut]?.l ?? l.statut)}</Badge></td>
                      <td>{date(l.debut)}</td>
                      <td>{l.fin ? date(l.fin) : "—"}</td>
                      <td>{l.statut === "planifie" && <Button size="sm" variant="plain" onClick={() => annuler(l.id)}>{t("Annuler")}</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </Page>
  );
}
