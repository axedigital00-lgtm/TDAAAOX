"use client";
// Comptes entreprises : conditions de paiement, remise, plafond, encours et lien de commande rapide.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Card, EmptyState, Field, Toggle } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { Modal } from "@/components/dashboard/design-system/components/Modal";
import { LIBELLES_CONDITIONS, type ConditionPaiement } from "@/lib/commerce/regles";
import { formatMontant } from "@/lib/utils";

type Entreprise = { id: string; nom: string; contactNom: string | null; email: string | null; telephone: string; adresse: string | null; ville: string | null; pays: string | null; identifiantFiscal: string | null; conditions: ConditionPaiement; remisePct: number; plafond: number | null; actif: boolean; lien: string; encours: number };
const VIDE = { nom: "", contactNom: "", email: "", telephone: "", adresse: "", ville: "", pays: "", identifiantFiscal: "", conditions: "comptant" as ConditionPaiement, remisePct: 0, plafond: "", actif: true };

export default function EntreprisesPage() {
  const t = useT();
  const [liste, setListe] = useState<Entreprise[] | null>(null);
  const [devise, setDevise] = useState("XAF");
  const [edite, setEdite] = useState<string | "nouveau" | null>(null);
  const [f, setF] = useState(VIDE);
  const [envoi, setEnvoi] = useState(false);

  const charger = () => fetch("/api/entreprises").then((r) => r.json()).then((d) => { setListe(d.entreprises ?? []); setDevise(d.devise ?? "XAF"); }).catch(() => setListe([]));
  useEffect(() => { charger(); }, []);

  function ouvrir(e?: Entreprise) {
    setF(e ? { nom: e.nom, contactNom: e.contactNom ?? "", email: e.email ?? "", telephone: e.telephone, adresse: e.adresse ?? "", ville: e.ville ?? "", pays: e.pays ?? "", identifiantFiscal: e.identifiantFiscal ?? "", conditions: e.conditions, remisePct: e.remisePct, plafond: e.plafond == null ? "" : String(e.plafond), actif: e.actif } : VIDE);
    setEdite(e?.id ?? "nouveau");
  }

  async function enregistrer() {
    setEnvoi(true);
    const corps = { ...f, email: f.email || null, plafond: f.plafond === "" ? null : Number(f.plafond) };
    const r = await fetch(edite === "nouveau" ? "/api/entreprises" : `/api/entreprises/${edite}`, { method: edite === "nouveau" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const d = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) return void toast.error(t(d.error ?? "Enregistrement impossible"));
    toast.success(t("Entreprise enregistrée")); setEdite(null); charger();
  }

  async function nouveauLien(id: string) {
    if (!window.confirm(t("Créer un nouveau lien ? L'ancien cessera de fonctionner."))) return;
    const r = await fetch(`/api/entreprises/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nouveauLien: true }) });
    if (r.ok) { toast.success(t("Nouveau lien créé")); charger(); } else toast.error(t("Action impossible"));
  }

  const champ = (k: "nom" | "contactNom" | "email" | "telephone" | "adresse" | "ville" | "pays" | "identifiantFiscal", label: string) => (
    <Field label={t(label)}>{(p) => <input {...p} className="axd-input" value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} />}</Field>
  );

  return (
    <Page>
      <PageHeader icon="users" title={t("Entreprises")} backHref="/dashboard/clients" primaryAction={{ content: t("Ajouter une entreprise"), onAction: () => ouvrir() }} />
      {liste === null ? <Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement…")}</p></Card> : liste.length === 0 ? (
        <Card><EmptyState heading={t("Vendez aux professionnels")}>{t("Créez un compte par entreprise avec ses conditions de paiement et sa remise. Elle commande en quelques clics depuis son lien privé.")}</EmptyState></Card>
      ) : (
        <Card padding="none">
          <div style={{ overflowX: "auto" }}>
            <table className="axd-ix">
              <thead><tr><th>{t("Entreprise")}</th><th>{t("Paiement")}</th><th>{t("Remise")}</th><th>{t("Encours")}</th><th>{t("Commande rapide")}</th></tr></thead>
              <tbody>
                {liste.map((e) => (
                  <tr key={e.id}>
                    <td className="axd-ix-primary"><button type="button" className="axd-btn axd-btn--plain axd-btn--sm" onClick={() => ouvrir(e)}>{e.nom}</button>{!e.actif && <> <Badge>{t("Inactif")}</Badge></>}</td>
                    <td>{t(LIBELLES_CONDITIONS[e.conditions])}</td>
                    <td>{e.remisePct} %</td>
                    <td>{formatMontant(e.encours, devise)}{e.plafond != null && <span className="axd-muted"> / {formatMontant(e.plafond, devise)}</span>}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <Button size="sm" onClick={() => { navigator.clipboard?.writeText(e.lien); toast.success(t("Lien copié")); }}>{t("Copier le lien")}</Button>{" "}
                      <Button size="sm" variant="plain" onClick={() => nouveauLien(e.id)}>{t("Renouveler")}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={edite !== null} onClose={() => setEdite(null)} size="lg" title={edite === "nouveau" ? t("Nouvelle entreprise") : t("Modifier l'entreprise")}
        footer={<><Button onClick={() => setEdite(null)}>{t("Fermer")}</Button><Button variant="primary" onClick={enregistrer} loading={envoi} disabled={!f.nom.trim() || f.telephone.trim().length < 6}>{t("Enregistrer")}</Button></>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "var(--space-300)" }}>
          {champ("nom", "Raison sociale")}{champ("contactNom", "Contact")}{champ("telephone", "Téléphone")}{champ("email", "E-mail")}
          {champ("adresse", "Adresse")}{champ("ville", "Ville")}{champ("pays", "Pays")}{champ("identifiantFiscal", "Identifiant fiscal (NIU, NINEA…)")}
          <Field label={t("Conditions de paiement")}>{(p) => <select {...p} className="axd-input" value={f.conditions} onChange={(e) => setF((x) => ({ ...x, conditions: e.target.value as ConditionPaiement }))}>{Object.entries(LIBELLES_CONDITIONS).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select>}</Field>
          <Field label={t("Remise (%)")}>{(p) => <input {...p} type="number" min={0} max={90} className="axd-input" value={f.remisePct} onChange={(e) => setF((x) => ({ ...x, remisePct: Math.min(Math.max(Number(e.target.value) || 0, 0), 90) }))} />}</Field>
          <Field label={t("Plafond de crédit ({0})").replace("{0}", devise)} help={t("Vide = sans plafond")}>{(p) => <input {...p} type="number" min={0} className="axd-input" value={f.plafond} onChange={(e) => setF((x) => ({ ...x, plafond: e.target.value }))} />}</Field>
        </div>
        <div style={{ marginTop: 14 }}><Toggle checked={f.actif} onChange={(v) => setF((x) => ({ ...x, actif: v }))} label={t("Compte actif")} /></div>
      </Modal>
    </Page>
  );
}
