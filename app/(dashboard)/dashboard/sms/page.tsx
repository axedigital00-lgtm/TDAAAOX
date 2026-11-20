"use client";
import { useState, useEffect } from "react";
import { Users, Crown, Moon, UserPlus, Zap, ShoppingCart, Sparkles } from "lucide-react";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Field } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { Modal } from "@/components/dashboard/design-system/components/Modal";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";

const SEGMENTS = [
  { id: "tous",     label: "Tous les clients", desc: "Toute votre base clients", Icon: Users    },
  { id: "vip",      label: "Clients VIP",      desc: "Top dépenseurs (2x moy.)", Icon: Crown    },
  { id: "inactifs", label: "Clients inactifs", desc: "Pas d'achat depuis 30j+",  Icon: Moon     },
  { id: "nouveaux", label: "Nouveaux clients", desc: "Inscrits cette semaine",   Icon: UserPlus },
];

const TEMPLATES = [
  {
    label: "Promo flash",
    Icon: Zap,
    template: "Bonjour {{nom}} ! Flash sale chez {boutique} : -30% sur tout pendant 24h ! Profitez-en : {lien} 🛍️",
  },
  {
    label: "Nouveau produit",
    Icon: UserPlus,
    template: "Salut {{nom}} ! Découvrez notre nouveau produit exclusif sur {boutique} ! Quantités limitées 👉 {lien}",
  },
  {
    label: "Relance panier",
    Icon: ShoppingCart,
    template: "{{nom}}, vous avez oublié quelque chose dans votre panier ! Terminez votre commande avant rupture de stock : {lien} 📦",
  },
  {
    label: "Événement",
    Icon: Sparkles,
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
    } catch { toast.error(tr("Erreur chargement")); }
  }

  async function genererMessage() {
    if (!form.promptIA.trim()) { toast.error(tr("Décrivez votre campagne")); return; }
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
      toast.success(tr("Message généré !"));
    } catch { toast.error(tr("Erreur IA")); }
    finally { setGenerating(false); }
  }

  async function envoyer() {
    if (!form.message.trim() || !form.nom) { toast.error(tr("Nom et message requis")); return; }
    setSending(true);
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: form.nom, message: form.message, segment: form.segment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur envoi");
      toast.success(tr(data.message) || tr("Campagne SMS lancée !"));
      setShowModal(false);
      setForm({ nom: "", message: "", segment: "tous", promptIA: "" });
      charger();
    } catch (err: any) {
      toast.error(tr(err.message));
    } finally { setSending(false); }
  }

  const charCount = form.message.length;

  const stats = [
    { label: "Base clients", val: nbClients },
    { label: "Campagnes envoyées", val: histoCampagnes.filter(c => c.statut === "envoye").length },
    { label: "SMS envoyés", val: histoCampagnes.reduce((s: number, c: any) => s + (c.nbEnvoyes || 0), 0) },
  ];

  return (
    <Page>
      <PageHeader icon="mail" backHref="/dashboard/marketing" title={tr("SMS")}
        primaryAction={{ content: disponible ? tr("Créer une campagne") : tr("Bientôt disponible"), onAction: () => setShowModal(true), disabled: !disponible }} />

      {!disponible && (
        <div style={{ marginBottom: "var(--space-400)" }}>
          <Banner title={tr("Les campagnes SMS seront bientôt disponibles.")}>{tr("L'envoi de SMS n'est pas encore activé sur Axso. En attendant, vous pouvez écrire à vos clients par WhatsApp ou par e-mail.")}</Banner>
        </div>
      )}

      <div className="axd-grid axd-g3" style={{ marginBottom: "var(--space-400)" }}>
        {stats.map(s => (
          <div key={s.label} className="axd-card axd-card--pad">
            <div className="axd-kpi__t">{tr(s.label)}</div>
            <div className="axd-kpi__v" style={{ marginBottom: 0 }}>{s.val.toLocaleString(tr.loc)}</div>
          </div>
        ))}
      </div>

      <div className="axd-card" style={{ overflow: "hidden" }}>
        <div className="axd-card__head" style={{ padding: "var(--space-300) var(--space-400)" }}><h2 className="axd-card__title">{tr("Campagnes récentes")}</h2></div>
        {histoCampagnes.length === 0 ? (
          <div className="axd-empty"><h3>{tr("Aucune campagne SMS")}</h3><p>{tr("Envoyez une promotion ou une nouveauté à tous vos clients, aux meilleurs ou à ceux qui ne sont pas revenus.")}</p></div>
        ) : (
          <table className="axd-ix">
            <thead><tr><th>{tr("Campagne")}</th><th className="axd-ix-hide-m">{tr("Destinataires")}</th><th className="axd-ix-num">{tr("Envoyés")}</th><th>{tr("Statut")}</th></tr></thead>
            <tbody>
              {histoCampagnes.slice(0, 20).map((c: any) => (
                <tr key={c.id}>
                  <td className="axd-ix-primary">{c.nom}<div className="axd-muted" style={{ fontWeight: 400, fontSize: 12 }}>{new Date(c.createdAt).toLocaleDateString(tr.loc, { day: "numeric", month: "short", year: "numeric" })}</div></td>
                  <td className="axd-ix-hide-m">{tr(SEGMENTS.find(x => x.id === c.segment)?.label ?? c.segment)}</td>
                  <td className="axd-ix-num">{(c.nbEnvoyes ?? 0).toLocaleString(tr.loc)}</td>
                  <td><Badge tone={c.statut === "envoye" ? "success" : "neutral"}>{c.statut === "envoye" ? tr("Envoyée") : tr("Brouillon")}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={tr("Nouvelle campagne SMS")}
        footer={<><Button onClick={() => setShowModal(false)}>{tr("Annuler")}</Button><Button variant="primary" onClick={envoyer} loading={sending} disabled={!form.message || !form.nom}>{tr("Envoyer la campagne")}</Button></>}>
        <div style={{ display: "grid", gap: "var(--space-300)", padding: "var(--space-400)" }}>
          <div>
            <p className="axd-field__label" style={{ margin: "0 0 6px" }}>{tr("Destinataires")}</p>
            <div className="axd-grid axd-g2" style={{ gap: 6 }}>
              {SEGMENTS.map(s => (
                <button key={s.id} type="button" className="axd-choix axd-choix--ligne" aria-pressed={form.segment === s.id} onClick={() => setForm(f => ({ ...f, segment: s.id }))} style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                  <b>{tr(s.label)}</b><span>{tr(s.desc)}</span>
                </button>
              ))}
            </div>
          </div>
          <Field label={tr("Nom de la campagne")}>{(p) => <input {...p} className="axd-input" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder={tr("Ex: Promo Tabaski 2024")} />}</Field>
          <div>
            <p className="axd-field__label" style={{ margin: "0 0 6px" }}>{tr("Modèles")}</p>
            <div className="axd-chips" style={{ margin: 0 }}>
              {TEMPLATES.map(t => <button key={t.label} type="button" className="axd-chip" onClick={() => setForm(f => ({ ...f, message: t.template }))}>{tr(t.label)}</button>)}
            </div>
          </div>
          <div className="axd-card axd-card--pad" style={{ background: "var(--color-surface-secondary)", boxShadow: "none", display: "grid", gap: 8 }}>
            <Field label={tr("Rédiger avec Stella")}>{(p) => <input {...p} className="axd-input" value={form.promptIA} onChange={e => setForm(f => ({ ...f, promptIA: e.target.value }))} placeholder={tr("Ex: Promo -25% pour la fête des mères, boutique de mode...")} />}</Field>
            <div><Button size="sm" onClick={genererMessage} loading={generating} disabled={!form.promptIA}>{tr("Générer le message")}</Button></div>
          </div>
          <Field label={`${tr("Message")} · ${charCount}/160`} help={tr("{{nom}} est remplacé par le prénom du client · 1 SMS = 160 caractères")} error={charCount > 160 ? tr("Le message dépasse 160 caractères.") : undefined}>
            {(p) => <textarea {...p} rows={4} maxLength={160} className="axd-input" style={{ height: "auto", padding: "8px 12px" }} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />}
          </Field>
        </div>
      </Modal>
    </Page>
  );
}
