"use client";
// Automatisations : workflows de relance (panier abandonné, bienvenue, après achat, inactif…).
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import {
  Badge, Button, EmptyState, IconButton, IndexTable, Modal, PageHeader, ResourceList, Select, SettingsRow, TextField, Textarea, Toggle,
  type Column,
} from "@/components/ui/adm";
import { IllustrationCampagnes } from "@/components/ui/illustrations";
import { Chargement, Chiffres, ErreurChargement, useConfirmationAdm } from "../marketing/kit-marketing";

interface Workflow {
  id: string;
  nom: string;
  type: string;
  actif: boolean;
  delaiHeures: number;
  canal: string;
  sujet: string | null;
  message: string;
  declenchements: number;
  conversions: number;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { label: string; description: string }> = {
  panier_abandonne: { label: "Panier abandonné", description: "Relance les visiteurs qui n'ont pas finalisé leur achat" },
  bienvenue:        { label: "Bienvenue",        description: "Accueille les nouveaux clients avec un message personnalisé" },
  apres_achat:      { label: "Après achat",      description: "Remercie et fidélise après une commande confirmée" },
  anniversaire:     { label: "Anniversaire",     description: "Félicite vos clients le jour de leur anniversaire" },
  inactif:          { label: "Client inactif",   description: "Relance les clients sans achat depuis 30+ jours" },
};
const CANAUX: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
const FORM_VIDE = { nom: "", type: "panier_abandonne", delaiHeures: 1, canal: "email", sujet: "", message: "" };

export default function AutomationPage() {
  const t = useT();
  const { confirmer, dialogue } = useConfirmationAdm();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);

