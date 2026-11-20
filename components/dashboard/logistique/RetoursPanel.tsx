"use client";

import { Fragment, useEffect, useState } from "react";
import { CheckCircle, Clock, Plus, ChevronDown } from "lucide-react";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { Modal } from "@/components/dashboard/design-system/components/Modal";
import { Field } from "@/components/dashboard/design-system/components/primitives";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";

const RETOURS_TUTORIAL_STEPS = [
  { Icon: Plus,         titre: "Crée un retour",       description: "Renseigne le numéro d'une commande livrée, la raison et le type de résolution (remboursement, échange, avoir)." },
  { Icon: Clock,        titre: "Suis la progression",  description: "Fais passer un retour de \"Ouvert\" à \"En cours\" pendant qu'il est traité." },
  { Icon: CheckCircle,  titre: "Accepte ou rejette",   description: "Accepter un remboursement rembourse toute la commande (argent, stock, accès digitaux). Sinon, rejette ou clos." },
  { Icon: ChevronDown,  titre: "Consulte les détails", description: "Clique sur une ligne pour voir la description, l'email du client et les notes internes." },
];

interface Retour {
  id: string;
  commandeId: string;
  clientNom: string;
  clientEmail: string | null;
  raison: string;
  description: string | null;
  type: string;
  statut: string;
  montant: number | null;
  notes: string | null;
  createdAt: string;
  commande: { numero: string; montantTotal: number; devise: string };
}

interface Stats {
  total: number;
  ouverts: number;
  enCours: number;
  acceptes: number;
}

const STATUT_CONFIG: Record<string, { label: string; tone: "attention" | "info" | "success" | "critical" | "neutral" }> = {
  ouvert: { label: "Ouvert", tone: "attention" },
  en_cours: { label: "En cours", tone: "info" },
  accepte: { label: "Accepté", tone: "success" },
  rejete: { label: "Rejeté", tone: "critical" },
  clos: { label: "Clos", tone: "neutral" },
};

const RAISON_LABELS: Record<string, string> = {
  defaut: "Produit défectueux",
  erreur_commande: "Erreur de commande",
  change_avis: "Changement d'avis",
  endommage: "Produit endommagé",
  non_recu: "Non reçu",
};

const TYPE_LABELS: Record<string, string> = {
  remboursement: "Remboursement",
  echange: "Échange",
  avoir: "Avoir",
};

