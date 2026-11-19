"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Badge, Banner, Button, Card, EmptyState, IndexTable, Modal, PageHeader, TextField, Textarea, type Column } from "@/components/ui/adm";
import { IllustrationCampagnes } from "@/components/ui/illustrations";
import { Chiffres, useConfirmationAdm } from "../marketing/kit-marketing";

const SEGMENTS = [
  { id: "tous",     label: "Tous les clients", desc: "Toute votre base clients" },
  { id: "vip",      label: "Clients VIP",      desc: "5 commandes ou plus, ou 2× la dépense moyenne" },
  { id: "inactifs", label: "Clients inactifs", desc: "Pas d'achat depuis 30j+" },
  { id: "nouveaux", label: "Nouveaux clients", desc: "Inscrits cette semaine" },
];

const TEMPLATES = [
  {
    label: "Promo flash",
    template: "Bonjour {{nom}} ! Flash sale chez {boutique} : -30% sur tout pendant 24h ! Profitez-en : {lien} 🛍️",
  },
  {
    label: "Nouveau produit",
    template: "Salut {{nom}} ! Découvrez notre nouveau produit exclusif sur {boutique} ! Quantités limitées 👉 {lien}",
  },
  {
    label: "Relance panier",
    template: "{{nom}}, vous avez oublié quelque chose dans votre panier ! Terminez votre commande avant rupture de stock : {lien} 📦",
  },
  {
    label: "Événement",
    template: "{{nom}}, grande nouvelle ! Événement spécial sur {boutique} ce weekend. Offres exclusives pour vous 🎁 {lien}",
  },
];

