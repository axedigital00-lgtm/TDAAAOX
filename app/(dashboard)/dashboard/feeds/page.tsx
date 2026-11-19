"use client";
import { useEffect, useState } from "react";
import { Copy, Search, Globe } from "lucide-react";
import { toast } from "sonner";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { Badge, Banner, Button, Card, CardSection, SkeletonText } from "@/components/ui/adm";
import { EnTeteModule } from "../clients/EnTeteModule";

const FEEDS_TUTORIAL_STEPS = [
  { Icon: Search,       titre: "Google Shopping gratuit", description: "Soumettez votre flux XML dans Google Merchant Center pour apparaître gratuitement dans Google Shopping et Google Images." },
  { Icon: Globe,        titre: "Meta & TikTok Catalog",     description: "Un flux CSV pour chaque plateforme, à coller dans Meta Business Suite ou TikTok for Business pour lancer des Dynamic Ads." },
  { Icon: Copy,         titre: "Copiez l'URL du flux",       description: "Chaque plateforme a sa propre URL, générée automatiquement à partir de votre catalogue. Copiez-collez, c'est tout." },
];

const PLATEFORMES_FEED = [
  {
    id: "google",
    nom: "Google Shopping",
    format: "XML (RSS 2.0)",
    path: "/api/feed/google",
    description: "Listings GRATUITS dans Google Shopping + Google Search",
    avantages: ["Gratuit sans payer de pubs", "Apparaît dans Google Images", "Google Shopping gratuit depuis 2020"],
    etapes: [
      "Ouvrez Google Merchant Center : merchants.google.com",
      "Créez un compte marchand avec votre e-mail",
      "Allez dans Produits → Flux de données",
      "Ajoutez un flux → Type : URL planifiée → Collez l'URL ci-dessous",
      "Google indexe vos produits en 24-72h",
    ],
    badge: "Gratuit",
    badgeTon: "success" as const,
  },
  {
    id: "meta",
    nom: "Meta Catalog",
    format: "CSV",
    path: "/api/feed/meta",
    description: "Catalogue produits pour Facebook & Instagram Dynamic Ads",
    avantages: ["Dynamic Ads automatiques", "Retargeting produit précis", "Instagram Shopping"],
    etapes: [
      "Allez dans Meta Business Suite → Commerce Manager",
      "Créez un catalogue → Source de données → URL planifiée",
      "Collez l'URL CSV ci-dessous",
      "Synchronisation automatique toutes les 24h",
    ],
    badge: "Payant",
    badgeTon: "neutral" as const,
  },
  {
    id: "tiktok",
    nom: "TikTok Shop",
    format: "CSV",
    path: "/api/feed/tiktok",
    description: "Catalogue pour TikTok Ads & TikTok Shop",
    avantages: ["Viral product videos", "TikTok Shopping", "Jeune audience africaine"],
    etapes: [
      "Allez dans TikTok for Business : ads.tiktok.com",
      "Assets → Catalogue → Créer un catalogue",
      "Source de données → URL → Collez l'URL ci-dessous",
      "Mapping des colonnes → Sauvegarde",
    ],
    badge: "Payant",
    badgeTon: "neutral" as const,
  },
];

function CopyButton({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  async function copier() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t("URL du flux copiée."));
    } catch {
      toast.error(t("Copie impossible : sélectionnez l'URL et copiez-la à la main."));
    }
  }
  return <Button size="sm" icon={copied ? "checkCircle" : "link"} onClick={copier}>{copied ? t("URL copiée") : t("Copier l'URL")}</Button>;
}

