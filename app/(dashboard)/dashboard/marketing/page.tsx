// Dashboard Marketing et promotions
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatMontant } from "@/lib/utils";
import Link from "next/link";
import {
  Tag,
  Mail,
  Megaphone,
  TrendingUp,
  ArrowRight,
  Users,
  Zap,
  Target,
} from "lucide-react";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { MarketingTutorial } from "@/components/dashboard/tutorials/MarketingTutorial";
import { getT } from "@/lib/i18n/serveur";
import { Badge, Bouton, EnTetePage, EtatVide, type Ton } from "@/components/ui";

export default async function MarketingPage() {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "marketing");

  const tenantId = (session.user as any)?.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) redirect("/inscription");

  const [codesPromo, totalClients, totalCodes, codesActifs] = await Promise.all([
    prisma.codePromo.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.client.count({ where: { tenantId } }),
    prisma.codePromo.count({ where: { tenantId } }),
    prisma.codePromo.count({ where: { tenantId, actif: true } }),
  ]);

  const pixelsActifs = [tenant.metaPixelId, tenant.tiktokPixelId, tenant.snapPixelId, tenant.gtmId].filter(Boolean).length;

  const tools = [
    {
      icone: Tag,
      titre: "Codes Promo",
      description: "Créez des remises pour fidéliser vos clients et booster vos ventes.",
      href: "/dashboard/marketing/codes-promo",
      accent: "#F5A623",
      stat: codesActifs > 0 ? t("{0} code(s) actif(s)", codesActifs) : t("Aucun code actif"),
      ton: (codesActifs > 0 ? "attention" : "neutre") as Ton,
    },
    {
      icone: Mail,
      titre: "Email Marketing",
      description: "Envoyez des campagnes email ciblées à votre base clients.",
      href: "/dashboard/marketing/email",
      accent: "#16A34A",
      stat: t("{0} client(s) à contacter", totalClients),
      ton: "succes" as Ton,
    },
    {
      icone: Megaphone,
      titre: "Campagnes",
      description: "Popups, relances automatiques et badges pour votre boutique.",
      href: "/dashboard/campagnes",
      accent: "#7C3AED",
      stat: t("Popups et automatisations"),
      ton: "neutre" as Ton,
    },
    {
      icone: TrendingUp,
      titre: "SEO & Visibilité",
      description: "Optimisez le référencement de vos produits pour attirer plus de visiteurs.",
      href: "/dashboard/produits",
      accent: "#D97706",
      stat: t("Optimisez vos fiches"),
      ton: "neutre" as Ton,
    },
    {
      icone: Target,
      titre: "Tracking & Pixels",
      description: "Meta, TikTok, Snapchat, Google Tag Manager et vos scripts de suivi personnalisés.",
      href: "/dashboard/marketing/tracking",
      accent: "#1877F2",
      stat: pixelsActifs > 0 ? t("{0} pixel(s) actif(s)", pixelsActifs) : t("Aucun pixel actif"),
      ton: (pixelsActifs > 0 ? "info" : "neutre") as Ton,
    },
  ];

  return (
    <div className="space-y-6">
      <MarketingTutorial />
      <EnTetePage className="mb-0"
        titre={<span className="inline-flex items-center gap-2">{t("Marketing")}{" "}<AgentActiveIndicator label={t("Agent Marketing actif")} /></span>}
        description={t("Boostez vos ventes avec des outils ciblés")}
        indicateurs={<BoutonRevoirTutoriel moduleKey="marketing" />}
        actions={<Bouton href="/dashboard/marketing/codes-promo" icone={<Tag className="size-4" aria-hidden />}>{t("Créer un code promo")}</Bouton>} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Codes actifs",    value: codesActifs.toString(),                                                              icon: Tag,      accent: "#F5A623" },
          { label: "Total codes",     value: totalCodes.toString(),                                                              icon: Zap,      accent: "#7C3AED" },
          { label: "Base clients",    value: totalClients.toString(),                                                              icon: Users,    accent: "#16A34A" },
          { label: "Part de codes actifs", value: totalCodes > 0 ? `${Math.round((codesActifs / totalCodes) * 100)}%` : "—", icon: TrendingUp, accent: "#D97706" },
        ].map((stat, i) => {
          const Icone = stat.icon;
          return (
            <div key={i} className="ax-card p-4">
              <div className="w-8 h-8 rounded-controle flex items-center justify-center bg-carte-2 mb-3" aria-hidden>
                <Icone size={15} style={{ color: stat.accent }} />
              </div>
              <p className="text-encre text-xl font-bold tabular-nums">{stat.value}</p>
              <p className="ax-aide mt-0.5">{t(stat.label)}</p>
            </div>
          );
        })}
      </div>

      {/* Grid outils marketing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((tool, i) => {
          const Icone = tool.icone;
          return (
            <Link key={i} href={tool.href} className="group rounded-carte focus-visible:outline-2 focus-visible:outline-focus">
              <div className="ax-card p-6 group-hover:border-bordure-forte transition-colors h-full flex flex-col">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-controle flex items-center justify-center bg-carte-2" aria-hidden>
                    <Icone size={20} style={{ color: tool.accent }} />
                  </div>
                  <ArrowRight size={16} aria-hidden className="text-doux group-hover:text-encre group-hover:translate-x-0.5 transition-all duration-200 mt-1" />
                </div>

                <h2 className="ax-sous-titre">{t(tool.titre)}</h2>
                <p className="ax-texte-secondaire mt-1 flex-1">{t(tool.description)}</p>

                <div className="mt-4 pt-4 border-t border-bordure flex items-center justify-between gap-2">
                  <Badge ton={tool.ton}>{tool.stat}</Badge>
                  <span className="text-xs font-semibold text-encre">{t("Ouvrir")} →</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Codes promo récents */}
      {codesPromo.length > 0 && (
        <div className="ax-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-controle flex items-center justify-center bg-carte-2" aria-hidden>
                <Tag size={15} className="text-attention" />
              </div>
              <div>
                <h2 className="ax-sous-titre">{t("Codes promo récents")}</h2>
                <p className="ax-aide">{t("{0} actif(s) sur {1}", codesActifs, totalCodes)}</p>
              </div>
            </div>
            <Bouton variante="fantome" taille="compact" href="/dashboard/marketing/codes-promo">{t("Voir tous les codes")} →</Bouton>
          </div>

          <div className="space-y-2">
            {codesPromo.map((code) => (
              <div
                key={code.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-controle bg-carte-2 border border-bordure"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <code className="text-sm font-mono font-bold px-3 py-1 rounded-controle bg-primaire-fond text-encre border border-attention-bordure">
                    {code.code}
                  </code>
                  <span className="ax-texte-secondaire">
                    {code.type === "pourcentage"
                      ? t("{0}% de remise", code.valeur)
                      : t("{0} de remise", formatMontant(code.valeur, tenant.devise))}
                    {code.produitIds.length > 0 && ` · ${t("réservé à certains produits")}`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="ax-aide">
                    {code.utilisations}/{code.maxUtilisations ?? "∞"} {t("utilisations")}
                  </span>
                  <Badge ton={code.actif ? "succes" : "neutre"}>{code.actif ? t("Actif") : t("Inactif")}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {codesPromo.length === 0 && totalClients === 0 && (
        <EtatVide icone={<Megaphone />} titre={t("Prêt à booster vos ventes ?")}
          texte={t("Commencez par créer un code promo pour attirer vos premiers clients.")}>
          <Bouton variante="secondaire" href="/dashboard/marketing/codes-promo" icone={<Tag className="size-4" aria-hidden />}>{t("Créer un code promo")}</Bouton>
        </EtatVide>
      )}
    </div>
  );
}
