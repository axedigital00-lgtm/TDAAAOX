"use client";
// Campagnes : popups de la vitrine, relances automatiques, badges du marchand.
import { useEffect, useState } from "react";
import { Megaphone, ShoppingCart, Trophy } from "lucide-react";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { toast } from "sonner";
import {
  Badge, Banner, Button, Card, EmptyState, IconButton, IndexTable, Modal, Select, Tabs, TextField, Textarea, Toggle,
  type Column,
} from "@/components/ui/adm";
import { Icon } from "@/components/ui/icones";
import { IllustrationCampagnes, IllustrationGenerique } from "@/components/ui/illustrations";
import { EnTeteModule } from "../clients/EnTeteModule";
import { Chargement, ErreurChargement, useConfirmationAdm } from "../marketing/kit-marketing";

const CAMPAGNES_TUTORIAL_STEPS = [
  { Icon: Megaphone,    titre: "Créez des popups",        description: "Popup centré, bandeau ou slide-in : affichez une offre au bon moment (délai, exit intent, scroll, 1ère visite)." },
  { Icon: ShoppingCart, titre: "Automatisez vos relances", description: "Panier abandonné, bienvenue, après achat, anniversaire, client inactif — un message envoyé automatiquement par email, SMS ou WhatsApp." },
  { Icon: Trophy,       titre: "Débloquez des badges",     description: "Gagnez des badges au fil de vos performances pour suivre votre progression de marchand." },
];

const ONGLETS = [
  { id: "popups", label: "Popups" },
  { id: "automation", label: "Relances automatiques" },
  { id: "badges", label: "Badges" },
];

const TABLE = "overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)";

// ─── Onglet Popups ────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = { popup: "Popup centré", bandeau: "Bandeau haut", slide_in: "Slide-in coin" };
const DECL_LABELS: Record<string, string> = { delai: "Après un délai", exit_intent: "Au départ du visiteur", scroll: "À mi-page", premiere_visite: "Première visite" };
const POPUP_VIDE = { nom: "", type: "popup", declencheur: "delai", delaiSec: 5, titre: "", message: "", ctaTexte: "", ctaUrl: "", codePromo: "" };