export default function SMSPage() {
  const tr = useT();
  const [nbClients, setNbClients] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [histoCampagnes, setHistoCampagnes] = useState<any[]>([]);
  // Faux tant que le prestataire SMS n'est pas branché côté Axso (lib/integrations.ts).
  const [disponible, setDisponible] = useState(true);
  const { confirmer, dialogue } = useConfirmationAdm();

  const [form, setForm] = useState({
    nom: "",
    message: "",
    segment: "tous",
    promptIA: "",
  });

  useEffect(() => { charger(); }, []);

  async function charger() {
    try {
      const [clientsRes, campagnesRes] = await Promise.all([
        fetch("/api/email?action=stats"),
        fetch("/api/sms"),
      ]);
      if (clientsRes.ok) { const d = await clientsRes.json(); setNbClients(d.segments?.tous || 0); }
      if (campagnesRes.ok) { const d = await campagnesRes.json(); setHistoCampagnes(d.campagnes || []); setDisponible(d.disponible !== false); }
    } catch { toast.error(tr("Les campagnes n'ont pas pu être chargées. Vérifiez votre connexion et actualisez la page.")); }
  }

  async function genererMessage() {
    if (!form.promptIA.trim()) { toast.error(tr("Décrivez votre campagne en une phrase pour que l'IA rédige le SMS.")); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/universal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Écris un SMS marketing court et percutant (max 160 caractères) pour : "${form.promptIA}".
Inclut {{nom}} pour personnalisation et {lien} pour le lien boutique.
Réponds UNIQUEMENT avec le SMS, rien d'autre. Style africain, engageant, avec 1-2 emojis max.`,
          }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      const sms = (data.reponse || "").trim().slice(0, 160);
      setForm(f => ({ ...f, message: sms }));
      toast.success(tr("Brouillon de SMS rédigé : relisez-le avant d'envoyer."));
    } catch { toast.error(tr("Le SMS n'a pas pu être rédigé. Réessayez ou écrivez-le vous-même.")); }
    finally { setGenerating(false); }
  }

  async function envoyer() {
    if (!form.message.trim() || !form.nom) { toast.error(tr("Renseignez le nom de la campagne et le message.")); return; }
    const seg = SEGMENTS.find(s => s.id === form.segment);
    if (!(await confirmer({
      titre: tr("Envoyer cette campagne SMS ?"),
      objet: <>« {form.nom} »<br /><span className="font-normal">{tr(seg?.label ?? form.segment)}</span></>,
      description: tr("Les SMS partent immédiatement et ne peuvent pas être rappelés."),
      libelleConfirmer: tr("Envoyer les SMS"),
      destructive: false,
    }))) return;
    setSending(true);
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: form.nom, message: form.message, segment: form.segment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "La campagne n'a pas été envoyée. Réessayez dans un instant.");
      toast.success(data.message ? tr(data.message) : tr("Campagne « {0} » envoyée.", form.nom));
      setShowModal(false);
      setForm({ nom: "", message: "", segment: "tous", promptIA: "" });
      charger();
    } catch (err: any) {
      toast.error(err?.message ? tr(err.message) : tr("La campagne n'a pas été envoyée. Réessayez dans un instant."));
    } finally { setSending(false); }
  }

  const charCount = form.message.length;

  const choix = (on: boolean) => `flex flex-col items-start gap-0.5 rounded-(--radius-md) border p-3 text-left transition-colors ${on ? "border-(--color-border-strong) bg-(--color-surface-selected)" : "border-(--color-border) hover:bg-(--color-surface-secondary)"}`;
  const colonnes: Column<any>[] = [
    { id: "nom", header: tr("Campagne"), mobilePrimary: true, cell: (c) => c.nom },
    { id: "segment", header: tr("Destinataires"), cell: (c) => tr(SEGMENTS.find(s => s.id === c.segment)?.label ?? c.segment) },
    { id: "date", header: tr("Date"), hideOnMobile: true, cell: (c) => new Date(c.createdAt).toLocaleDateString(tr.loc) },
    { id: "envoyes", header: tr("Envoyés"), numeric: true, align: "end", cell: (c) => c.nbEnvoyes },
    { id: "statut", header: tr("Statut"), cell: (c) => <Badge tone={c.statut === "envoye" ? "success" : "neutral"}>{c.statut === "envoye" ? tr("Envoyé") : tr("Brouillon")}</Badge> },
  ];

  return (
    <div className="space-y-4">
      {dialogue}
      <PageHeader icon="whatsapp" title={tr("SMS & WhatsApp")}
        primaryAction={{ content: tr(disponible ? "Nouvelle campagne" : "Bientôt disponible"), icon: "plus", onAction: () => setShowModal(true), disabled: !disponible }} />

      {!disponible && (
        <Banner tone="info" title={tr("Les campagnes SMS seront bientôt disponibles")}
          action={{ content: tr("Ouvrir WhatsApp"), href: "/dashboard/whatsapp" }}>
          {tr("L'envoi de SMS n'est pas encore activé sur Axso. En attendant, vous pouvez écrire à vos clients par WhatsApp ou par e-mail.")}{" "}
          <a href="/dashboard/marketing/email">{tr("Envoyer un e-mail")}</a>
        </Banner>
      )}

      <Chiffres items={[
        { label: tr("Base clients"), value: nbClients },
        { label: tr("Campagnes envoyées"), value: histoCampagnes.filter(c => c.statut === "envoye").length },
        { label: tr("SMS envoyés total"), value: histoCampagnes.reduce((s: number, c: any) => s + (c.nbEnvoyes || 0), 0) },
      ]} />

      {histoCampagnes.length > 0 ? (
        <Card title={tr("Campagnes récentes")} padding="none">
          <IndexTable label={tr("Campagnes récentes")} rows={histoCampagnes.slice(0, 5)} columns={colonnes} getId={(c) => c.id} />
        </Card>
      ) : disponible && (
        <EmptyState title={tr("Aucune campagne SMS envoyée")} image={<IllustrationCampagnes />}
          actions={<Button variant="primary" icon="plus" onClick={() => setShowModal(true)}>{tr("Nouvelle campagne")}</Button>}>
          {tr("Une campagne SMS envoie un court message à un groupe de clients (tous, VIP, inactifs…).")}
        </EmptyState>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} locked={sending} title={tr("Nouvelle campagne SMS")}
        footer={<>
          <Button onClick={() => setShowModal(false)} disabled={sending}>{tr("Annuler")}</Button>
          <Button variant="primary" onClick={envoyer} disabled={!form.message || !form.nom || charCount > 160} loading={sending}>{tr("Envoyer la campagne")}</Button>
        </>}>
        <div className="space-y-3">
          <fieldset>
            <legend className="mb-1 font-semibold text-(--color-text-strong)">{tr("Destinataires")}</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SEGMENTS.map(s => (
                <button key={s.id} type="button" aria-pressed={form.segment === s.id} onClick={() => setForm(f => ({ ...f, segment: s.id }))} className={choix(form.segment === s.id)}>
                  <span className="font-semibold text-(--color-text-strong)">{tr(s.label)}</span>
                  <span className="text-xs text-(--color-text-secondary)">{tr(s.desc)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <TextField label={tr("Nom de la campagne")} required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            placeholder={tr("Ex: Promo Tabaski 2024")} helpText={tr("Visible par vous seul, pour retrouver la campagne.")} />

          <fieldset>
            <legend className="mb-1 font-semibold text-(--color-text-strong)">{tr("Modèles")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <Button key={t.label} size="sm" onClick={() => setForm(f => ({ ...f, message: t.template }))}>{tr(t.label)}</Button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2 rounded-(--radius-lg) border border-(--color-magic-border) bg-(--color-magic-bg) p-3">
            <TextField label={tr("Rédiger avec l'IA (facultatif)")}
              value={form.promptIA} onChange={e => setForm(f => ({ ...f, promptIA: e.target.value }))}
              placeholder={tr("Ex: Promo -25% pour la fête des mères, boutique de mode...")} />
            <Button size="sm" icon="sparkle" onClick={genererMessage} disabled={!form.promptIA} loading={generating}>{tr("Rédiger le SMS")}</Button>
          </div>

          <Textarea label={tr("Message SMS")} required rows={4} maxLength={160} value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder={tr("Votre message SMS... ({{nom}} sera remplacé par le prénom du client)")}
            helpText={<>{tr("Utilisez {{nom}} pour personnaliser · 1 SMS = 160 caractères")}{" · "}
              <span className={charCount > 160 ? "font-semibold text-(--color-critical-text)" : charCount > 130 ? "font-semibold text-(--badge-warning-text)" : ""}>{charCount}/160</span></>} />
        </div>
      </Modal>
    </div>
  );
}
