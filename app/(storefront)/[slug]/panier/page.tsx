export const dynamic = "force-dynamic";

// Page panier (mode d'achat « panier », lib/mode-achat.ts) : même contenu que le panneau latéral.
// En mode « commande directe » (ou boutique digitale), pas de panier : retour au catalogue.
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { boutiqueVisible } from "@/lib/tenant";
import { resolveConfigVitrine } from "@/lib/vitrine-design";
import { habillageDesign } from "@/components/storefront/templates/HabillageDesign";
import { StorefrontNavbar } from "@/components/storefront/StorefrontNavbar";
import { ContenuPanier } from "@/components/storefront/Panier";
import { panierActif } from "@/lib/mode-achat";
import { getT } from "@/lib/i18n/serveur";

export const metadata = { title: "Panier" };

export default async function PanierPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await getT();
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug }, include: { collections: { where: { actif: true }, take: 5 } } });
  if (!tenant || !(await boutiqueVisible(tenant))) notFound();
  const cfg = await resolveConfigVitrine(tenant.themeId, tenant.id, (tenant.themeConfig as Record<string, any>) || {});
  if (!panierActif(tenant.parametresCommande, cfg.modeBoutique === "digital")) redirect(`/${slug}/produits`);
  const c = cfg.colors;

  const contenu = (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">{t("Panier")}</h1>
      <ContenuPanier slug={slug} devise={tenant.devise} accent={c.accent} texte={c.texte} />
    </main>
  );

  const Habillage = habillageDesign(cfg);
  if (Habillage) return <Habillage>{contenu}</Habillage>;
  return (
    <div style={{ backgroundColor: c.fond, color: c.texte, minHeight: "100vh" }}>
      <StorefrontNavbar slug={slug} nomBoutique={tenant.nomBoutique} logoUrl={tenant.logoUrl} accent={c.accent} fond={c.fond} texte={c.texte} radius={cfg.radius}
        collections={tenant.collections} certifie={tenant.certifie} navStyle={cfg.navigationStyle} showAbout={cfg.aboutPage?.actif} showContact={cfg.contactPage?.actif} />
      {contenu}
    </div>
  );
}