export default function FeedsPage() {
  const t = useT();
  const [slug, setSlug] = useState("");
  const [nbProduits, setNbProduits] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  // Origine lue après le montage : même HTML côté serveur et navigateur (sinon erreur d'hydratation).
  const [appUrl, setAppUrl] = useState(process.env.NEXT_PUBLIC_APP_URL || "");
  useEffect(() => setAppUrl(window.location.origin), []);

  useEffect(() => {
    fetch("/api/tenants/moi").then(r => r.ok ? r.json() : Promise.reject()).then(d => {
      if (d.tenant) {
        setSlug(d.tenant.slug);
        setNbProduits(d.tenant._count?.produits || 0);
      }
    }).catch(() => setErreur(true)).finally(() => setChargement(false));
  }, []);

  return (
    <div className="max-w-4xl space-y-4">
      <ModuleTutorial moduleKey="feeds" titre={t("Flux produits")} sousTitre={t("Diffusez votre catalogue ailleurs")} steps={FEEDS_TUTORIAL_STEPS} />
      <EnTeteModule icon="database" title={t("Flux Produits (Feeds)")} tutoriel="feeds"
        secondaryActions={slug ? [{ content: t("Tester le flux Google"), icon: "external", href: `/api/feed/google?slug=${slug}` }] : undefined} />

      {erreur && (
        <Banner tone="critical" title={t("L'adresse de votre boutique n'a pas pu être chargée")}
          action={{ content: t("Recharger la page"), onAction: () => window.location.reload() }}>
          {t("Les URL des flux ne peuvent pas être affichées sans elle.")}
        </Banner>
      )}

      <Banner tone="info" title={t("Comment fonctionnent les flux produits")}>
        {t("Axso génère des flux produits XML/CSV à partir de votre catalogue. Google, Meta et TikTok les lisent automatiquement, puis créent des Dynamic Ads : elles montrent le bon produit à la bonne personne.")}
      </Banner>

      {slug && (
        <Card>
          <p className="font-semibold text-(--color-text-strong)">{t("{0} produits dans votre catalogue", nbProduits)}</p>
          <p className="text-xs text-(--color-text-secondary)">{t("Boutique :")}{" "}<strong>{slug}</strong>{" "}{t("· Tous synchronisés dans les feeds ci-dessous")}</p>
        </Card>
      )}

      {PLATEFORMES_FEED.map((plat) => {
        // Pas d'URL d'exemple copiable : tant que l'adresse de la boutique n'est pas connue, on n'en affiche aucune.
        const feedUrl = slug ? `${appUrl}${plat.path}?slug=${slug}` : "";
        return (
          <Card key={plat.id} padding="none"
            title={<span className="inline-flex flex-wrap items-center gap-2">{t(plat.nom)}<Badge tone={plat.badgeTon}>{t(plat.badge)}</Badge></span>}
            actions={<Badge>{t(plat.format)}</Badge>}>
            <CardSection>
              <p className="mb-2 text-xs text-(--color-text-secondary)">{t(plat.description)}</p>
              <p className="mb-1 font-semibold text-(--color-text-strong)">{t("URL du flux à coller dans")}{" "}{t(plat.nom)}</p>
              {feedUrl ? (
                <div className="flex flex-col gap-2 rounded-(--radius-md) border border-(--color-border) bg-(--color-surface-secondary) p-2 sm:flex-row sm:items-center">
                  <code className="min-w-0 flex-1 break-all text-xs text-(--color-text) sm:truncate">{feedUrl}</code>
                  <div className="flex shrink-0 gap-2">
                    <CopyButton text={feedUrl} />
                    <Button size="sm" variant="plain" href={feedUrl}>{t("Voir le flux")}</Button>
                  </div>
                </div>
              ) : chargement ? <SkeletonText lines={1} /> : (
                <p className="text-xs text-(--color-text-secondary)">{t("URL indisponible tant que l'adresse de votre boutique n'est pas chargée.")}</p>
              )}
            </CardSection>
            <CardSection>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 font-semibold text-(--color-text-strong)">{t("Avantages")}</p>
                  <ul className="list-disc space-y-1 pl-4 text-(--color-text-secondary)">
                    {plat.avantages.map((a) => <li key={a}>{t(a)}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 font-semibold text-(--color-text-strong)">{t("Comment faire")}</p>
                  <ol className="list-decimal space-y-1 pl-4 text-(--color-text-secondary)">
                    {plat.etapes.map((e, i) => <li key={i}>{t(e)}</li>)}
                  </ol>
                </div>
              </div>
            </CardSection>
          </Card>
        );
      })}

      <Banner tone="success" title={t("Google Shopping gratuit : à faire en priorité")}
        action={{ content: t("Ouvrir Google Merchant Center"), href: "https://merchants.google.com" }}>
        {t("Depuis 2020, Google permet à tous les marchands d'apparaître gratuitement dans Google Shopping. Soumettez votre flux Google : vos produits apparaissent dans les résultats de recherche en 24 à 72 h.")}
      </Banner>
    </div>
  );
}
