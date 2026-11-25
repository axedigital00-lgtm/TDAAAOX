"use client";
// Croissance → Campagnes : popups de la boutique, relances automatiques et badges.
import { useEffect, useState } from "react";
import { Megaphone, ShoppingCart, Trophy } from "lucide-react";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Field, Toggle } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { Modal } from "@/components/dashboard/design-system/components/Modal";
import { EmptyArt } from "@/components/dashboard/design-system/illustrations/Illustration";

const CAMPAGNES_TUTORIAL_STEPS = [
  { Icon: Megaphone,   titre: "Créez des popups",              description: "Popup centré, bandeau ou slide-in : affichez une offre au bon moment (délai, exit intent, scroll, 1ère visite)." },
  { Icon: ShoppingCart, titre: "Automatisez vos relances",       description: "Panier abandonné, bienvenue, après achat, anniversaire, client inactif — un message envoyé automatiquement par email, SMS ou WhatsApp." },
  { Icon: Trophy,       titre: "Débloquez des badges",           description: "Gagnez des badges au fil de vos performances pour suivre votre progression de marchand." },
];

const TABS = [
  { id: "popups", label: "Popups" },
  { id: "automation", label: "Relances automatiques" },
  { id: "badges", label: "Badges" },
];

const FORM_POPUP = { nom: "", type: "popup", declencheur: "delai", delaiSec: 5, titre: "", message: "", ctaTexte: "", ctaUrl: "", codePromo: "" };
const FORM_WORKFLOW = { nom: "", type: "panier_abandonne", delaiHeures: 1, canal: "email", sujet: "", message: "" };

// ─── Popups ───────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = { popup: "Popup centré", bandeau: "Bandeau haut", slide_in: "Slide-in coin" };
const DECL_LABELS: Record<string, string> = { delai: "Après un délai", exit_intent: "Au départ du visiteur", scroll: "À mi-page", premiere_visite: "Première visite" };

