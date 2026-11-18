"use client";
import { useState, useEffect } from "react";
import { Plus, Loader2, X, Sparkles, Send, Users, CheckCircle2, Zap, Smartphone, Crown, Moon, ShoppingCart, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Alerte, Badge, Bouton, EnTetePage, EtatVide, Modale, Saisie, ZoneTexte, useConfirmation } from "@/components/ui";

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
  const { confirmer, dialogue } = useConfirmation();

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
    } catch { toast.error(tr("Les campagnes n'ont pas pu être chargées. Vérifie ta connexion et actualise la page.")); }
  }

  async function genererMessage() {
    if (!form.promptIA.trim()) { toast.error(tr("Décris ta campagne en une phrase pour que l'IA rédige le SMS.")); return; }
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
      toast.success(tr("Brouillon de SMS rédigé : relis-le avant d'envoyer."));
    } catch { toast.error(tr("Le SMS n'a pas pu être rédigé. Réessaie ou écris-le toi-même.")); }
    finally { setGenerating(false); }
  }

  async function envoyer() {
    if (!form.message.trim() || !form.nom) { toast.error(tr("Renseigne le nom de la campagne et le message.")); return; }
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
      if (!res.ok) throw new Error(data.message || data.error || "La campagne n'a pas été envoyée. Réessaie dans un instant.");
      toast.success(data.message ? tr(data.message) : tr("Campagne « {0} » envoyée.", form.nom));
      setShowModal(false);
      setForm({ nom: "", message: "", segment: "tous", promptIA: "" });
      charger();
    } catch (err: any) {
      toast.error(err?.message ? tr(err.message) : tr("La campagne n'a pas été envoyée. Réessaie dans un instant."));
    } finally { setSending(false); }
  }

  const charCount = form.message.length;

  return (
    <div className="space-y-6">
      {dialogue}
      <EnTetePage className="mb-0"
        titre={tr("SMS & WhatsApp")}
        description={tr("Envoyez des campagnes SMS à vos clients")}
        actions={<Bouton onClick={() => setShowModal(true)} disabled={!disponible} icone={<Plus className="size-4" aria-hidden />}>
          {tr(disponible ? "Nouvelle campagne" : "Bientôt disponible")}
        </Bouton>} />

      {!disponible && (
        <Alerte ton="info" titre={tr("Les campagnes SMS seront bientôt disponibles")}
          action={<div className="flex flex-wrap gap-2">
            <Bouton variante="secondaire" taille="compact" href="/dashboard/whatsapp">{tr("Ouvrir WhatsApp")}</Bouton>
            <Bouton variante="secondaire" taille="compact" href="/dashboard/marketing/email">{tr("Envoyer un e-mail")}</Bouton>
          </div>}>
          {tr("L'envoi de SMS n'est pas encore activé sur Axso. En attendant, vous pouvez écrire à vos clients par WhatsApp ou par e-mail.")}
        </Alerte>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Base clients", val: nbClients, icon: Users, color: "#818cf8" },
          { label: "Campagnes envoyées", val: histoCampagnes.filter(c => c.statut === "envoye").length, icon: CheckCircle2, color: "#34d399" },
          { label: "SMS envoyés total", val: histoCampagnes.reduce((s: number, c: any) => s + (c.nbEnvoyes || 0), 0), icon: Send, color: "#F5A623" },
        ].map(s => {
          const Icone = s.icon;
          return (
            <div key={s.label} className="ax-card p-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-controle flex items-center justify-center bg-carte-2" aria-hidden>
                  <Icone size={16} style={{ color: s.color }} />
                </div>
                <p className="text-[20px] font-bold text-encre tabular-nums">{s.val}</p>
              </div>
              <p className="ax-aide">{tr(s.label)}</p>
            </div>
          );
        })}
      </div>

      {/* Historique */}
      {histoCampagnes.length > 0 ? (
        <div className="ax-card overflow-hidden">
          <div className="px-5 py-4 border-b border-bordure">
            <h2 className="ax-sous-titre">{tr("Campagnes récentes")}</h2>
          </div>
          <div className="divide-y divide-bordure">
            {histoCampagnes.slice(0, 5).map((c: any) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-encre truncate">{c.nom}</p>
                  <p className="ax-aide">{tr(c.segment)} · {new Date(c.createdAt).toLocaleDateString(tr.loc)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="ax-aide">{c.nbEnvoyes}{" "}{tr("envoyés")}</span>
                  <Badge ton={c.statut === "envoye" ? "succes" : "neutre"}>{c.statut === "envoye" ? tr("Envoyé") : tr("Brouillon")}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : disponible && (
        <EtatVide icone={<Send />} titre={tr("Aucune campagne SMS envoyée")}
          texte={tr("Une campagne SMS envoie un court message à un groupe de clients (tous, VIP, inactifs…).")}>
          <Bouton onClick={() => setShowModal(true)} icone={<Plus className="size-4" aria-hidden />}>{tr("Nouvelle campagne")}</Bouton>
        </EtatVide>
      )}

      <Modale ouverte={showModal} onFermer={() => setShowModal(false)} verrouillee={sending}
        titre={tr("Nouvelle campagne SMS")}
        actions={<>
          <Bouton variante="secondaire" onClick={() => setShowModal(false)} disabled={sending}>{tr("Annuler")}</Bouton>
          <Bouton onClick={envoyer} disabled={!form.message || !form.nom || charCount > 160} charge={sending} texteCharge={tr("Envoi en cours…")}
            icone={<Send className="size-4" aria-hidden />}>{tr("Envoyer la campagne")}</Bouton>
        </>}>
        <div className="space-y-champs">
          <fieldset>
            <legend className="ax-libelle mb-2">{tr("Destinataires")}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SEGMENTS.map(s => (
                <button key={s.id} type="button" aria-pressed={form.segment === s.id} onClick={() => setForm(f => ({ ...f, segment: s.id }))}
                  className={`flex items-start gap-2.5 p-3 rounded-controle border-2 text-left transition-colors ${form.segment === s.id ? "border-primaire bg-primaire-fond" : "border-bordure hover:border-bordure-forte"}`}>
                  <s.Icon size={18} aria-hidden className={`flex-shrink-0 mt-0.5 ${form.segment === s.id ? "text-attention" : "text-doux"}`} />
                  <div>
                    <p className="text-sm font-semibold text-encre">{tr(s.label)}</p>
                    <p className="ax-aide">{tr(s.desc)}</p>
                  </div>
                </button>
              ))}
            </div>
          </fieldset>

          <Saisie label={tr("Nom de la campagne")} required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            placeholder={tr("Ex: Promo Tabaski 2024")} aide={tr("Visible par toi seul, pour retrouver la campagne.")} />

          <fieldset>
            <legend className="ax-libelle mb-2">{tr("Modèles")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <Bouton key={t.label} variante="secondaire" taille="compact" className="justify-start"
                  onClick={() => setForm(f => ({ ...f, message: t.template }))} icone={<t.Icon className="size-3.5 text-doux" aria-hidden />}>
                  {tr(t.label)}
                </Bouton>
              ))}
            </div>
          </fieldset>

          <div className="rounded-carte border border-bordure bg-carte-2 p-3 space-y-2">
            <Saisie label={<span className="inline-flex items-center gap-1.5"><Sparkles className="size-3.5" aria-hidden />{tr("Rédiger avec l'IA")}</span>} mention="facultatif"
              value={form.promptIA} onChange={e => setForm(f => ({ ...f, promptIA: e.target.value }))}
              placeholder={tr("Ex: Promo -25% pour la fête des mères, boutique de mode...")} />
            <Bouton variante="secondaire" taille="compact" onClick={genererMessage} disabled={!form.promptIA} charge={generating} texteCharge={tr("Rédaction…")}
              icone={<Zap className="size-3.5" aria-hidden />}>{tr("Rédiger le SMS")}</Bouton>
          </div>

          <ZoneTexte label={tr("Message SMS")} required rows={4} maxLength={160} value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder={tr("Votre message SMS... ({{nom}} sera remplacé par le prénom du client)")}
            aide={<>{tr("Utilisez")}{" "}<code className="bg-carte-2 px-1 rounded">{"{{nom}}"}</code>{" "}{tr("pour personnaliser · 1 SMS = 160 caractères")}{" · "}
              <span className={charCount > 160 ? "text-erreur font-semibold" : charCount > 130 ? "text-attention font-semibold" : ""}>{charCount}/160</span></>} />
        </div>
      </Modale>
    </div>
  );
}