export function RetoursPanel() {
  const t = useT();
  const [retours, setRetours] = useState<Retour[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, ouverts: 0, enCours: 0, acceptes: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    commande: "", raison: "defaut", description: "", type: "remboursement",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/retours")
      .then((r) => r.json())
      .then((d) => { setRetours(d.retours ?? []); setStats(d.stats ?? {}); })
      .finally(() => setLoading(false));
  }, []);

  async function updateStatut(id: string, statut: string) {
    const res = await fetch("/api/retours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, statut }),
    });
    const data = await res.json();
    if (data.retour) setRetours((prev) => prev.map((r) => r.id === id ? { ...r, statut } : r));
    else alert(t(data.error || "Erreur"));
  }

  async function createRetour() {
    setSaving(true);
    const res = await fetch("/api/retours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.retour) {
      setRetours((prev) => [data.retour, ...prev]);
      setShowForm(false);
    } else alert(t(data.error || "Erreur"));
    setSaving(false);
  }

  if (loading) return <div className="axd-card"><p className="axd-fichiers__etat">{t("Chargement…")}</p></div>;

  return (
    <div className="axd-stack">
      <ModuleTutorial moduleKey="logistique-retours" titre={t("Retours")} sousTitre={t("Gestion des retours & RMA")} steps={RETOURS_TUTORIAL_STEPS} />

      <div className="axd-grid axd-g4">
        {[
          { label: "Total", value: stats.total },
          { label: "Ouverts", value: stats.ouverts },
          { label: "En cours", value: stats.enCours },
          { label: "Acceptés", value: stats.acceptes },
        ].map(({ label, value }) => (
          <div key={label} className="axd-card axd-card--pad">
            <div className="axd-kpi__t">{t(label)}</div>
            <div className="axd-kpi__v" style={{ marginBottom: 0 }}>{(value ?? 0).toLocaleString(t.loc)}</div>
          </div>
        ))}
      </div>

      <div className="axd-card" style={{ overflow: "hidden" }}>
        <div className="axd-card__head" style={{ padding: "var(--space-300) var(--space-400)" }}>
          <h2 className="axd-card__title">{t("Demandes de retour")}</h2>
          <Button size="sm" onClick={() => setShowForm(true)}>{t("Créer un retour")}</Button>
        </div>
        {retours.length === 0 ? (
          <div className="axd-empty">
            <h3>{t("Aucun retour pour l'instant")}</h3>
            <p>{t("Créez un retour à partir d’une commande livrée : remboursement, échange ou avoir.")}</p>
          </div>
        ) : (
          <div className="axd-ix-wrap">
            <table className="axd-ix">
              <thead><tr><th>{t("Client")}</th><th>{t("Commande")}</th><th className="axd-ix-hide-m">{t("Raison")}</th><th>{t("Statut")}</th><th className="axd-ix-num">{t("Montant")}</th><th className="axd-ix-hide-m">{t("Date")}</th><th style={{ width: 36 }} /></tr></thead>
              <tbody>
                {retours.map((r) => {
                  const sc = STATUT_CONFIG[r.statut] ?? { label: r.statut, tone: "neutral" as const };
                  const ouvert = expanded === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr className="axd-ix-link" onClick={() => setExpanded(ouvert ? null : r.id)} aria-expanded={ouvert}>
                        <td className="axd-ix-primary">{t(r.clientNom)}<div className="axd-muted" style={{ fontWeight: 400, fontSize: 12 }}>{t(TYPE_LABELS[r.type] ?? r.type)}</div></td>
                        <td>{r.commande.numero}</td>
                        <td className="axd-ix-hide-m">{t(RAISON_LABELS[r.raison] ?? r.raison)}</td>
                        <td><Badge tone={sc.tone}>{t(sc.label)}</Badge></td>
                        <td className="axd-ix-num">{r.montant ? `${r.montant.toLocaleString(t.loc)} ${r.commande.devise === "XAF" ? "FCFA" : r.commande.devise}` : "—"}</td>
                        <td className="axd-ix-hide-m">{new Date(r.createdAt).toLocaleDateString(t.loc, { day: "numeric", month: "short" })}</td>
                        <td><ChevronDown size={14} style={{ transform: ouvert ? "rotate(180deg)" : "none", color: "var(--color-icon)" }} /></td>
                      </tr>
                      {ouvert && (
                        <tr>
                          <td colSpan={7} style={{ background: "var(--color-surface-secondary)", whiteSpace: "normal" }}>
                            <div style={{ display: "grid", gap: 8, padding: "4px 0" }}>
                              {r.description && <p style={{ margin: 0 }}>{t(r.description)}</p>}
                              {r.clientEmail && <p className="axd-muted" style={{ margin: 0, overflowWrap: "anywhere" }}>{t("Email client :")} {r.clientEmail}</p>}
                              {r.statut === "accepte" && r.type === "remboursement" && <p style={{ margin: 0, color: "var(--badge-success-text)" }}>{t("Commande remboursée.")}</p>}
                              {r.notes && <p className="axd-muted" style={{ margin: 0 }}>{t("Note :")} {t(r.notes)}</p>}
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {r.statut !== "accepte" && <Button size="sm" variant="primary" onClick={() => updateStatut(r.id, "accepte")}>{t("Accepter")}</Button>}
                                {r.statut !== "accepte" && r.statut !== "en_cours" && r.statut !== "clos" && <Button size="sm" onClick={() => updateStatut(r.id, "en_cours")}>{t("Passer en cours")}</Button>}
                                {r.statut !== "accepte" && r.statut !== "rejete" && <Button size="sm" variant="critical" onClick={() => updateStatut(r.id, "rejete")}>{t("Rejeter")}</Button>}
                                {r.statut !== "clos" && <Button size="sm" variant="plain" onClick={() => updateStatut(r.id, "clos")}>{t("Clore")}</Button>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t("Nouveau retour")}
        footer={<><Button onClick={() => setShowForm(false)}>{t("Annuler")}</Button><Button variant="primary" onClick={createRetour} loading={saving} disabled={!form.commande.trim()}>{t("Créer le retour")}</Button></>}>
        <div style={{ display: "grid", gap: "var(--space-300)", padding: "var(--space-400)" }}>
          <Field label={t("N° de commande (livrée)")}>{(p) => <input {...p} className="axd-input" placeholder="AX-20261007-1234" value={form.commande} onChange={(e) => setForm((f) => ({ ...f, commande: e.target.value }))} />}</Field>
          <div className="axd-grid axd-g2" style={{ gap: "var(--space-300)" }}>
            <Field label={t("Raison")}>{(p) => (
              <select {...p} className="axd-input" value={form.raison} onChange={(e) => setForm((f) => ({ ...f, raison: e.target.value }))}>
                {Object.entries(RAISON_LABELS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
              </select>
            )}</Field>
            <Field label={t("Type de résolution")}>{(p) => (
              <select {...p} className="axd-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
              </select>
            )}</Field>
          </div>
          <Field label={t("Description (optionnel)")}>{(p) => <textarea {...p} className="axd-input" rows={3} style={{ height: "auto", padding: "8px 12px" }} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />}</Field>
          <p className="axd-muted" style={{ margin: 0, fontSize: 12 }}>{t("Accepter un remboursement rembourse toute la commande (argent, stock, accès digitaux).")}</p>
        </div>
      </Modal>
    </div>
  );
}