function OngletPopups() {
  const t = useT();
  const { confirmer, dialogue } = useConfirmationAdm();
  const [popups, setPopups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(POPUP_VIDE);

  const charger = () => {
    setErreur(false);
    return fetch("/api/popups").then(r => r.ok ? r.json() : Promise.reject()).then(d => setPopups(d.popups ?? [])).catch(() => setErreur(true)).finally(() => setLoading(false));
  };
  useEffect(() => { charger(); }, []);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/popups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    setSaving(false);
    if (!res?.ok) { toast.error(t("Le popup n'a pas été créé. Vérifiez les champs et réessayez.")); return; }
    toast.success(t("Popup « {0} » créé.", form.nom));
    await charger(); setShowForm(false);
    setForm(POPUP_VIDE);
  }

  async function supprimer(p: any) {
    if (!(await confirmer({ titre: t("Supprimer ce popup ?"), objet: p.nom, description: t("Il ne s'affichera plus sur votre boutique et ses statistiques seront perdues."), libelleConfirmer: t("Supprimer le popup") }))) return;
    const res = await fetch(`/api/popups?id=${p.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toast.error(t("Le popup n'a pas été supprimé. Réessayez.")); return; }
    toast.success(t("Popup « {0} » supprimé.", p.nom));
    setPopups(x => x.filter(y => y.id !== p.id));
  }

  async function toggle(id: string, actif: boolean) {
    const res = await fetch("/api/popups", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, actif: !actif }) }).catch(() => null);
    if (!res?.ok) { toast.error(t("Le changement n'a pas été enregistré. Réessayez.")); return; }
    setPopups(p => p.map(x => x.id === id ? { ...x, actif: !actif } : x));
  }

  if (loading) return <Chargement />;
  if (erreur) return <ErreurChargement titre={t("Les popups n'ont pas pu être chargés")} onReessayer={charger} />;

  const set = (patch: Partial<typeof POPUP_VIDE>) => setForm(v => ({ ...v, ...patch }));
  const colonnes: Column<any>[] = [
    { id: "nom", header: t("Popup"), mobilePrimary: true, cell: (p) => (
      <span className="block"><span className="block truncate">{t(p.nom)}</span>
        <span className="block text-xs font-normal text-(--color-text-secondary)">{t(TYPE_LABELS[p.type])} · {t(DECL_LABELS[p.declencheur])}</span></span>
    ) },
    { id: "statut", header: t("Statut"), cell: (p) => <Badge tone={p.actif ? "success" : "neutral"}>{p.actif ? t("Actif") : t("Inactif")}</Badge> },
    { id: "affichages", header: t("Affichages"), numeric: true, align: "end", cell: (p) => p.affichages },
    { id: "clics", header: t("Clics"), numeric: true, align: "end", cell: (p) => p.clics },
    { id: "actions", header: "", align: "end", cell: (p) => (
      <span className="inline-flex items-center gap-2">
        <Toggle checked={p.actif} onChange={() => toggle(p.id, p.actif)} label={p.actif ? t("Désactiver « {0} »", p.nom) : t("Activer « {0} »", p.nom)} />
        <IconButton icon="x" aria-label={t("Supprimer « {0} »", p.nom)} onClick={() => supprimer(p)} />
      </span>
    ) },
  ];

  return (
    <div className="space-y-3">
      {dialogue}
      {popups.length === 0 ? (
        <EmptyState title={t("Aucun popup pour l'instant")} image={<IllustrationCampagnes />}
          actions={<Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>{t("Créer un popup")}</Button>}>
          {t("Un popup affiche une offre ou un code promo aux visiteurs de votre boutique, au moment que vous choisissez.")}
        </EmptyState>
      ) : (
        <>
          <div className="flex justify-end"><Button icon="plus" onClick={() => setShowForm(true)}>{t("Créer un popup")}</Button></div>
          <div className={TABLE}><IndexTable label={t("Popups")} rows={popups} columns={colonnes} getId={(p) => p.id} /></div>
        </>
      )}

      <Modal open={showForm} onClose={() => !saving && setShowForm(false)} title={t("Nouveau popup")}
        footer={<>
          <Button onClick={() => setShowForm(false)} disabled={saving}>{t("Annuler")}</Button>
          <Button variant="primary" type="submit" form="form-popup" loading={saving} disabled={!form.nom || !form.titre || !form.message}>{t("Créer le popup")}</Button>
        </>}>
        <form id="form-popup" onSubmit={creer} className="space-y-3">
          <TextField label={t("Nom interne")} required helpText={t("Visible par vous seul, pour le retrouver.")} value={form.nom} onChange={e => set({ nom: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label={t("Format")} value={form.type} onChange={e => set({ type: e.target.value })}
              options={Object.entries(TYPE_LABELS).map(([value, l]) => ({ value, label: t(l) }))} />
            <Select label={t("Moment d'affichage")} value={form.declencheur} onChange={e => set({ declencheur: e.target.value })}
              options={Object.entries(DECL_LABELS).map(([value, l]) => ({ value, label: t(l) }))} />
          </div>
          {form.declencheur === "delai" && (
            <TextField label={t("Afficher après (secondes)")} type="number" min={0} max={300} value={form.delaiSec}
              onChange={e => set({ delaiSec: Math.max(0, Number(e.target.value) || 0) })} />
          )}
          <TextField label={t("Titre")} required value={form.titre} onChange={e => set({ titre: e.target.value })} />
          <Textarea label={t("Message")} required rows={2} value={form.message} onChange={e => set({ message: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={t("Texte du bouton (facultatif)")} value={form.ctaTexte} onChange={e => set({ ctaTexte: e.target.value })} />
            <TextField label={t("Lien du bouton (facultatif)")} placeholder={t("produits, https://…")} helpText={t("Sans lien, le bouton ferme simplement le popup.")} value={form.ctaUrl} onChange={e => set({ ctaUrl: e.target.value })} />
          </div>
          <TextField label={t("Code promo (facultatif)")} value={form.codePromo} onChange={e => set({ codePromo: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}

// ─── Onglet Automation ────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string }> = {
  panier_abandonne: { label: "Panier abandonné" },
  bienvenue: { label: "Bienvenue" },
  apres_achat: { label: "Après achat" },
  inactif: { label: "Client inactif" },
};
const CANAUX: Record<string, string> = { email: "Email", whatsapp: "WhatsApp", sms: "SMS" };
const WORKFLOW_VIDE = { nom: "", type: "panier_abandonne", delaiHeures: 1, canal: "email", sujet: "", message: "" };

function OngletAutomation() {
  const t = useT();
  const { confirmer, dialogue } = useConfirmationAdm();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(WORKFLOW_VIDE);

  const charger = () => {
    setErreur(false);
    return fetch("/api/automation").then(r => r.ok ? r.json() : Promise.reject()).then(d => setWorkflows(d.workflows ?? [])).catch(() => setErreur(true)).finally(() => setLoading(false));
  };
  useEffect(() => { charger(); }, []);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    setSaving(false);
    if (!res?.ok) { toast.error(t("La relance n'a pas été créée. Vérifiez les champs et réessayez.")); return; }
    toast.success(t("Relance « {0} » créée.", form.nom));
    await charger(); setShowForm(false);
    setForm(WORKFLOW_VIDE);
  }

  async function toggle(id: string, actif: boolean) {
    const res = await fetch("/api/automation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, actif: !actif }) }).catch(() => null);
    if (!res?.ok) { toast.error(t("Le changement n'a pas été enregistré. Réessayez.")); return; }
    setWorkflows(w => w.map(x => x.id === id ? { ...x, actif: !actif } : x));
  }

  async function supprimer(w: any) {
    if (!(await confirmer({ titre: t("Supprimer cette relance ?"), objet: w.nom, description: t("Plus aucun message ne sera envoyé par cette relance. Les messages déjà envoyés ne sont pas concernés."), libelleConfirmer: t("Supprimer la relance") }))) return;
    const res = await fetch(`/api/automation?id=${w.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toast.error(t("La relance n'a pas été supprimée. Réessayez.")); return; }
    toast.success(t("Relance « {0} » supprimée.", w.nom));
    setWorkflows(x => x.filter(y => y.id !== w.id));
  }

  if (loading) return <Chargement />;
  if (erreur) return <ErreurChargement titre={t("Les relances n'ont pas pu être chargées")} onReessayer={charger} />;

  const set = (patch: Partial<typeof WORKFLOW_VIDE>) => setForm(v => ({ ...v, ...patch }));
  const colonnes: Column<any>[] = [
    { id: "nom", header: t("Relance"), mobilePrimary: true, cell: (w) => (
      <span className="block">
        <span className="block truncate">{t(w.nom)}</span>
        {/* Anciens workflows (anniversaire, SMS) : le moteur ne peut pas les envoyer — on le dit. */}
        {(!TYPE_CONFIG[w.type] || w.canal === "sms") && (
          <span className="block text-xs font-normal text-(--color-critical-text)">
            {w.canal === "sms" ? t("Non envoyé : aucun service SMS n'est branché. Recréez-le en email ou WhatsApp.") : t("Non envoyé : aucune date de naissance n'est enregistrée pour vos clients.")}
          </span>
        )}
      </span>
    ) },
    { id: "declencheur", header: t("Déclencheur"), cell: (w) => t(TYPE_CONFIG[w.type]?.label ?? w.type) },
    { id: "canal", header: t("Canal"), hideOnMobile: true, cell: (w) => t(CANAUX[w.canal] ?? w.canal) },
    { id: "delai", header: t("Délai"), numeric: true, align: "end", cell: (w) => t("{0} h", w.delaiHeures) },
    { id: "envois", header: t("Messages envoyés"), numeric: true, align: "end", cell: (w) => w.declenchements },
    { id: "statut", header: t("Statut"), cell: (w) => <Badge tone={w.actif ? "success" : "neutral"}>{w.actif ? t("Actif") : t("Inactif")}</Badge> },
    { id: "actions", header: "", align: "end", cell: (w) => (
      <span className="inline-flex items-center gap-2">
        <Toggle checked={w.actif} onChange={() => toggle(w.id, w.actif)} label={w.actif ? t("Désactiver « {0} »", w.nom) : t("Activer « {0} »", w.nom)} />
        <IconButton icon="x" aria-label={t("Supprimer « {0} »", w.nom)} onClick={() => supprimer(w)} />
      </span>
    ) },
  ];

  return (
    <div className="space-y-3">
      {dialogue}
      {workflows.length === 0 ? (
        <EmptyState title={t("Aucune relance automatique")} image={<IllustrationCampagnes />}
          actions={<Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>{t("Créer une relance")}</Button>}>
          {t("Une relance envoie un message à vos clients au bon moment (panier abandonné, après un achat…), sans que vous ayez à y penser.")}
        </EmptyState>
      ) : (
        <>
          <div className="flex justify-end"><Button icon="plus" onClick={() => setShowForm(true)}>{t("Créer une relance")}</Button></div>
          <div className={TABLE}><IndexTable label={t("Relances automatiques")} rows={workflows} columns={colonnes} getId={(w) => w.id} /></div>
        </>
      )}

      <Modal open={showForm} onClose={() => !saving && setShowForm(false)} title={t("Nouvelle relance automatique")}
        footer={<>
          <Button onClick={() => setShowForm(false)} disabled={saving}>{t("Annuler")}</Button>
          <Button variant="primary" type="submit" form="form-relance" loading={saving} disabled={!form.nom || !form.message}>{t("Créer la relance")}</Button>
        </>}>
        <form id="form-relance" onSubmit={creer} className="space-y-3">
          <TextField label={t("Nom de la relance")} required value={form.nom} onChange={e => set({ nom: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label={t("Déclencheur")} value={form.type} onChange={e => set({ type: e.target.value })}
              options={Object.entries(TYPE_CONFIG).map(([value, v]) => ({ value, label: t(v.label) }))} />
            <Select label={t("Canal")} value={form.canal} onChange={e => set({ canal: e.target.value })}
              options={[{ value: "email", label: t("Email") }, { value: "whatsapp", label: t("WhatsApp") }]} />
            <TextField label={t("Délai (heures)")} type="number" value={form.delaiHeures} onChange={e => set({ delaiHeures: +e.target.value })} />
          </div>
          {form.type === "panier_abandonne" && <p className="text-xs text-(--color-text-secondary)">{t("Panier abandonné : paiement en ligne commencé mais pas finalisé.")}</p>}
          {form.type === "inactif" && <p className="text-xs text-(--color-text-secondary)">{t("Client inactif : aucune commande depuis le délai choisi (ex. 720 h = 30 jours).")}</p>}
          {form.canal === "email" && <TextField label={t("Sujet de l'email")} value={form.sujet} onChange={e => set({ sujet: e.target.value })} />}
          <Textarea label={t("Message")} required rows={3} value={form.message} onChange={e => set({ message: e.target.value })}
            helpText={t("Variables : {{nom}} (prénom du client), {{boutique}}, {{lien}} (lien de votre boutique). Un lien de désinscription est ajouté à chaque message.")} />
        </form>
      </Modal>
    </div>
  );
}

// ─── Onglet Badges ────────────────────────────────────────────────────────────
function OngletBadges() {
  const t = useT();
  const [badges, setBadges] = useState<any[]>([]);
  const [nouveaux, setNouveaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);

  const charger = () => {
    setErreur(false); setLoading(true);
    fetch("/api/badges").then(r => r.ok ? r.json() : Promise.reject()).then(d => { setBadges(d.badges ?? []); setNouveaux(d.nouveaux ?? []); }).catch(() => setErreur(true)).finally(() => setLoading(false));
  };
  useEffect(charger, []);

  if (loading) return <Chargement />;
  if (erreur) return <ErreurChargement titre={t("Les badges n'ont pas pu être chargés")} onReessayer={charger} />;
  if (badges.length === 0) return (
    <EmptyState title={t("Aucun badge disponible")} image={<IllustrationGenerique />}>
      {t("Les badges se débloquent au fil de vos ventes et de votre activité.")}
    </EmptyState>
  );

  const obtenus = badges.filter(b => b.obtenu);
  const restants = badges.filter(b => !b.obtenu);
  const grille = (liste: any[], grise: boolean) => (
    <div className="grid grid-cols-1 gap-px sm:grid-cols-2">
      {liste.map(b => (
        <div key={b.type} className="flex items-center gap-3 py-2">
          <Icon name={grise ? "lock" : "star"} className={grise ? "text-(--color-text-subdued)" : "text-(--color-text-strong)"} />
          <div>
            <p className={`font-semibold ${grise ? "text-(--color-text-secondary)" : "text-(--color-text-strong)"}`}>{t(b.titre)}</p>
            <p className="text-xs text-(--color-text-secondary)">{t(b.description)}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {nouveaux.length > 0 && (
        <Banner tone="success" title={t("Nouveaux badges !")}>
          {nouveaux.map(b => t(b.titre)).join(" · ")}
        </Banner>
      )}
      {obtenus.length > 0 && <Card title={t("Obtenus ({0})", obtenus.length)}>{grille(obtenus, false)}</Card>}
      {restants.length > 0 && <Card title={t("À obtenir ({0})", restants.length)}>{grille(restants, true)}</Card>}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CampagnesPage() {
  const t = useT();
  const [onglet, setOnglet] = useState("popups");

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <ModuleTutorial moduleKey="campagnes" titre={t("Campagnes")} sousTitre={t("Notifications & relances")} steps={CAMPAGNES_TUTORIAL_STEPS} />
      <EnTeteModule icon="bolt" title={t("Campagnes")} tutoriel="campagnes" />
      <Tabs label={t("Sections des campagnes")} selected={onglet} onSelect={setOnglet} tabs={ONGLETS.map(o => ({ id: o.id, label: t(o.label) }))} />
      {onglet === "popups" && <OngletPopups />}
      {onglet === "automation" && <OngletAutomation />}
      {onglet === "badges" && <OngletBadges />}
    </div>
  );
}
