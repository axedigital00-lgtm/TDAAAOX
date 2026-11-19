// Marketing (vue d'ensemble de la Croissance, masterprompt §8.10) : seulement des chiffres réels (D4).
// Bandeau Autopilot et ventes attribuées : chantier (D5), absents.
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatMontant } from "@/lib/utils";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { MarketingTutorial } from "@/components/dashboard/tutorials/MarketingTutorial";
import { getT } from "@/lib/i18n/serveur";
import { Badge, Button, Card, CardSection, ResourceList, SettingsRow, type BadgeTone } from "@/components/ui/adm";
import type { IconName } from "@/components/ui/icones";
import { EnTeteModule } from "../clients/EnTeteModule";

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

  const outils: { icon: IconName; titre: string; description: string; href: string; stat: string; tone: BadgeTone }[] = [
    { icon: "discount", titre: t("Réductions"), description: t("Créez des remises pour fidéliser vos clients et booster vos ventes."), href: "/dashboard/marketing/codes-promo",
      stat: codesActifs > 0 ? t("{0} code(s) actif(s)", codesActifs) : t("Aucun code actif"), tone: codesActifs > 0 ? "success" : "neutral" },
    { icon: "mail", titre: t("Email Marketing"), description: t("Envoyez des campagnes email ciblées à votre base clients."), href: "/dashboard/marketing/email",
      stat: t("{0} client(s) à contacter", totalClients), tone: "info" },
    { icon: "bolt", titre: t("Campagnes"), description: t("Popups, relances automatiques et badges pour votre boutique."), href: "/dashboard/campagnes",
      stat: t("Popups et automatisations"), tone: "neutral" },
    { icon: "search", titre: t("SEO & Visibilité"), description: t("Optimisez le référencement de vos produits pour attirer plus de visiteurs."), href: "/dashboard/produits",
      stat: t("Optimisez vos fiches"), tone: "neutral" },
    { icon: "eye", titre: t("Tracking & Pixels"), description: t("Meta, TikTok, Snapchat, Google Tag Manager et vos scripts de suivi personnalisés."), href: "/dashboard/marketing/tracking",
      stat: pixelsActifs > 0 ? t("{0} pixel(s) actif(s)", pixelsActifs) : t("Aucun pixel actif"), tone: pixelsActifs > 0 ? "info" : "neutral" },
  ];
  const stats = [
    { label: t("Codes actifs"), value: codesActifs.toString() },
    { label: t("Total codes"), value: totalCodes.toString() },
    { label: t("Base clients"), value: totalClients.toString() },
    { label: t("Part de codes actifs"), value: totalCodes > 0 ? `${Math.round((codesActifs / totalCodes) * 100)} %` : "—" },
  ];

  return (
    <div className="space-y-4">
      <MarketingTutorial />
      <EnTeteModule icon="gauge" title={t("Marketing")} tutoriel="marketing"
        titleMeta={<AgentActiveIndicator label={t("Agent Marketing actif")} />}
        primaryAction={{ content: t("Créer un code promo"), href: "/dashboard/marketing/codes-promo" }} />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-xl) bg-(--color-border-secondary) shadow-(--shadow-card) sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-(--color-surface) px-4 py-3">
            <p className="text-xs text-(--color-text-secondary)">{s.label}</p>
            <p className="tabular-nums text-lg font-[550] text-(--color-text-strong)">{s.value}</p>
          </div>
        ))}
      </div>

      <ResourceList>
        {outils.map((o) => (
          <SettingsRow key={o.href} icon={o.icon} title={o.titre} subtitle={o.description} href={o.href} end={<Badge tone={o.tone}>{o.stat}</Badge>} />
        ))}
      </ResourceList>

      {codesPromo.length > 0 && (
        <Card title={t("Codes promo récents")} padding="none"
          actions={<Button variant="plain" href="/dashboard/marketing/codes-promo">{t("Voir tous les codes")}</Button>}>
          {codesPromo.map((code) => (
            <CardSection key={code.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono font-[600] text-(--color-text-strong)">{code.code}</span>
                  <p className="text-xs text-(--color-text-secondary)">
                    {code.type === "pourcentage" ? t("{0} % de remise", code.valeur) : t("{0} de remise", formatMontant(code.valeur, tenant.devise))}
                    {code.produitIds.length > 0 && ` · ${t("réservé à certains produits")}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-xs text-(--color-text-secondary)">{code.utilisations}/{code.maxUtilisations ?? "∞"} {t("utilisations")}</span>
                  <Badge tone={code.actif ? "success" : "neutral"}>{code.actif ? t("Actif") : t("Inactif")}</Badge>
                </div>
              </div>
            </CardSection>
          ))}
        </Card>
      )}
    </div>
  );
}
