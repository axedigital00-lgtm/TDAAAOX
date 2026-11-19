"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FORMAT_PIXEL } from "@/lib/pixels";
import { useT } from "@/components/I18nProvider";
import { Badge, Banner, Button, Card, CardSection, IconButton, PageHeader, SkeletonPage, TextField, Textarea } from "@/components/ui/adm";
import { useConfirmationAdm } from "../kit-marketing";

interface TenantTracking {
  metaPixelId: string | null;
  tiktokPixelId: string | null;
  snapPixelId: string | null;
  gtmId: string | null;
  trackingScripts: string | null;
}

async function patchTenant(champs: Record<string, any>) {
  const res = await fetch("/api/tenants", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(champs),
  });
  if (!res.ok) throw new Error("Sauvegarde échouée");
}

type PlatformKey = "metaPixelId" | "tiktokPixelId" | "snapPixelId" | "gtmId";

interface Platform {
  key: PlatformKey;
  nom: string;
  sousTitre: string;
  placeholder: string;
  guide: string[];
  events: string[];
}

const PLATFORMS: Platform[] = [
  {
    key: "metaPixelId",
    nom: "Meta Pixel",
    sousTitre: "Facebook · Instagram · Messenger",
    placeholder: "1234567890123456",
    guide: [
      "Ouvrez Meta Business Suite et accédez au Gestionnaire d'événements",
      "Cliquez sur Sources de données → sélectionnez votre Pixel",
      "Onglet Détails — copiez l'ID à 15-16 chiffres",
    ],
    events: ["PageView", "InitiateCheckout", "Purchase"],
  },
  {
    key: "tiktokPixelId",
    nom: "TikTok Pixel",
    sousTitre: "TikTok for Business · Ads Manager",
    placeholder: "C4A1B2C3D4E5F6G7H8I9",
    guide: [
      "Accédez à TikTok Ads Manager → Actifs → Événements",
      "Cliquez sur Web Events et sélectionnez votre Pixel",
      "Copiez l'ID depuis la section Détails de configuration",
    ],
    events: ["PageView", "InitiateCheckout", "CompletePayment"],
  },
  {
    key: "snapPixelId",
    nom: "Snapchat Pixel",
    sousTitre: "Snap Ads Manager · Conversions",
    placeholder: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    guide: [
      "Accédez à Snapchat Ads Manager → Événements",
      "Cliquez Gérer les sources → sélectionnez votre Pixel",
      "Copiez l'UUID affiché dans les paramètres du Pixel",
    ],
    events: ["PAGE_VIEW", "START_CHECKOUT", "PURCHASE"],
  },
  {
    key: "gtmId",
    nom: "Google Tag Manager",
    sousTitre: "GA4 · Google Ads · tous vos tags",
    placeholder: "GTM-XXXXXXX",
    guide: [
      "Accédez à tagmanager.google.com",
      "Sélectionnez votre espace de travail",
      "L'ID GTM-XXXXXXX s'affiche en haut à droite — copiez-le",
    ],
    events: ["page_view", "initiate_checkout", "purchase"],
  },
];