function OngletPopups({ creation, setCreation }: { creation: boolean; setCreation: (v: boolean) => void }) {
  const t = useT();
  const [popups, setPopups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(FORM_POPUP);

  const charger = () => fetch("/api/popups").then(r => r.ok ? r.json() : Promise.reject()).then(d => setPopups(d.popups ?? [])).catch(() => toast.error(t("Erreur chargement"))).finally(() => setLoading(false));
  useEffect(() => { charger(); }, []);

  async function creer() {
    setSaving(true);
    const res = await fetch("/api/popups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    setSaving(false);
    if (!res?.ok) { toast.error(t("Erreur lors de la sauvegarde")); return; }
    await charger(); setCreation(false); setForm(FORM_POPUP);
  }
  async function supprimer(id: string) {
    if (!confirm(t("Supprimer ce popup ?"))) return;
    const res = await fetch(`/api/popups?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toast.error(t("Erreur lors de la suppression")); return; }
    setPopups(p => p.filter(x => x.id !== id));
  }
  async function toggle(id: string, actif: boolean) {
    const res = await fetch("/api/popups", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, actif: !actif }) }).catch(() => null);
    if (!res?.ok) { toast.error(t("Erreur lors de la mise à jour")); return; }
    setPopups(p => p.map(x => x.id === id ? { ...x, actif: !actif } : x));
  }

  return (
    <>
      {loading ? <p className="axd-fichiers__etat">{t("Chargement…")}</p> : popups.length === 0 ? (
        <div className="axd-empty">
          <EmptyArt name="campaign" />
          <h3>{t("Affichez une offre au bon moment")}</h3>
          <p>{t("Popup, bandeau ou fenêtre en coin : après un délai, au départ du visiteur, à mi-page ou à sa première visite.")}</p>
          <div className="axd-empty__actions"><Button variant="primary" onClick={() => setCreation(true)}>{t("Créer un popup")}</Button></div>
        </div>
      ) : (
        <div className="axd-ix-wrap">
          <table className="axd-ix">
            <thead><tr><th>{t("Popup")}</th><th className="axd-ix-num">{t("Affichages")}</th><th className="axd-ix-num">{t("Clics")}</th><th>{t("Actif")}</th><th /></tr></thead>
            <tbody>
              {popups.map(p => (
                <tr key={p.id}>
                  <td className="axd-ix-primary">{t(p.nom)}<div className="axd-muted" style={{ fontWeight: 400, fontSize: 12 }}>{t(TYPE_LABELS[p.type])} · {t(DECL_LABELS[p.declencheur])}</div></td>
                  <td className="axd-ix-num">{(p.affichages ?? 0).toLocaleString(t.loc)}</td>
                  <td className="axd-ix-num">{(p.clics ?? 0).toLocaleString(t.loc)}</td>
                  <td><Toggle checked={p.actif} onChange={() => toggle(p.id, p.actif)} label={t("Activer / désactiver")} /></td>
                  <td style={{ textAlign: "right" }}><Button size="sm" variant="plain" onClick={() => supprimer(p.id)}>{t("Supprimer")}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={creation} onClose={() => setCreation(false)} title={t("Nouveau popup")}
        footer={<><Button onClick={() => setCreation(false)}>{t("Annuler")}</Button><Button variant="primary" onClick={creer} loading={saving} disabled={!form.nom || !form.titre || !form.message}>{t("Créer le popup")}</Button></>}>
        <div style={{ display: "grid", gap: "var(--space-300)", padding: "var(--space-400)" }}>
          <Field label={t("Nom interne")}>{(p) => <input {...p} className="axd-input" value={form.nom} onChange={e => setForm(v => ({ ...v, nom: e.target.value }))} />}</Field>
          <div className="axd-grid axd-g2" style={{ gap: "var(--space-300)" }}>
            <Field label={t("Format")}>{(p) => <select {...p} className="axd-input" value={form.type} onChange={e => setForm(v => ({ ...v, type: e.target.value }))}>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}</select>}</Field>
            <Field label={t("Déclenchement")}>{(p) => <select {...p} className="axd-input" value={form.declencheur} onChange={e => setForm(v => ({ ...v, declencheur: e.target.value }))}>{Object.entries(DECL_LABELS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}</select>}</Field>
          </div>
          {form.declencheur === "delai" && (
            <Field label={t("Afficher après (secondes)")}>{(p) => <input {...p} type="number" min={0} max={300} className="axd-input" style={{ maxWidth: 140 }} value={form.delaiSec} onChange={e => setForm(v => ({ ...v, delaiSec: Math.max(0, Number(e.target.value) || 0) }))} />}</Field>
          )}
          <Field label={t("Titre")}>{(p) => <input {...p} className="axd-input" value={form.titre} onChange={e => setForm(v => ({ ...v, titre: e.target.value }))} />}</Field>
          <Field label={t("Message")}>{(p) => <textarea {...p} rows={3} className="axd-input" style={{ height: "auto", padding: "8px 12px" }} value={form.message} onChange={e => setForm(v => ({ ...v, message: e.target.value }))} />}</Field>
          <div className="axd-grid axd-g2" style={{ gap: "var(--space-300)" }}>
            <Field label={t("Texte du bouton")}>{(p) => <input {...p} className="axd-input" value={form.ctaTexte} onChange={e => setForm(v => ({ ...v, ctaTexte: e.target.value }))} />}</Field>
            {/* Sans lien, le bouton fermait seulement la popup. */}
            <Field label={t("Lien du bouton")}>{(p) => <input {...p} className="axd-input" placeholder={t("produits, https://…")} value={form.ctaUrl} onChange={e => setForm(v => ({ ...v, ctaUrl: e.target.value }))} />}</Field>
          </div>
          <Field label={t("Code promo (optionnel)")}>{(p) => <input {...p} className="axd-input" value={form.codePromo} onChange={e => setForm(v => ({ ...v, codePromo: e.target.value }))} />}</Field>
        </div>
      </Modal>
    </>
  );
}

// ─── Relances automatiques ────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, string> = {
  panier_abandonne: "Panier abandonné", bienvenue: "Bienvenue", apres_achat: "Après achat", inactif: "Client inactif",
};
const CANAUX: Record<string, string> = { email: "E-mail", sms: "SMS", whatsapp: "WhatsApp" };

function OngletAutomation({ creation, setCreation }: { creation: boolean; setCreation: (v: boolean) => void }) {
  const t = useT();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(FORM_WORKFLOW);

  const charger = () => fetch("/api/automation").then(r => r.ok ? r.json() : Promise.reject()).then(d => setWorkflows(d.workflows ?? [])).catch(() => toast.error(t("Erreur chargement"))).finally(() => setLoading(false));
  useEffect(() => { charger(); }, []);

  async function creer() {
    setSaving(true);
    const res = await fetch("/api/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    setSaving(false);
    if (!res?.ok) { toast.error(t("Erreur lors de la sauvegarde")); return; }
    await charger(); setCreation(false); setForm(FORM_WORKFLOW);
  }
  async function toggle(id: string, actif: boolean) {
    const res = await fetch("/api/automation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, actif: !actif }) }).catch(() => null);
    if (!res?.ok) { toast.error(t("Erreur lors de la mise à jour")); return; }
    setWorkflows(w => w.map(x => x.id === id ? { ...x, actif: !actif } : x));
  }
  async function supprimer(id: string) {
    if (!confirm(t("Supprimer cette relance ?"))) return;
    const res = await fetch(`/api/automation?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toast.error(t("Erreur lors de la suppression")); return; }
    setWorkflows(w => w.filter(x => x.id !== id));
  }

  return (
    <>
      {loading ? <p className="axd-fichiers__etat">{t("Chargement…")}</p> : workflows.length === 0 ? (
        <div className="axd-empty">
          <h3>{t("Relancez vos clients automatiquement")}</h3>
          <p>{t("Panier abandonné, bienvenue, après achat ou client inactif : un message part tout seul par e-mail ou WhatsApp.")}</p>
          <div className="axd-empty__actions"><Button variant="primary" onClick={() => setCreation(true)}>{t("Créer une relance")}</Button></div>
        </div>
      ) : (
        <div className="axd-ix-wrap">
          <table className="axd-ix">
            <thead><tr><th>{t("Relance")}</th><th className="axd-ix-hide-m">{t("Canal")}</th><th className="axd-ix-num">{t("Envoyés")}</th><th>{t("Active")}</th><th /></tr></thead>
            <tbody>
              {workflows.map(w => (
                <tr key={w.id}>
                  <td className="axd-ix-primary" style={{ whiteSpace: "normal" }}>
                    {t(w.nom)}
                    <div className="axd-muted" style={{ fontWeight: 400, fontSize: 12 }}>{t(TYPE_CONFIG[w.type] ?? w.type)} · {t("après {0} h", w.delaiHeures)}</div>
                    {/* Anciens workflows (anniversaire, SMS) : le moteur ne peut pas les envoyer — on le dit. */}
                    {(!TYPE_CONFIG[w.type] || w.canal === "sms") && (
                      <div style={{ fontWeight: 400, fontSize: 12, color: "var(--color-critical-text)" }}>{w.canal === "sms" ? t("Non envoyé : aucun service SMS n'est branché. Recrée-le en email ou WhatsApp.") : t("Non envoyé : aucune date de naissance n'est enregistrée pour tes clients.")}</div>
                    )}
                  </td>
                  <td className="axd-ix-hide-m">{t(CANAUX[w.canal] ?? w.canal)}</td>
                  <td className="axd-ix-num">{(w.declenchements ?? 0).toLocaleString(t.loc)}</td>
                  <td><Toggle checked={w.actif} onChange={() => toggle(w.id, w.actif)} label={t("Activer / désactiver")} /></td>
                  <td style={{ textAlign: "right" }}><Button size="sm" variant="plain" onClick={() => supprimer(w.id)}>{t("Supprimer")}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={creation} onClose={() => setCreation(false)} title={t("Nouvelle relance automatique")}
        footer={<><Button onClick={() => setCreation(false)}>{t("Annuler")}</Button><Button variant="primary" onClick={creer} loading={saving} disabled={!form.nom || !form.message}>{t("Créer la relance")}</Button></>}>
        <div style={{ display: "grid", gap: "var(--space-300)", padding: "var(--space-400)" }}>
          <Field label={t("Nom")}>{(p) => <input {...p} className="axd-input" value={form.nom} onChange={e => setForm(v => ({ ...v, nom: e.target.value }))} />}</Field>
          <div className="axd-grid axd-g3" style={{ gap: "var(--space-300)" }}>
            <Field label={t("Déclencheur")}>{(p) => <select {...p} className="axd-input" value={form.type} onChange={e => setForm(v => ({ ...v, type: e.target.value }))}>{Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}</select>}</Field>
            <Field label={t("Canal")}>{(p) => <select {...p} className="axd-input" value={form.canal} onChange={e => setForm(v => ({ ...v, canal: e.target.value }))}>{[["email", "E-mail"], ["whatsapp", "WhatsApp"]].map(([c, l]) => <option key={c} value={c}>{t(l)}</option>)}</select>}</Field>
            <Field label={t("Délai (heures)")}>{(p) => <input {...p} type="number" className="axd-input" value={form.delaiHeures} onChange={e => setForm(v => ({ ...v, delaiHeures: +e.target.value }))} />}</Field>
          </div>
          {form.canal === "email" && <Field label={t("Objet de l’e-mail")}>{(p) => <input {...p} className="axd-input" value={form.sujet} onChange={e => setForm(v => ({ ...v, sujet: e.target.value }))} />}</Field>}
          <Field label={t("Message")} help={t("Variables : {{nom}} (prénom du client), {{boutique}}, {{lien}} (lien de ta boutique). Un lien de désinscription est ajouté à chaque message.")}>
            {(p) => <textarea {...p} rows={4} className="axd-input" style={{ height: "auto", padding: "8px 12px" }} value={form.message} onChange={e => setForm(v => ({ ...v, message: e.target.value }))} />}
          </Field>
          {(form.type === "panier_abandonne" || form.type === "inactif") && (
            <Banner>{form.type === "panier_abandonne" ? t("Panier abandonné : paiement en ligne commencé mais pas finalisé.") : t("Client inactif : aucune commande depuis le délai choisi (ex. 720 h = 30 jours).")}</Banner>
          )}
        </div>
      </Modal>
    </>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function OngletBadges() {
  const t = useT();
  const [badges, setBadges] = useState<any[]>([]);
  const [nouveaux, setNouveaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/badges").then(r => r.ok ? r.json() : Promise.reject()).then(d => { setBadges(d.badges ?? []); setNouveaux(d.nouveaux ?? []); }).catch(() => toast.error(t("Erreur chargement"))).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="axd-fichiers__etat">{t("Chargement…")}</p>;
  if (badges.length === 0) return <div className="axd-empty"><h3>{t("Aucun badge disponible")}</h3></div>;
  const obtenus = badges.filter(b => b.obtenu);
  const restants = badges.filter(b => !b.obtenu);

  const liste = (items: any[], gris?: boolean) => (
    <div className="axd-grid axd-g2" style={{ gap: 8 }}>
      {items.map(b => (
        <div key={b.type} className="axd-badge-carte" style={gris ? { opacity: .55 } : undefined}>
          <span aria-hidden style={{ fontSize: 22, filter: gris ? "grayscale(1)" : undefined }}>{b.emoji}</span>
          <div><div style={{ fontWeight: 600, color: "var(--color-text-strong)" }}>{t(b.titre)}</div><div className="axd-muted" style={{ fontSize: 12 }}>{t(b.description)}</div></div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: "var(--space-400)", padding: "var(--space-400)" }}>
      {nouveaux.length > 0 && <Banner tone="success" title={t("Nouveaux badges :")}>{nouveaux.map(b => t(b.titre)).join(", ")}</Banner>}
      {obtenus.length > 0 && <div><p className="axd-field__label" style={{ margin: "0 0 8px" }}>{t("Obtenus")} · {obtenus.length}</p>{liste(obtenus)}</div>}
      {restants.length > 0 && <div><p className="axd-field__label" style={{ margin: "0 0 8px" }}>{t("À obtenir")} · {restants.length}</p>{liste(restants, true)}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CampagnesPage() {
  const t = useT();
  const [onglet, setOnglet] = useState("popups");
  const [creation, setCreation] = useState(false);

  return (
    <Page>
      <ModuleTutorial moduleKey="campagnes" titre={t("Campagnes")} sousTitre={t("Notifications & relances")} steps={CAMPAGNES_TUTORIAL_STEPS} />
      <PageHeader icon="gauge" backHref="/dashboard/marketing"
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{t("Campagnes")}<BoutonRevoirTutoriel moduleKey="campagnes" /></span>}
        primaryAction={onglet === "badges" ? undefined : { content: onglet === "popups" ? t("Créer un popup") : t("Créer une relance"), onAction: () => setCreation(true) }} />

      <div className="axd-card" style={{ overflow: "hidden" }}>
        <div className="axd-ix-bar">
          <div className="axd-ix-tabs" role="tablist">
            {TABS.map(({ id, label }) => <button key={id} type="button" role="tab" aria-selected={onglet === id} className="axd-ix-tab" onClick={() => { setOnglet(id); setCreation(false); }}>{t(label)}</button>)}
          </div>
        </div>
        {onglet === "popups" && <OngletPopups creation={creation} setCreation={setCreation} />}
        {onglet === "automation" && <OngletAutomation creation={creation} setCreation={setCreation} />}
        {onglet === "badges" && <OngletBadges />}
      </div>
    </Page>
  );
}
