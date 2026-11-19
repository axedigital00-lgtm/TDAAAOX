"use client";
import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, Package, RefreshCw, Info, Zap, Search, Globe, Music4, CheckCircle, ClipboardList, Gift } from "lucide-react";
import { toast } from "sonner";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { Alerte, Badge, Bouton, Squelette, classesBouton } from "@/components/ui";
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
    Icon: Search,
    color: "#4285F4",
    format: "XML (RSS 2.0)",
    path: "/api/feed/google",
    description: "Listings GRATUITS dans Google Shopping + Google Search",
    avantages: ["Gratuit sans payer de pubs", "Apparaît dans Google Images", "Google Shopping gratuit depuis 2020"],
    etapes: [
      "Ouvre Google Merchant Center : merchants.google.com",
      "Crée un compte marchand avec ton email",
      "Va dans Produits → Flux de données",
      "Ajoute un flux → Type : URL planifiée → Colle l'URL ci-dessous",
      "Google indexe tes produits en 24-72h",
    ],
    badge: "Gratuit",
    badgeTon: "succes" as const,
  },
  {
    id: "meta",
    nom: "Meta Catalog",
    Icon: Globe,
    color: "#1877F2",
    format: "CSV",
    path: "/api/feed/meta",
    description: "Catalogue produits pour Facebook & Instagram Dynamic Ads",
    avantages: ["Dynamic Ads automatiques", "Retargeting produit précis", "Instagram Shopping"],
    etapes: [
      "Va dans Meta Business Suite → Commerce Manager",
      "Crée un catalogue → Source de données → URL planifiée",
      "Colle l'URL CSV ci-dessous",
      "Synchronisation automatique toutes les 24h",
    ],
    badge: "Payant",
    badgeTon: "neutre" as const,
  },
  {
    id: "tiktok",
    nom: "TikTok Shop",
    Icon: Music4,
    color: "#010101",
    format: "CSV",
    path: "/api/feed/tiktok",
    description: "Catalogue pour TikTok Ads & TikTok Shop",
    avantages: ["Viral product videos", "TikTok Shopping", "Jeune audience africaine"],
    etapes: [
      "Va dans TikTok for Business : ads.tiktok.com",
      "Assets → Catalogue → Créer un catalogue",
      "Source de données → URL → Colle l'URL ci-dessous",
      "Mapping des colonnes → Sauvegarde",
    ],
    badge: "Payant",
    badgeTon: "neutre" as const,
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
      toast.error(t("Copie impossible : sélectionne l'URL et copie-la à la main."));
    }
  }
  return (
    <Bouton variante="secondaire" taille="compact" onClick={copier}
      icone={copied ? <Check className="size-3.5 text-succes" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}>
      {copied ? t("URL copiée") : t("Copier l'URL")}
    </Bouton>
  );
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
    <div className="space-y-6 max-w-4xl">
      <ModuleTutorial moduleKey="feeds" titre={t("Flux produits")} sousTitre={t("Diffuse ton catalogue ailleurs")} steps={FEEDS_TUTORIAL_STEPS} />
      <EnTeteModule icon="database" title={t("Flux Produits (Feeds)")} tutoriel="feeds" />

      {erreur && (
        <Alerte ton="erreur" titre={t("L'adresse de ta boutique n'a pas pu être chargée")}
          action={<Bouton variante="secondaire" taille="compact" onClick={() => window.location.reload()}>{t("Recharger la page")}</Bouton>}>
          {t("Les URL des flux ne peuvent pas être affichées sans elle.")}
        </Alerte>
      )}

      {/* Comment Shopify fait */}
      <div className="rounded-carte border border-info-bordure bg-info-fond p-5">
        <div className="flex items-start gap-3">
          <Info className="size-4 text-info flex-shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="ax-libelle font-semibold">{t("Comment Shopify fait ses Ads")}</p>
            <p className="ax-texte-secondaire text-encre mt-1">
              {t("Shopify ne lance pas les pubs lui-même. Il génère des")}{" "}<strong>{t("flux produits XML/CSV")}</strong>{" "}{t("que Google, Meta et TikTok consomment automatiquement. Les plateformes créent ensuite des")}{" "}<strong>{t("Dynamic Ads")}</strong>{" "}{t("— elles montrent automatiquement le bon produit à la bonne personne en retargeting.")}
              <br /><strong>{t("AXSO fait exactement la même chose.")}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Stat produits */}
      {slug && (
        <div className="ax-card flex flex-wrap items-center gap-4 p-4">
          <div className="w-10 h-10 rounded-controle bg-primaire-fond flex items-center justify-center" aria-hidden>
            <Package className="size-4 text-attention" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-encre">{t(nbProduits)}{" "}{t("produits dans votre catalogue")}</p>
            <p className="ax-aide">{t("Boutique :")}{" "}<strong>{slug}</strong>{" "}{t("· Tous synchronisés dans les feeds ci-dessous")}</p>
          </div>
          <a href={`/api/feed/google?slug=${slug}`} target="_blank" rel="noopener noreferrer" className={classesBouton({ variante: "secondaire", taille: "compact" })}>
            <RefreshCw className="size-3.5" aria-hidden />{t("Tester le flux Google")}
          </a>
        </div>
      )}

      {/* Cards plateformes */}
      <div className="space-y-5">
        {PLATEFORMES_FEED.map((plat) => {
          // Pas d'URL d'exemple copiable : tant que l'adresse de la boutique n'est pas connue, on n'en affiche aucune.
          const feedUrl = slug ? `${appUrl}${plat.path}?slug=${slug}` : "";
          return (
            <section key={plat.id} aria-labelledby={`flux-${plat.id}`} className="ax-card overflow-hidden">
              {/* Header carte */}
              <div className="flex items-center justify-between gap-3 p-5 border-b border-bordure">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: plat.color + "15" }}>
                    <plat.Icon size={22} style={{ color: plat.color }} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 id={`flux-${plat.id}`} className="ax-sous-titre">{t(plat.nom)}</h2>
                      <Badge ton={plat.badgeTon}>{t(plat.badge)}</Badge>
                    </div>
                    <p className="text-xs text-doux">{t(plat.description)}</p>
                  </div>
                </div>
                <span className="text-xs text-doux bg-carte-2 border border-bordure px-2.5 py-1 rounded-lg">{t(plat.format)}</span>
              </div>

              <div className="p-5 space-y-4">
                {/* URL du feed */}
                <div>
                  <label className="text-xs font-semibold text-doux block mb-2">{t("URL du flux à coller dans")}{" "}{t(plat.nom)}</label>
                  {feedUrl ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-carte-2 border border-bordure rounded-controle p-3">
                    <code className="text-xs text-encre flex-1 min-w-0 break-all sm:truncate">
                      {feedUrl}
                    </code>
                    <div className="flex gap-2 flex-shrink-0">
                      <CopyButton text={feedUrl} />
                      <a href={feedUrl} target="_blank" rel="noopener noreferrer" className={classesBouton({ variante: "fantome", taille: "compact" })}>
                        <ExternalLink className="size-3.5" aria-hidden />{t("Voir le flux")}
                      </a>
                    </div>
                  </div>
                  ) : chargement ? <Squelette className="h-12 w-full" /> : (
                    <p className="ax-aide">{t("URL indisponible tant que l'adresse de ta boutique n'est pas chargée.")}</p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Avantages */}
                  <div>
                    <p className="text-xs font-semibold text-doux mb-2 flex items-center gap-1"><CheckCircle size={12} className="text-[#D4911A]" />{" "}{t("Avantages")}</p>
                    <ul className="space-y-1.5">
                      {plat.avantages.map((a) => (
                        <li key={a} className="flex items-start gap-2 text-xs text-doux">
                          <Zap size={10} className="text-[#F5A623] mt-0.5 flex-shrink-0" /> {t(a)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Étapes */}
                  <div>
                    <p className="text-xs font-semibold text-doux mb-2 flex items-center gap-1"><ClipboardList size={12} className="text-gray-500" />{" "}{t("Comment faire")}</p>
                    <ol className="space-y-1.5">
                      {plat.etapes.map((e, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-doux">
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                            style={{ background: plat.color + "20", color: plat.color }}>
                            {i + 1}
                          </span>
                          {t(e)}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Google Shopping gratuit — CTA spécial */}
      <div className="rounded-carte border border-attention-bordure bg-primaire-fond p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-controle bg-secondaire flex items-center justify-center flex-shrink-0" aria-hidden><Gift size={22} className="text-primaire" /></div>
          <div>
            <p className="font-bold text-encre text-base">{t("Google Shopping GRATUIT — À faire en priorité")}</p>
            <p className="text-encre text-sm mt-1 leading-relaxed">
              {t("Depuis 2020, Google permet à tous les marchands d'apparaître dans Google Shopping GRATUITEMENT. Soumets ton feed Google maintenant → tes produits apparaissent dans les résultats de recherche en 24-72h sans payer un centime.")}
            </p>
            <a href="https://merchants.google.com" target="_blank" rel="noopener noreferrer" className={classesBouton({ className: "mt-3" })}>
              <ExternalLink className="size-4" aria-hidden />{t("Ouvrir Google Merchant Center")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