// ─── Carte d'une plateforme ──────────────────────────────────────────────────
function PlatformCard({
  platform,
  valeurInitiale,
  onSaved,
}: {
  platform: Platform;
  valeurInitiale: string | null;
  onSaved: (v: string | null) => void;
}) {
  const tr = useT();
  const { confirmer, dialogue } = useConfirmationAdm();
  const { key, nom, sousTitre, placeholder, guide, events } = platform;

  const [valeur, setValeur]   = useState(valeurInitiale ?? "");
  const [saved, setSaved]     = useState<string | null>(valeurInitiale);
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setValeur(valeurInitiale ?? "");
    setSaved(valeurInitiale);
  }, [valeurInitiale]);

  const isActif = Boolean(saved);
  const maskedId = saved ? (saved.length > 8 ? `${saved.slice(0, 4)}••••••••${saved.slice(-4)}` : "••••••••") : null;

  async function sauvegarder() {
    setSaving(true);
    try {
      const v = valeur.trim() || null;
      if (v && !FORMAT_PIXEL[key].test(v)) {
        toast.error(tr("Un seul {0} par boutique : collez un seul identifiant (ex. {1}).", nom, placeholder));
        return;
      }
      await patchTenant({ [key]: v });
      setSaved(v);
      setOpen(false);
      onSaved(v);
      toast.success(v ? tr("{0} activé.", nom) : tr("{0} retiré.", nom));
    } catch {
      toast.error(tr("L'enregistrement a échoué. Vérifiez votre connexion et réessayez."));
    } finally {
      setSaving(false);
    }
  }

  async function retirer() {
    if (!(await confirmer({ titre: tr("Retirer ce pixel ?"), objet: `${nom}${saved ? ` · ${saved}` : ""}`,
      description: tr("Il ne se chargera plus sur votre boutique et son identifiant sera effacé. Vous pourrez le recoller plus tard."),
      libelleConfirmer: tr("Retirer le pixel") }))) return;
    try {
      await patchTenant({ [key]: null });
      setValeur("");
      setSaved(null);
      setOpen(false);
      onSaved(null);
      toast.success(tr("{0} retiré.", nom));
    } catch {
      toast.error(tr("{0} n'a pas été retiré. Réessayez.", nom));
    }
  }

  return (
    <Card padding="none">
      {dialogue}
      <CardSection>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-(--color-text-strong)">{tr(nom)}</span>
              <Badge tone={isActif ? "success" : "neutral"}>{isActif ? tr("Actif") : tr("Non configuré")}</Badge>
            </div>
            <p className="text-xs text-(--color-text-secondary)">{tr(sousTitre)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isActif && <Button size="sm" variant="ghost" onClick={retirer}>{tr("Désactiver")}</Button>}
            <Button size="sm" disclosure onClick={() => setOpen(o => !o)} aria-expanded={open}>
              {open ? tr("Fermer") : isActif ? tr("Modifier") : tr("Configurer")}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-(--color-text-secondary)">
          {tr("Événements :")}{" "}{events.map(e => <code key={e} className="mr-1 rounded-(--radius-sm) bg-(--color-surface-tertiary) px-1 py-px">{e}</code>)}
        </p>
        {isActif && !open && (
          <div className="mt-2 flex items-center gap-2 rounded-(--radius-md) bg-(--color-surface-secondary) px-2 py-1">
            <code className="flex-1 truncate font-mono text-xs text-(--color-text)">{visible ? saved : maskedId}</code>
            <IconButton icon="eye" aria-label={visible ? tr("Masquer l'identifiant") : tr("Afficher l'identifiant")} onClick={() => setVisible(v => !v)} />
          </div>
        )}
      </CardSection>

      {open && (
        <CardSection>
          <div className="space-y-3">
            <div>
              <p className="mb-1 font-semibold text-(--color-text-strong)">{tr("Guide de configuration")}</p>
              <ol className="list-decimal space-y-1 pl-4 text-(--color-text-secondary)">
                {guide.map((step, i) => <li key={i}>{tr(step)}</li>)}
              </ol>
            </div>
            <TextField label={tr("Identifiant du pixel")} className="font-mono" value={valeur} onChange={e => setValeur(e.target.value)} placeholder={placeholder} />
            <div className="flex justify-end gap-2">
              {saved && <Button variant="critical" onClick={retirer}>{tr("Retirer le pixel")}</Button>}
              <Button variant="primary" onClick={sauvegarder} disabled={!valeur.trim()} loading={saving}>{tr("Activer le pixel")}</Button>
            </div>
          </div>
        </CardSection>
      )}
    </Card>
  );
}

