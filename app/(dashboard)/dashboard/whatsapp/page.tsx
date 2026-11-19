"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Search, CheckCircle2, Clock, Truck, Package, XCircle, Phone, Settings, Wifi, WifiOff, Loader2, ShoppingBag, ArrowLeft, CheckCheck, Check, Zap, MapPin, FileText, RefreshCw, Bell, Lightbulb, Lock } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, PageHeader, Tabs, avatarColor, buttonClasses } from "@/components/ui/adm";
import { UpgradeGate } from "@/components/dashboard/UpgradeGate";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { urlBoutique } from "@/lib/utils";

const WHATSAPP_TUTORIAL_STEPS = [
  { Icon: Settings,      titre: "Connectez votre WhatsApp Business", description: "Cliquez sur l'icône réglages en haut de la liste pour connecter WhatsApp, via Genuka (simple) ou l'API officielle Meta." },
  { Icon: MessageCircle, titre: "Toutes vos conversations",       description: "Retrouvez tous vos contacts clients, avec le nombre de messages non lus et une mise à jour automatique toutes les 15 secondes." },
  { Icon: Zap,           titre: "Réponses rapides",                description: "Utilisez l'éclair à côté du champ de saisie pour envoyer en un clic un message prêt : Bonjour, Reçu, Expédiée, Livrée…" },
  { Icon: ShoppingBag,   titre: "Commandes liées au contact",      description: "À droite, confirme une commande, envoie le lien de suivi ou la facture directement dans la conversation. Si le client répond \"OUI\", sa commande se confirme automatiquement." },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Conversation {
  de: string; nom: string | null; dernier: string;
  lu: boolean; nonLus: number; updatedAt: string;
}
interface Message {
  id: string; de: string; nom: string | null;
  corps: string; lu: boolean;
  direction: "entrant" | "sortant";
  commandeId: string | null; createdAt: string;
}
interface Commande {
  id: string; numero: string; statut: string;
  paiementStatut: string; montantTotal: number; devise: string;
  createdAt: string; trackingToken?: string | null;
  lignes: { nom: string; quantite: number }[];
}
interface WaConfig { statut: string; via: "meta" | "genuka"; config: { phone_number_id?: string; numero_affiche?: string; verified_name?: string } | null }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function heure(iso: string) {
  const d = new Date(iso), now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "maintenant";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function initiales(nom: string | null, tel: string) {
  if (nom) return nom.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return tel.slice(-2);
}

const STATUT_LABEL: Record<string, { label: string; color: string; icon: any }> = {
  en_attente:     { label: "En attente",     color: "var(--banner-warning-text)", icon: Clock },
  confirmee:      { label: "Confirmée",      color: "var(--badge-info-text)", icon: CheckCircle2 },
  en_preparation: { label: "En préparation", color: "var(--banner-warning-text)", icon: Package },
  expediee:       { label: "Expédiée",       color: "var(--badge-info-text)", icon: Truck },
  livree:         { label: "Livrée",         color: "var(--badge-success-text)", icon: CheckCircle2 },
  annulee:        { label: "Annulée",        color: "var(--color-critical-text)", icon: XCircle },
};

// ─── Templates réponse rapide ────────────────────────────────────────────────
const TEMPLATES = [
  { label: "Bonjour", text: "Bonjour 👋 Comment puis-je vous aider ?" },
  { label: "Reçu", text: "Votre commande a bien été reçue, merci ! ✅" },
  { label: "En cours", text: "Votre commande est en cours de préparation 📦" },
  { label: "Expédiée", text: "Votre commande a été expédiée 🚚 Vous serez livré très prochainement !" },
  { label: "Livrée", text: "Votre commande a été livrée avec succès ✅ Merci pour votre confiance !" },
  { label: "Confirmation", text: "Pouvez-vous confirmer votre commande en répondant OUI ? 🙏" },
];

// ─── Modal Config ─────────────────────────────────────────────────────────────
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? "https://axsoafrica.com";
const WEBHOOK_URL    = `${APP_URL}/api/webhooks/whatsapp`;
const WEBHOOK_TOKEN  = process.env.NEXT_PUBLIC_META_WEBHOOK_TOKEN ?? "axso_meta_2026";

function CopyBox({ label, value }: { label: string; value: string }) {
  const tr = useT();
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-(--color-text-secondary)">{tr(label)}</p>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
        <code className="flex-1 text-xs font-mono text-(--color-text-strong) break-all">{tr(value)}</code>
        <button onClick={copy} className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg transition-all"
          style={{ background: copied ? "var(--banner-success-bg)" : "var(--color-border)", color: copied ? "var(--badge-success-text)" : "var(--color-text-subdued)" }}>
          {copied ? tr("✓ Copié") : tr("Copier")}
        </button>
      </div>
    </div>
  );
}

function ConfigPanel({ tenantId, onClose, onConnecte }: { tenantId: string; onClose: () => void; onConnecte: (cfg: WaConfig) => void }) {
  const tr = useT();
  const [mode, setMode] = useState<"genuka" | "meta">("genuka");
  const [etape, setEtape] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({ phone_number_id: "", access_token: "" });
  const [proxyToken, setProxyToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const genukaWebhookUrl = tenantId ? `${APP_URL}/api/webhooks/genuka/${tenantId}` : "";

  async function connecter() {
    if (!form.phone_number_id || !form.access_token) { toast.error(tr("Renseigne le Phone Number ID et le token d'accès.")); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/connecteurs/whatsapp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(tr("WhatsApp connecté — {0} ({1})", data.numero ?? "", data.nom ?? ""));
      onConnecte({ statut: "actif", via: "meta", config: { phone_number_id: form.phone_number_id, numero_affiche: data.numero, verified_name: data.nom } });
    } catch (e: any) { toast.error(e?.message ? tr(e.message) : tr("La connexion à WhatsApp a échoué. Vérifiez vos clés et réessayez.")); }
    finally { setLoading(false); }
  }

  async function connecterGenuka() {
    if (!proxyToken.trim() && !webhookSecret.trim()) { toast.error(tr("Renseigne au moins le proxy token ou le secret du webhook.")); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/connecteurs/whatsapp-genuka", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proxyToken: proxyToken.trim() || undefined, webhookSecret: webhookSecret.trim() || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(proxyToken.trim() ? tr("WhatsApp connecté via Genuka.") : tr("Réception activée — ajoutez le proxy token plus tard pour activer l'envoi"));
      onConnecte({ statut: "actif", via: "genuka", config: null });
    } catch (e: any) { toast.error(e?.message ? tr(e.message) : tr("La connexion via Genuka a échoué. Vérifiez le token et réessayez.")); }
    finally { setLoading(false); }
  }

  const ETAPES = [
    { n: 1, label: "Créer l'app Meta" },
    { n: 2, label: "Configurer le webhook" },
    { n: 3, label: "Connecter au dashboard" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl max-h-[calc(100dvh-2rem)] overflow-y-auto" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-(--color-border) flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#25D366" }}>
                <MessageCircle size={15} className="text-white" />
              </div>
              <h2 className="text-(--color-text-strong) font-bold text-base">{tr("Connecter WhatsApp Business")}</h2>
            </div>
            <p className="text-(--color-text-secondary) text-xs ml-10">
              {mode === "genuka" ? tr("Connexion simplifiée via Genuka · recommandé") : tr("Configuration guidée en 3 étapes · API officielle Meta")}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={tr("Fermer")} className="-mr-2 -mt-1 w-10 h-10 rounded-xl flex items-center justify-center text-(--color-text-subdued) hover:text-(--color-text-strong) hover:bg-(--color-surface-tertiary) transition-colors text-xl leading-none">×</button>
        </div>

        {/* Choix du mode */}
        <div className="px-6 pt-4 flex gap-1 rounded-xl p-1" style={{ background: "var(--color-surface-secondary)", margin: "16px 24px 0" }}>
          <button onClick={() => setMode("genuka")}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
            style={mode === "genuka" ? { background: "var(--color-primary)", color: "white" } : { color: "var(--color-text-subdued)" }}>
            {tr("Genuka (simple)")}
          </button>
          <button onClick={() => setMode("meta")}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
            style={mode === "meta" ? { background: "var(--color-primary)", color: "white" } : { color: "var(--color-text-subdued)" }}>
            {tr("Meta direct (avancé)")}
          </button>
        </div>

        {/* ── Mode Genuka ── */}
        {mode === "genuka" && (
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-xl p-4 space-y-2.5" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
              <Step n="1" text="Créez un compte sur" link="https://genuka.com" linkLabel="genuka.com" text2="(gratuit)" />
              <Step n="2" text="Dans leur dashboard, connectez votre numéro" bold="WhatsApp Business" text2="(Meta Embedded Signup — quelques clics, sans configuration technique)" />
              <Step n="3" text="Générez un" bold="Proxy Token" text2="scopé « send_text »" />
              <Step n="4" text="Collez ce token ci-dessous" />
            </div>

            <div>
              <label htmlFor="wa-proxy-token" className="text-xs font-bold text-(--color-text-subdued) uppercase tracking-wider block mb-1.5">{tr("Proxy Token Genuka")}</label>
              <div className="relative">
                <input id="wa-proxy-token" value={proxyToken} onChange={e => setProxyToken(e.target.value)}
                  type={showToken ? "text" : "password"}
                  placeholder="gwa_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full rounded-xl px-4 py-3 text-(--color-text-strong) text-sm font-mono focus:outline-none transition-all pr-10"
                  style={{ background: "var(--color-surface-secondary)", border: `1px solid ${proxyToken ? "var(--color-border-strong)" : "var(--color-border)"}` }} />
                <button type="button" onClick={() => setShowToken(v => !v)} aria-label={showToken ? tr("Masquer le token") : tr("Afficher le token")} aria-pressed={showToken}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-(--color-text-subdued) hover:text-(--color-text-strong)">
                  <Lock size={14} />
                </button>
              </div>
            </div>

            <div className="rounded-xl p-4 space-y-2.5" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
              <p className="text-xs font-bold text-(--color-text-subdued) uppercase tracking-wider mb-1">{tr("Pour recevoir les messages entrants dans Axso")}</p>
              <Step n="5" text="Dans Genuka, allez dans" bold="Paramètres → Webhooks" text2="et ajoutez cette URL sur l'événement « message.received »" />
              <CopyBox label={tr("URL du webhook (propre à votre boutique)")} value={genukaWebhookUrl || "Chargement…"} />
              <Step n="6" text="Genuka affichera un" bold="secret de signature" text2="— collez-le ci-dessous (recommandé)" />
              <div>
                <input value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)}
                  type="password" aria-label={tr("Secret de signature du webhook (facultatif)")}
                  placeholder={tr("Secret de signature (facultatif)")}
                  className="w-full rounded-xl px-4 py-3 text-(--color-text-strong) text-sm font-mono focus:outline-none transition-all"
                  style={{ background: "var(--color-surface-secondary)", border: `1px solid ${webhookSecret ? "var(--color-border-strong)" : "var(--color-border)"}` }} />
              </div>
            </div>

            <div className="rounded-xl p-3 flex gap-3" style={{ background: "var(--banner-warning-bg)", border: "1px solid var(--badge-warning-bg)" }}>
              <Lightbulb size={18} className="text-(--color-magic-text) flex-shrink-0 mt-0.5" />
              <p className="text-xs text-(--color-text-subdued) leading-relaxed">
                {tr("Le proxy token (envoi) et le webhook (réception) sont indépendants — vous pouvez connecter avec un seul des deux en attendant l'autre. Sans proxy token, l'envoi automatique se rabat sur WhatsApp direct ou un lien wa.me. Sans secret de signature, les messages entrants s'affichent quand même, mais la confirmation automatique de commande par mot-clé (« OUI ») reste désactivée par sécurité.")}
              </p>
            </div>

            <div className="rounded-xl p-3 flex gap-3" style={{ background: "var(--banner-success-bg)", border: "1px solid var(--badge-success-bg)" }}>
              <CheckCircle2 size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-(--color-text-subdued) leading-relaxed">
                {tr("Pas de vérification Meta Business Manager complète à faire vous-même — Genuka s'en charge via son propre flux de connexion.")}
              </p>
            </div>

            <button onClick={connecterGenuka} disabled={loading || (!proxyToken.trim() && !webhookSecret.trim())}
              className={buttonClasses({ variant: "primary", className: "gap-2 w-full" })}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {tr("Connecter WhatsApp")}
            </button>
          </div>
        )}

        {/* Stepper (mode Meta) */}
        {mode === "meta" && (
        <>
        <div className="px-6 pt-4 pb-3 flex items-center gap-0">
          {ETAPES.map((e, i) => (
            <div key={e.n} className="flex items-center" style={{ flex: i < 2 ? 1 : "none" }}>
              <button onClick={() => { if (e.n < etape || (e.n === 2)) setEtape(e.n as 1|2|3); }}
                className="flex items-center gap-2 group">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                  style={{ background: etape === e.n ? "var(--color-primary)" : etape > e.n ? "var(--banner-success-bg)" : "var(--color-surface-secondary)", color: etape === e.n ? "white" : etape > e.n ? "var(--badge-success-text)" : "var(--color-text-secondary)" }}>
                  {etape > e.n ? "✓" : e.n}
                </div>
                <span className="text-xs font-semibold hidden sm:block"
                  style={{ color: etape === e.n ? "white" : etape > e.n ? "var(--badge-success-text)" : "var(--color-text-secondary)" }}>
                  {tr(e.label)}
                </span>
              </button>
              {i < 2 && <div className="flex-1 h-px mx-3" style={{ background: etape > e.n ? "var(--banner-success-bg)" : "var(--color-surface-secondary)" }} />}
            </div>
          ))}
        </div>

        {/* Contenu par étape */}
        <div className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* ── ÉTAPE 1 : Créer l'app Meta ── */}
          {etape === 1 && (
            <div className="space-y-3 pt-2">
              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                <Step n="1" text="Allez sur" link="https://developers.facebook.com" linkLabel="developers.facebook.com" />
                <Step n="2" text="Cliquez sur" bold="Mes apps → Créer une app" />
                <Step n="3" text="Choisissez le type" bold="Entreprise" />
                <Step n="4" text="Nommez votre app et cliquez" bold="Créer une app" />
                <Step n="5" text="Dans le tableau de bord, trouvez" bold="WhatsApp" text2="et cliquez" bold2="Configurer" />
                <Step n="6" text="Ajoutez un numéro de téléphone de test ou votre numéro Business vérifié" />
              </div>
              <div className="rounded-xl p-3 flex gap-3" style={{ background: "var(--banner-warning-bg)", border: "1px solid var(--badge-warning-bg)" }}>
                <Lightbulb size={18} className="text-(--color-magic-text) flex-shrink-0 mt-0.5" />
                <p className="text-xs text-(--color-text-subdued) leading-relaxed">
                  {tr("Pour un usage en production, votre compte WhatsApp doit être un")}{" "}<span className="text-(--color-text-strong) font-medium">{tr("compte Business vérifié par Meta")}</span>{tr(". Le numéro de test gratuit est suffisant pour commencer.")}
                </p>
              </div>
              <button onClick={() => setEtape(2)} className={buttonClasses({ variant: "primary", className: "gap-2 w-full" })}>
                {tr("Étape suivante →")}
              </button>
            </div>
          )}

          {/* ── ÉTAPE 2 : Configurer le webhook ── */}
          {etape === 2 && (
            <div className="space-y-4 pt-2">
              <p className="text-(--color-text-subdued) text-sm">{tr("Dans votre app Meta, allez dans")}{" "}<span className="text-(--color-text-strong) font-semibold">{tr("WhatsApp → Configuration → Webhooks")}</span> et entrez ces valeurs :</p>

              <CopyBox label={tr("URL de rappel (Callback URL)")} value={WEBHOOK_URL} />
              <CopyBox label={tr("Token de vérification (Verify Token)")} value={WEBHOOK_TOKEN} />

              <div className="rounded-xl p-4 space-y-2.5" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                <p className="text-xs font-bold text-(--color-text-subdued) uppercase tracking-wider mb-1">{tr("Ensuite")}</p>
                <Step n="1" text="Cliquez" bold="Vérifier et enregistrer" text2="— Meta appellera automatiquement l'URL ci-dessus" />
                <Step n="2" text="Dans la liste des champs, activez l'abonnement" bold="messages" />
                <Step n="3" text="Cliquez" bold="S'abonner" />
              </div>

              <div className="rounded-xl p-3 flex gap-3" style={{ background: "var(--banner-success-bg)", border: "1px solid var(--badge-success-bg)" }}>
                <CheckCircle2 size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-(--color-text-subdued) leading-relaxed">
                  {tr("Une fois vérifié, Axso recevra automatiquement tous vos messages WhatsApp entrants et les routera vers votre dashboard.")}
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setEtape(1)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-(--color-text-subdued) hover:text-(--color-text-strong) hover:bg-(--color-surface-tertiary) transition-all border border-(--color-border)">
                  {tr("← Retour")}
                </button>
                <button onClick={() => setEtape(3)} className={buttonClasses({ variant: "primary", className: "gap-2 flex-1" })}>
                  {tr("Webhook configuré →")}
                </button>
              </div>
            </div>
          )}

          {/* ── ÉTAPE 3 : Connecter les clés ── */}
          {etape === 3 && (
            <div className="space-y-4 pt-2">
              <p className="text-(--color-text-subdued) text-sm">{tr("Dans votre app Meta, allez dans")}{" "}<span className="text-(--color-text-strong) font-semibold">{tr("WhatsApp → Configuration API")}</span> pour trouver ces deux valeurs :</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-(--color-text-secondary) uppercase tracking-wider block mb-1.5">
                    {tr("Phone Number ID")}
                    <span className="normal-case font-normal text-(--color-text-secondary) ml-2">{tr("— trouvé dans \"Numéros de téléphone\"")}</span>
                  </label>
                  <input value={form.phone_number_id} onChange={e => setForm(f => ({ ...f, phone_number_id: e.target.value }))}
                    placeholder="123456789012345"
                    className="w-full rounded-xl px-4 py-3 text-(--color-text-strong) text-sm font-mono focus:outline-none transition-all"
                    style={{ background: "var(--color-surface-secondary)", border: `1px solid ${form.phone_number_id ? "var(--color-border-strong)" : "var(--color-border)"}` }} />
                </div>

                <div>
                  <label className="text-xs font-bold text-(--color-text-secondary) uppercase tracking-wider block mb-1.5">
                    {tr("Token d'accès permanent")}
                    <span className="normal-case font-normal text-(--color-text-secondary) ml-2">{tr("— générez-le dans Paramètres système")}</span>
                  </label>
                  <div className="relative">
                    <input value={form.access_token} onChange={e => setForm(f => ({ ...f, access_token: e.target.value }))}
                      type={showToken ? "text" : "password"}
                      placeholder="EAAxxxxxxxxxxxxxxxxxx"
                      className="w-full rounded-xl px-4 py-3 pr-20 text-(--color-text-strong) text-sm font-mono focus:outline-none transition-all"
                      style={{ background: "var(--color-surface-secondary)", border: `1px solid ${form.access_token ? "var(--color-border-strong)" : "var(--color-border)"}` }} />
                    <button onClick={() => setShowToken(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(--color-text-secondary) hover:text-(--color-text-strong) px-2 py-1 rounded-lg transition-all"
                      style={{ background: "var(--color-surface-secondary)" }}>
                      {showToken ? tr("Masquer") : tr("Voir")}
                    </button>
                  </div>
                  <p className="text-[10px] text-(--color-text-secondary) mt-1 ml-1">{tr("⚠️ Utilisez un token permanent (non expirant) — pas le token temporaire de 24h")}</p>
                </div>
              </div>

              <div className="rounded-xl p-3 flex gap-3" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                <Lock size={18} className="text-(--color-text-subdued) flex-shrink-0 mt-0.5" />
                <p className="text-xs text-(--color-text-secondary) leading-relaxed">
                  {tr("Vos clés sont chiffrées et stockées uniquement sur votre compte Axso. Elles ne sont jamais partagées.")}
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setEtape(2)} className="flex-shrink-0 py-2.5 px-4 rounded-xl text-sm font-semibold text-(--color-text-subdued) hover:text-(--color-text-strong) hover:bg-(--color-surface-tertiary) transition-all border border-(--color-border)">
                  {tr("← Retour")}
                </button>
                <button onClick={connecter} disabled={loading || !form.phone_number_id || !form.access_token}
                  className={buttonClasses({ variant: "primary", className: "gap-2 flex-1" })}>
                  {loading ? <><Loader2 size={15} className="animate-spin" />{" "}{tr("Vérification en cours…")}</> : <><Wifi size={15} />{" "}{tr("Tester et connecter")}</>}
                </button>
              </div>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}

function Step({ n, text, bold, text2, bold2, link, linkLabel }: { n: string; text?: string; bold?: string; text2?: string; bold2?: string; link?: string; linkLabel?: string }) {
  const tr = useT();
  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
        style={{ background: "var(--banner-success-bg)", color: "var(--badge-success-text)" }}>{n}</div>
      <p className="text-sm text-(--color-text-subdued) leading-relaxed">
        {tr(text)}{" "}
        {link && <a href={link} target="_blank" rel="noopener noreferrer" className="text-(--color-text-strong) font-mono underline hover:text-(--badge-success-text) transition-colors">{tr(linkLabel)}</a>}
        {bold && <span className="text-(--color-text-strong) font-semibold">{tr(bold)}</span>}
        {text2 && " " + tr(text2) + " "}
        {bold2 && <span className="text-(--color-text-strong) font-semibold">{tr(bold2)}</span>}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const tr = useT();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contactActif, setContactActif] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [input, setInput] = useState("");
  const [recherche, setRecherche] = useState("");
  // Lien « messages non lus » du Tableau de bord : ?filtre=non_lus.
  const params = useSearchParams();
  const [nonLusSeuls, setNonLusSeuls] = useState(params.get("filtre") === "non_lus");
  const [loading, setLoading] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [waConfig, setWaConfig] = useState<WaConfig | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [mobileThread, setMobileThread] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [boutique, setBoutique] = useState<{ slug: string; sousDomaineAt?: string | null; customDomain?: string | null; domaineActifAt?: string | null } | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [locked, setLocked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const contactActifRef = useRef<string | null>(null);

  const connecte = waConfig?.statut === "actif";
  const totalNonLus = conversations.reduce((s, c) => s + (c.nonLus || 0), 0);

  // Charger config + conversations + slug
  useEffect(() => {
    Promise.all([
      fetch("/api/connecteurs/whatsapp").then(r => r.json()),
      fetch("/api/connecteurs/whatsapp-genuka").then(r => r.json()),
      fetch("/api/messages/whatsapp").then(r => r.json()),
      fetch("/api/tenants/moi").then(r => r.json()),
    ]).then(([cfgMeta, cfgGenuka, conv, tenant]) => {
      // Genuka (simple) prioritaire à l'affichage si les deux sont actifs —
      // c'est le chemin qu'on met en avant pour les nouvelles connexions.
      if (cfgGenuka.config?.statut === "actif") {
        setWaConfig({ statut: "actif", via: "genuka", config: null });
      } else if (cfgMeta.config?.statut === "actif") {
        setWaConfig({ statut: "actif", via: "meta", config: cfgMeta.config.config });
      } else {
        setWaConfig(null);
      }
      setConversations(conv.conversations ?? []);
      setLocked(!!conv.locked);
      setBoutique(tenant.tenant ?? null);
      setTenantId(tenant.tenant?.id ?? "");
      setLoading(false);
    });
  }, []);

  // Polling conversations toutes les 15s
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/messages/whatsapp").then(r => r.json()).then(d => {
        setConversations(d.conversations ?? []);
        setLocked(!!d.locked);
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Charger thread quand on change de contact
  const chargerThread = useCallback(async (contact: string) => {
    const d = await fetch(`/api/messages/whatsapp?contact=${encodeURIComponent(contact)}`).then(r => r.json());
    setMessages(d.messages ?? []);
    setCommandes(d.commandes ?? []);
    setConversations(prev => prev.map(c => c.de === contact ? { ...c, lu: true, nonLus: 0 } : c));
  }, []);

  useEffect(() => {
    contactActifRef.current = contactActif;
    if (!contactActif) return;
    chargerThread(contactActif);
  }, [contactActif, chargerThread]);

  // Polling thread actif toutes les 10s
  useEffect(() => {
    pollRef.current && clearInterval(pollRef.current);
    if (!contactActif) return;
    pollRef.current = setInterval(() => {
      if (contactActifRef.current) chargerThread(contactActifRef.current);
    }, 10000);
    return () => { pollRef.current && clearInterval(pollRef.current); };
  }, [contactActif, chargerThread]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function envoyer(texte?: string) {
    const corps = (texte ?? input).trim();
    if (!corps || !contactActif || envoi) return;
    setEnvoi(true);
    setShowTemplates(false);
    try {
      const res = await fetch("/api/messages/whatsapp/envoyer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: contactActif, message: corps }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(), de: contactActif, nom: null,
        corps, lu: true, direction: "sortant", commandeId: null,
        createdAt: new Date().toISOString(),
      }]);
      if (!texte) setInput("");
      setConversations(prev => prev.map(c =>
        c.de === contactActif ? { ...c, dernier: corps, updatedAt: new Date().toISOString() } : c
      ));
    } catch (e: any) { toast.error(e?.message ? tr(e.message) : tr("Le message n'a pas été envoyé. Vérifiez votre connexion WhatsApp et réessayez.")); }
    finally { setEnvoi(false); }
  }

  async function envoyerTracking(cmd: Commande) {
    if (!cmd.trackingToken) return;
    const url = urlBoutique(boutique ?? { slug: "" }, `/tracking/${cmd.trackingToken}`, window.location.origin);
    const msg = `🚚 Suivez votre commande #${cmd.numero} en temps réel :\n${url}`;
    await envoyer(msg);
    toast.success(tr("Lien de suivi de la commande #{0} envoyé.", cmd.numero));
  }

  async function envoyerFacture(cmd: Commande) {
    if (!cmd.trackingToken) return;
    const url = urlBoutique(boutique ?? { slug: "" }, `/facture/${cmd.trackingToken}`, window.location.origin);
    const msg = `📄 Voici votre facture pour la commande #${cmd.numero} :\n${url}`;
    await envoyer(msg);
    toast.success(tr("Facture de la commande #{0} envoyée.", cmd.numero));
  }

  async function confirmerCommande(commandeId: string, numero: string) {
    const res = await fetch(`/api/commandes/${commandeId}/statut`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "confirmee" }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(tr("Commande #{0} confirmée.", numero));
      setCommandes(prev => prev.map(c => c.id === commandeId ? { ...c, statut: "confirmee" } : c));
      if (data.whatsappUrl) window.open(data.whatsappUrl, "_blank");
    } else { toast.error(data.error ? tr(data.error) : tr("La commande #{0} n'a pas été confirmée. Réessayez.", numero)); }
  }

  const convsFiltrees = conversations.filter(c =>
    (!nonLusSeuls || c.nonLus > 0 || c.de === contactActif) // la conversation ouverte reste visible une fois lue
    && (!recherche || (c.nom ?? c.de).toLowerCase().includes(recherche.toLowerCase()) || c.de.includes(recherche))
  );
  const convActuelle = conversations.find(c => c.de === contactActif);

  // Onglets de la chaîne WhatsApp (§8.22) : Messages ici, Diffusions = campagnes WhatsApp, Paramètres = connexion.
  // ?onglet=parametres ouvre directement les réglages de la connexion.
  const onglet = params.get("onglet") === "parametres" ? "parametres" : "messages";
  useEffect(() => { if (onglet === "parametres") setShowConfig(true); }, [onglet]);

  if (!loading && locked) {
    return (
      <UpgradeGate
        titre={tr("WhatsApp verrouillé — quota de commandes atteint")}
        description={tr("Vous avez atteint votre quota de 60 commandes ce mois-ci au Palier 0. Passez à un palier supérieur pour retrouver l'accès à WhatsApp — envoi et réception de messages.")}
        palierRequis="palier1"
      />
    );
  }

  return (
    <div className="space-y-3">
    <PageHeader icon="whatsapp" title={tr("WhatsApp Business")}
      titleMeta={<Badge tone={connecte ? "success" : "neutral"}>{connecte ? tr("Actif") : tr("Hors ligne")}</Badge>}
      secondaryActions={[{ content: tr("Réglages de la connexion WhatsApp"), icon: "gear", onAction: () => setShowConfig(true) }]} />
    <Tabs label={tr("WhatsApp Business")} selected={onglet} tabs={[
      { id: "messages", label: tr("Messages"), href: "/dashboard/whatsapp" },
      { id: "diffusions", label: tr("Diffusions"), href: "/dashboard/campagnes" },
      { id: "parametres", label: tr("Paramètres"), href: "/dashboard/whatsapp?onglet=parametres" },
    ]} />
    <div className="flex h-[calc(100vh-12rem)] rounded-xl overflow-hidden border border-(--color-border)" style={{ background: "var(--color-surface)" }}>
      <ModuleTutorial moduleKey="whatsapp" titre="WhatsApp" sousTitre={tr("Vends et discute via WhatsApp")} steps={WHATSAPP_TUTORIAL_STEPS} />

      {/* ── GAUCHE : Conversations ── */}
      <div className={`${mobileThread ? "hidden" : "flex"} lg:flex flex-col border-r border-(--color-border) flex-shrink-0 w-full lg:w-80`}>
        {/* Header */}
        <div className="p-4 border-b border-(--color-border) space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#25D366" }}>
                <MessageCircle size={17} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-(--color-text-strong) text-sm leading-tight flex items-center gap-1.5">
                  {tr("WhatsApp Business")}
                  <BoutonRevoirTutoriel moduleKey="whatsapp" dark />
                </div>
                {connecte && waConfig?.via === "meta" && waConfig?.config?.numero_affiche && (
                  <div className="text-[10px] text-(--color-text-secondary) font-mono">{tr(waConfig.config.numero_affiche)}</div>
                )}
                {connecte && waConfig?.via === "genuka" && (
                  <div className="text-[10px] text-(--color-text-secondary)">{tr("via Genuka")}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {totalNonLus > 0 && (
                <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ background: "#25D366" }}>
                  <Bell size={9} /> {tr(totalNonLus)}
                </div>
              )}
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${connecte ? "text-(--badge-success-text)" : "text-(--color-critical-text)"}`}
                style={{ background: connecte ? "var(--banner-success-bg)" : "var(--badge-critical-bg)" }}>
                {connecte ? <Wifi size={9} /> : <WifiOff size={9} />}
                {connecte ? tr("Actif") : tr("Hors ligne")}
              </div>
              <button onClick={() => setShowConfig(true)} aria-label={tr("Réglages de la connexion WhatsApp")} title={tr("Réglages de la connexion WhatsApp")}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-(--color-text-subdued) hover:text-(--color-text-strong) hover:bg-(--color-surface-tertiary) transition-all">
                <Settings size={15} aria-hidden />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-secondary)" />
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder={tr("Rechercher un nom ou un numéro…")} aria-label={tr("Rechercher une conversation")} type="search"
              className="w-full bg-(--color-surface-secondary) border border-(--color-border) rounded-xl pl-8 pr-3 py-2 text-sm text-(--color-text-strong) placeholder:text-(--color-text-secondary) focus:outline-none focus:border-(--badge-success-bg)" />
          </div>
          {nonLusSeuls && (
            <button onClick={() => setNonLusSeuls(false)} aria-label={tr("Retirer le filtre « non lus »")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-(--badge-success-text) border border-(--badge-success-bg) hover:bg-(--banner-success-bg)">
              {tr("Filtre : non lus seulement")} <span aria-hidden>×</span>
            </button>
          )}
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-(--color-text-secondary)">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : convsFiltrees.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto" style={{ background: "var(--banner-success-bg)", border: "1px solid var(--badge-success-bg)" }}>
                <MessageCircle size={24} style={{ color: "var(--badge-success-text)" }} />
              </div>
              <p className="text-(--color-text-subdued) text-sm font-medium">{recherche || nonLusSeuls ? tr("Aucune conversation ne correspond") : tr("Aucune conversation")}</p>
              <p className="text-(--color-text-secondary) text-xs">{recherche || nonLusSeuls ? tr("Modifiez la recherche ou retirez le filtre.") : connecte ? tr("Les messages de vos clients arriveront ici.") : tr("Connectez votre numéro WhatsApp Business pour recevoir les messages de vos clients ici.")}</p>
              {!connecte && (
                <button onClick={() => setShowConfig(true)} className="text-xs hover:underline" style={{ color: "var(--badge-success-text)" }}>
                  {tr("Connecter WhatsApp Business →")}
                </button>
              )}
            </div>
          ) : convsFiltrees.map(conv => {
            const actif = conv.de === contactActif;
            return (
              <button key={conv.de}
                onClick={() => { setContactActif(conv.de); setMobileThread(true); }}
                className="w-full flex items-start gap-3 px-4 py-3.5 border-b border-(--color-border) text-left transition-all hover:bg-(--color-surface-tertiary)"
                style={{ borderLeft: actif ? "2px solid var(--color-border-strong)" : "2px solid transparent", background: actif ? "var(--banner-success-bg)" : undefined }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                  style={{ background: avatarColor(conv.de) }}>
                  {initiales(conv.nom, conv.de)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold text-sm text-(--color-text-strong) truncate">{tr(conv.nom) ?? tr(conv.de)}</p>
                    <span className="text-[10px] text-(--color-text-secondary) flex-shrink-0 ml-2">{heure(conv.updatedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-(--color-text-secondary) truncate">{tr(conv.dernier)}</p>
                    {conv.nonLus > 0 && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1" style={{ background: "var(--color-notification)" }}>
                        {tr(conv.nonLus)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CENTRE : Thread ── */}
      <div className={`${!mobileThread ? "hidden" : "flex"} lg:flex flex-1 flex-col min-w-0`}>
        {contactActif && convActuelle ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-(--color-border) flex items-center gap-3" style={{ background: "var(--color-surface-secondary)" }}>
              <button onClick={() => setMobileThread(false)} aria-label={tr("Retour aux conversations")} className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-(--color-text-subdued) hover:text-(--color-text-strong)">
                <ArrowLeft size={16} />
              </button>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: avatarColor(contactActif) }}>
                {initiales(convActuelle.nom, contactActif)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-(--color-text-strong) text-sm leading-tight">{tr(convActuelle.nom) ?? tr(contactActif)}</p>
                <p className="text-[10px] text-(--color-text-secondary) font-mono">{tr(contactActif)}</p>
              </div>
              <div className="flex items-center gap-2">
                {commandes.length > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1" style={{ color: "var(--color-text-strong)", background: "var(--banner-warning-bg)" }}>
                    <ShoppingBag size={10} aria-hidden /> {tr("{0} commande(s)", commandes.length)}
                  </span>
                )}
                <a href={`tel:${contactActif}`} aria-label={tr("Appeler ce contact")} title={tr("Appeler ce contact")} className="w-10 h-10 rounded-xl flex items-center justify-center text-(--color-text-secondary) hover:text-(--color-text-strong) hover:bg-(--color-surface-tertiary) transition-all">
                  <Phone size={13} />
                </a>
                <button onClick={() => chargerThread(contactActif)} aria-label={tr("Actualiser la conversation")} title={tr("Actualiser la conversation")} className="w-10 h-10 rounded-xl flex items-center justify-center text-(--color-text-secondary) hover:text-(--color-text-strong) hover:bg-(--color-surface-tertiary) transition-all">
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5" style={{ background: "var(--color-surface)" }}>
              {messages.map((msg, i) => {
                const sortant = msg.direction === "sortant";
                const showDate = i === 0 || new Date(messages[i - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center justify-center my-3">
                        <span className="text-[10px] text-(--color-text-secondary) px-3 py-1 rounded-full" style={{ background: "var(--color-surface-secondary)" }}>
                          {new Date(msg.createdAt).toLocaleDateString(tr.loc, { weekday: "long", day: "numeric", month: "long" })}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${sortant ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[72%] px-4 py-2.5 rounded-xl text-sm leading-relaxed"
                        style={{
                          background: sortant ? "#d9fdd3" : "var(--color-surface)",
                          borderBottomRightRadius: sortant ? 4 : undefined,
                          borderBottomLeftRadius: !sortant ? 4 : undefined,
                          boxShadow: "var(--shadow-card)",
                          color: "var(--color-text-strong)",
                        }}>
                        <p className="whitespace-pre-wrap">{tr(msg.corps)}</p>
                        <div className={`flex items-center gap-1 mt-1 ${sortant ? "justify-end" : ""}`}>
                          <span className="text-[10px] opacity-50">{new Date(msg.createdAt).toLocaleTimeString(tr.loc, { hour: "2-digit", minute: "2-digit" })}</span>
                          {sortant && (msg.lu ? <CheckCheck size={11} className="opacity-70" /> : <Check size={11} className="opacity-40" />)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Templates réponse rapide */}
            {showTemplates && (
              <div className="border-t border-(--color-border) p-3" style={{ background: "var(--color-surface-secondary)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={11} style={{ color: "var(--color-text-strong)" }} />
                  <span className="text-[10px] font-bold text-(--color-text-secondary) uppercase tracking-wider">{tr("Réponses rapides")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map((t, i) => (
                    <button key={i} onClick={() => envoyer(t.text)}
                      className="text-xs px-3 py-1.5 rounded-xl font-semibold transition-all hover:opacity-80"
                      style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                      {tr(t.label)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-(--color-border)" style={{ background: "var(--color-surface)" }}>
              {!connecte ? (
                <div className="text-center py-3">
                  <p className="text-(--color-text-secondary) text-sm">{tr("WhatsApp Business non connecté")}</p>
                  <button onClick={() => setShowConfig(true)} className="text-xs hover:underline mt-1" style={{ color: "var(--badge-success-text)" }}>
                    {tr("Connecter maintenant →")}
                  </button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <button onClick={() => setShowTemplates(s => !s)} aria-label={tr("Réponses rapides")} title={tr("Réponses rapides")} aria-expanded={showTemplates}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                    style={{ background: showTemplates ? "var(--banner-warning-bg)" : "var(--color-surface-secondary)", color: showTemplates ? "var(--color-text-strong)" : "var(--color-text-secondary)" }}>
                    <Zap size={14} />
                  </button>
                  <textarea value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
                    placeholder={tr("Tapez votre message… (Entrée pour envoyer)")}
                    aria-label={tr("Message à envoyer")}
                    rows={1}
                    className="flex-1 min-w-0 border rounded-xl px-4 py-2.5 text-sm text-(--color-text-strong) placeholder:text-(--color-text-secondary) focus:outline-none resize-none"
                    style={{ background: "var(--color-surface-secondary)", borderColor: "var(--color-border)", maxHeight: 120 }}
                    onFocus={e => (e.target.style.borderColor = "var(--color-border-strong)")}
                    onBlur={e => (e.target.style.borderColor = "var(--color-border)")}
                  />
                  <button onClick={() => envoyer()} disabled={!input.trim() || envoi} aria-label={tr("Envoyer le message")}
                    className={buttonClasses({ variant: "primary", className: "gap-2 flex-shrink-0" })}>
                    {envoi ? <Loader2 size={15} className="animate-spin text-white" /> : <Send size={15} className="text-white" />}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-xs">
              <div className="w-20 h-20 rounded-xl flex items-center justify-center mx-auto" style={{ background: "var(--banner-success-bg)", border: "1px solid var(--badge-success-bg)" }}>
                <MessageCircle size={36} style={{ color: "var(--badge-success-text)" }} />
              </div>
              <div>
                <p className="text-(--color-text-strong) font-semibold text-lg">{tr("WhatsApp Business")}</p>
                <p className="text-(--color-text-secondary) text-sm mt-1">{tr("Sélectionnez une conversation ou attendez un message client")}</p>
              </div>
              {!connecte && (
                <button onClick={() => setShowConfig(true)}
                  className={buttonClasses({ variant: "primary", className: "gap-2 mx-auto" })}>
                  <Wifi size={14} />{" "}{tr("Connecter WhatsApp Business")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── DROIT : Commandes du contact ── */}
      {contactActif && (
        <div className="hidden xl:flex flex-col border-l border-(--color-border) flex-shrink-0 overflow-y-auto" style={{ width: 280, background: "var(--color-surface)" }}>
          <div className="p-4 border-b border-(--color-border)">
            <p className="text-(--color-text-strong) font-semibold text-sm flex items-center gap-2">
              <ShoppingBag size={13} style={{ color: "var(--color-text-strong)" }} />
              {tr("Commandes liées")}
              {commandes.length > 0 && <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "var(--banner-warning-bg)", color: "var(--color-text-strong)" }}>{commandes.length}</span>}
            </p>
          </div>

          {commandes.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
              <ShoppingBag size={28} className="text-(--color-text) mb-3" />
              <p className="text-(--color-text-secondary) text-xs">{tr("Aucune commande liée à ce contact")}</p>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {commandes.map(cmd => {
                const s = STATUT_LABEL[cmd.statut] ?? { label: cmd.statut, color: "var(--color-text-subdued)", icon: Clock };
                const Icon = s.icon;
                return (
                  <div key={cmd.id} className="rounded-xl p-3 space-y-2.5" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-(--color-text-strong) font-bold">#{cmd.numero}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ color: s.color, background: `${s.color}18` }}>
                        <Icon size={9} />{tr(s.label)}
                      </span>
                    </div>
                    {cmd.lignes.slice(0, 2).map((l, i) => (
                      <p key={i} className="text-xs text-(--color-text-secondary) truncate">{tr(l.nom)}{" "}{tr("×")}{l.quantite}</p>
                    ))}
                    <div className="text-xs font-bold" style={{ color: "var(--color-text-strong)" }}>
                      {cmd.montantTotal.toLocaleString(tr.loc)} {tr(cmd.devise)}
                    </div>

                    {/* Actions */}
                    <div className="space-y-1.5 pt-1 border-t border-(--color-border)">
                      {cmd.statut === "en_attente" && (
                        <button onClick={() => confirmerCommande(cmd.id, cmd.numero)}
                          className={buttonClasses({ variant: "primary", size: "sm", fullWidth: true, className: "gap-1.5" })}>
                          <CheckCircle2 size={11} />{" "}{tr("Confirmer")}
                        </button>
                      )}
                      {cmd.trackingToken && (
                        <button onClick={() => envoyerTracking(cmd)}
                          className="w-full text-[11px] py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 hover:bg-(--color-surface-tertiary) transition-all"
                          style={{ color: "var(--badge-info-text)", background: "var(--banner-info-bg)", border: "1px solid var(--badge-info-bg)" }}>
                          <MapPin size={10} />{" "}{tr("Envoyer tracking")}
                        </button>
                      )}
                      {cmd.trackingToken && (
                        <button onClick={() => envoyerFacture(cmd)}
                          className="w-full text-[11px] py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 hover:bg-(--color-surface-tertiary) transition-all"
                          style={{ color: "var(--banner-warning-text)", background: "var(--color-magic-bg)", border: "1px solid var(--color-magic-border)" }}>
                          <FileText size={10} />{" "}{tr("Envoyer facture")}
                        </button>
                      )}
                      <button onClick={() => router.push(`/dashboard/commandes/${cmd.id}`)}
                        className="w-full text-[11px] py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 hover:bg-(--color-surface-tertiary) transition-all"
                        style={{ color: "var(--color-text-subdued)", border: "1px solid var(--color-border)" }}>
                        {tr("Voir la commande →")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Auto-confirm tip */}
          <div className="m-3 mt-auto p-3 rounded-xl" style={{ background: "var(--banner-success-bg)", border: "1px solid var(--badge-success-bg)" }}>
            <p className="text-xs font-semibold flex items-center gap-1.5 mb-1" style={{ color: "var(--badge-success-text)" }}>
              <Zap size={10} />{" "}{tr("Confirmation auto")}
            </p>
            <p className="text-(--color-text-secondary) text-xs leading-relaxed">
              {tr("Si le client répond")}{" "}<span className="font-mono text-(--color-text-strong)">{tr("\"OUI\"")}</span>, <span className="font-mono text-(--color-text-strong)">{tr("\"CONFIRMER\"")}</span> ou <span className="font-mono text-(--color-text-strong)">{tr("\"OK\"")}</span>, la commande se confirme automatiquement.
            </p>
          </div>
        </div>
      )}

      {showConfig && (
        <ConfigPanel tenantId={tenantId} onClose={() => setShowConfig(false)} onConnecte={cfg => { setWaConfig(cfg); setShowConfig(false); }} />
      )}
    </div>
    </div>
  );
}