  const charger = () => {
    setLoading(true); setErreur(false);
    fetch("/api/automation")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setWorkflows(d.workflows ?? []))
      .catch(() => setErreur(true))
      .finally(() => setLoading(false));
  };
  useEffect(charger, []);

  async function saveWorkflow() {
    setSaving(true);
    const res = await fetch("/api/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (!data.workflow) { toast.error(t("Le workflow n'a pas été créé. Vérifiez les champs et réessayez.")); return; }
    setWorkflows((prev) => [data.workflow, ...prev]);
    setForm(FORM_VIDE);
    setShowForm(false);
    toast.success(t("Workflow « {0} » créé.", data.workflow.nom));
  }

  async function toggleWorkflow(workflow: Workflow) {
    const res = await fetch("/api/automation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: workflow.id, actif: !workflow.actif }) }).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => ({})) : {};
    if (!data.workflow) { toast.error(t("Le changement n'a pas été enregistré. Réessayez.")); return; }
    setWorkflows((prev) => prev.map((w) => w.id === workflow.id ? data.workflow : w));
  }

  async function deleteWorkflow(w: Workflow) {
    if (!(await confirmer({ titre: t("Supprimer ce workflow ?"), objet: w.nom, description: t("Plus aucun message ne sera envoyé par ce workflow. Les messages déjà envoyés ne sont pas concernés."), libelleConfirmer: t("Supprimer le workflow") }))) return;
    const res = await fetch(`/api/automation?id=${w.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toast.error(t("Le workflow n'a pas été supprimé. Réessayez.")); return; }
    setWorkflows((prev) => prev.filter((x) => x.id !== w.id));
    toast.success(t("Workflow « {0} » supprimé.", w.nom));
  }

  const ouvrir = (type?: string) => {
    if (type) setForm((f) => ({ ...f, type, nom: t(TYPE_CONFIG[type].label) }));
    setShowForm(true);
  };
  const set = (patch: Partial<typeof FORM_VIDE>) => setForm((f) => ({ ...f, ...patch }));

  const colonnes: Column<Workflow>[] = [
    { id: "nom", header: t("Workflow"), mobilePrimary: true, cell: (w) => t(w.nom) },
    { id: "type", header: t("Type"), cell: (w) => t(TYPE_CONFIG[w.type]?.label ?? w.type) },
    { id: "canal", header: t("Canal"), hideOnMobile: true, cell: (w) => t(CANAUX[w.canal] ?? w.canal) },
    { id: "delai", header: t("Délai"), numeric: true, align: "end", cell: (w) => t("{0} h", w.delaiHeures) },
    { id: "declenchements", header: t("Déclenchements"), numeric: true, align: "end", cell: (w) => w.declenchements },
    { id: "conversion", header: t("Conversion"), numeric: true, align: "end", hideOnMobile: true,
      cell: (w) => w.declenchements > 0 ? `${((w.conversions / w.declenchements) * 100).toFixed(1)} %` : "—" },
    { id: "statut", header: t("Statut"), cell: (w) => <Badge tone={w.actif ? "success" : "neutral"}>{w.actif ? t("Actif") : t("Inactif")}</Badge> },
    { id: "actions", header: "", align: "end", cell: (w) => (
      <span className="inline-flex items-center gap-2">
        <Toggle checked={w.actif} onChange={() => toggleWorkflow(w)} label={w.actif ? t("Désactiver « {0} »", w.nom) : t("Activer « {0} »", w.nom)} />
        <IconButton icon="x" aria-label={t("Supprimer « {0} »", w.nom)} onClick={() => deleteWorkflow(w)} />
      </span>
    ) },
  ];

  return (
    <div className="space-y-4">
      {dialogue}
      <PageHeader icon="bolt" title={t("Automation")}
        primaryAction={{ content: t("Nouveau workflow"), icon: "plus", onAction: () => ouvrir() }} />

      {erreur ? <ErreurChargement titre={t("Les workflows n'ont pas pu être chargés")} onReessayer={charger} /> : loading ? <Chargement /> : (
        <>
          <Chiffres items={[
            { label: t("Workflows actifs"), value: workflows.filter((w) => w.actif).length },
            { label: t("Déclenchements"), value: workflows.reduce((s, w) => s + w.declenchements, 0) },
            { label: t("Conversions"), value: workflows.reduce((s, w) => s + w.conversions, 0) },
          ]} />

          {workflows.length === 0 ? (
            <>
              <EmptyState title={t("Aucun workflow pour l'instant")} image={<IllustrationCampagnes />}
                actions={<Button variant="primary" icon="plus" onClick={() => ouvrir()}>{t("Nouveau workflow")}</Button>}>
                {t("Un workflow envoie un message à vos clients au bon moment, sans que vous ayez à y penser. Choisissez un modèle ci-dessous.")}
              </EmptyState>
              <ResourceList>
                {Object.entries(TYPE_CONFIG).map(([type, c]) => (
                  <SettingsRow key={type} icon="bolt" title={t(c.label)} subtitle={t(c.description)} onClick={() => ouvrir(type)} />
                ))}
              </ResourceList>
            </>
          ) : (
            <div className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
              <IndexTable label={t("Workflows")} rows={workflows} columns={colonnes} getId={(w) => w.id} />
            </div>
          )}
        </>
      )}

      <Modal open={showForm} onClose={() => !saving && setShowForm(false)} locked={saving} title={t("Nouveau workflow")}
        footer={<>
          <Button onClick={() => setShowForm(false)} disabled={saving}>{t("Annuler")}</Button>
          <Button variant="primary" onClick={saveWorkflow} disabled={!form.nom || !form.message} loading={saving}>{t("Créer")}</Button>
        </>}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label={t("Nom")} required value={form.nom} onChange={(e) => set({ nom: e.target.value })} />
          <Select label={t("Type")} value={form.type} onChange={(e) => set({ type: e.target.value })}
            options={Object.entries(TYPE_CONFIG).map(([value, v]) => ({ value, label: t(v.label) }))} />
          <Select label={t("Canal")} value={form.canal} onChange={(e) => set({ canal: e.target.value })}
            options={Object.entries(CANAUX).map(([value, label]) => ({ value, label: t(label) }))} />
          <TextField label={t("Délai de déclenchement (heures)")} type="number" min={0.5} step={0.5} value={form.delaiHeures} onChange={(e) => set({ delaiHeures: Number(e.target.value) })} />
          {form.canal === "email" && <TextField className="sm:col-span-2" label={t("Sujet de l'email")} value={form.sujet} onChange={(e) => set({ sujet: e.target.value })} />}
          <Textarea className="sm:col-span-2" label={t("Message")} required rows={3} placeholder={t("Bonjour {{nom}}, vous avez oublié quelque chose...")}
            value={form.message} onChange={(e) => set({ message: e.target.value })}
            helpText={t("Variables : {{nom}}, {{email}}, {{montant}}, {{boutique}}")} />
        </div>
      </Modal>
    </div>
  );
}