// ─── Scripts personnalisés ───────────────────────────────────────────────────
function CustomScriptsCard({ valeurInitiale }: { valeurInitiale: string | null }) {
  const tr = useT();
  const [script, setScript] = useState(valeurInitiale ?? "");
  const [saved, setSaved]   = useState<string | null>(valeurInitiale);
  const [saving, setSaving] = useState(false);
  const [open, setOpen]     = useState(!!valeurInitiale);

  useEffect(() => {
    setScript(valeurInitiale ?? "");
    setSaved(valeurInitiale);
  }, [valeurInitiale]);

  async function sauvegarder() {
    setSaving(true);
    try {
      const v = script.trim() || null;
      await patchTenant({ trackingScripts: v });
      setSaved(v);
      toast.success(tr("Scripts personnalisés enregistrés."));
    } catch {
      toast.error(tr("L'enregistrement a échoué. Vérifiez votre connexion et réessayez."));
    } finally {
      setSaving(false);
    }
  }

  const isActif = Boolean(saved);

  return (
    <Card padding="none">
      <CardSection>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-(--color-text-strong)">{tr("Scripts personnalisés")}</span>
              <Badge tone={isActif ? "success" : "neutral"}>{isActif ? tr("Actif") : tr("Non configuré")}</Badge>
            </div>
            <p className="text-xs text-(--color-text-secondary)">{tr("Hotjar, Clarity, Pinterest Tag, ou tout autre script tiers")}</p>
          </div>
          <Button size="sm" disclosure onClick={() => setOpen(o => !o)} aria-expanded={open}>
            {open ? tr("Fermer") : isActif ? tr("Modifier") : tr("Configurer")}
          </Button>
        </div>
      </CardSection>
      {open && (
        <CardSection>
          <div className="space-y-3">
            <Textarea label={tr("Code de suivi (balises <script>)")} rows={7} className="font-mono text-xs" value={script} onChange={e => setScript(e.target.value)}
              placeholder={tr("<script>\n  // Collez ici le code fourni par votre outil de suivi\n</script>")} />
            <Banner tone="warning">{tr("Ce code s'exécute sur votre boutique publique. Vérifiez toujours la source avant de coller un script fourni par un tiers.")}</Banner>
            <div className="flex justify-end">
              <Button variant="primary" onClick={sauvegarder} loading={saving}>{tr("Enregistrer les scripts")}</Button>
            </div>
          </div>
        </CardSection>
      )}
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const tr = useT();
  const [tenant, setTenant] = useState<TenantTracking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tenants/moi-complet")
      .then(r => r.json())
      .then(d => { setTenant(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const actifs = tenant
    ? [tenant.metaPixelId, tenant.tiktokPixelId, tenant.snapPixelId, tenant.gtmId].filter(Boolean).length
    : 0;

  if (loading) return <SkeletonPage label={tr("Chargement…")} />;

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader icon="eye" title={tr("Tracking & Pixels")} backHref="/dashboard/marketing"
        titleMeta={<Badge tone={actifs > 0 ? "info" : "neutral"}>{actifs === 0 ? tr("Aucun pixel actif") : `${actifs}/4 · ${actifs === 4 ? tr("Tous actifs") : tr("pixel{0} actif{1}", actifs > 1 ? "s" : "", actifs > 1 ? "s" : "")}`}</Badge>} />
      <p className="text-(--color-text-secondary)">{tr("Vos pixels se chargent automatiquement sur votre boutique à chaque visite.")}</p>

      {PLATFORMS.map(p => (
        <PlatformCard key={p.key} platform={p} valeurInitiale={tenant?.[p.key] ?? null}
          onSaved={v => setTenant(t => t && { ...t, [p.key]: v })} />
      ))}

      <CustomScriptsCard valeurInitiale={tenant?.trackingScripts ?? null} />

      <Banner tone="info">
        {tr("Chaque pixel activé est injecté automatiquement sur votre boutique publique et transmet les événements")}{" "}
        <strong>PageView</strong>, <strong>InitiateCheckout</strong> et <strong>{tr("Purchase")}</strong>{" "}{tr("à chaque commande — sans aucune configuration supplémentaire côté Axso.")}
      </Banner>
    </div>
  );
}
