export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { boutiqueVisible } from "@/lib/tenant";
import { notFound } from "next/navigation";
import Link from "next/link";
import { resolveConfigVitrine } from "@/lib/vitrine-design";
import { StorefrontNavbar } from "@/components/storefront/StorefrontNavbar";
import { habillageDesign } from "@/components/storefront/templates/HabillageDesign";
import { CoordonneesPied } from "@/components/storefront/CoordonneesPied";
import { RenduPolitique } from "@/components/politiques/RenduPolitique";
import { estTypePolitique, lirePolitiques, politiquePublique, politiquesPubliees, TITRES_POLITIQUES } from "@/lib/politiques";
import { getT } from "@/lib/i18n/serveur";

interface Props {
  params: Promise<{ slug: string; type: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug, type } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { nomBoutique: true } });
  if (!tenant || !estTypePolitique(type)) return { title: "Page introuvable" };
  return { title: `${TITRES_POLITIQUES[type]} — ${tenant.nomBoutique}` };
}

// Politique de la boutique (B5) : seulement une politique VALIDÉE par le marchand, sinon 404
// (jamais un brouillon ni un passage « À compléter »). Même patron que a-propos / contact.
export default async function PolitiquePage({ params }: Props) {
  const t = await getT();
  const { slug, type } = await params;
  if (!estTypePolitique(type)) notFound();

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { collections: { where: { actif: true }, take: 6, orderBy: { createdAt: "desc" } } },
  });
  if (!tenant || !(await boutiqueVisible(tenant))) notFound();
  const contenu = politiquePublique(lirePolitiques(tenant.politiques)[type]);
  if (!contenu) notFound();

  const cfg = await resolveConfigVitrine(tenant.themeId, tenant.id, tenant.themeConfig as Record<string, any>);
  const c = cfg.colors;
  const largeur = cfg.layout?.largeurContainer;
  const CONTAINER = largeur === "100%" ? "max-w-full" : `max-w-[${largeur || "1280px"}]`;
  const autres = politiquesPubliees(tenant.politiques).filter((p) => p.type !== type);

  const page = (
    <div className={`${CONTAINER} mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16`}>
      <h1 className="text-3xl sm:text-4xl font-bold font-playfair" style={{ color: c.texte }}>{t(TITRES_POLITIQUES[type])}</h1>
      <p className="text-sm mt-2" style={{ opacity: 0.5 }}>
        <Link href={`/${slug}`} className="hover:opacity-100 transition-opacity">{tenant.nomBoutique}</Link>{" · "}{t(TITRES_POLITIQUES[type])}
      </p>
      <article className="max-w-2xl mt-8" style={{ color: c.texte }}>
        <RenduPolitique contenu={contenu} couleurTitre={c.texte} />
      </article>
      {autres.length > 0 && (
        <nav aria-label={t("Autres politiques")} className="max-w-2xl mt-12 pt-6 border-t flex flex-wrap gap-x-5 gap-y-2 text-sm" style={{ borderColor: `${c.accent}20` }}>
          {autres.map((p) => (
            <Link key={p.type} href={`/${slug}/politiques/${p.type}`} className="underline-offset-4 hover:underline" style={{ color: c.accent }}>{t(p.titre)}</Link>
          ))}
        </nav>
      )}
    </div>
  );

  // Boutique à design : même en-tête / pied de page que le reste de la boutique.
  const Habillage = habillageDesign(cfg);
  if (Habillage) return <Habillage>{page}</Habillage>;

  return (
    <div style={{ backgroundColor: c.fond, color: c.texte, minHeight: "100vh" }}>
      <StorefrontNavbar
        slug={slug}
        nomBoutique={tenant.nomBoutique}
        logoUrl={tenant.logoUrl}
        accent={c.accent}
        fond={c.fond}
        texte={c.texte}
        radius={cfg.radius}
        collections={tenant.collections}
        certifie={tenant.certifie}
        navStyle={cfg.navigationStyle}
        showAbout={cfg.aboutPage?.actif}
        showContact={cfg.contactPage?.actif}
      />
      {page}
      <footer className="border-t py-6 text-center text-xs" style={{ borderColor: `${c.accent}15`, opacity: 0.6 }}>
        <CoordonneesPied adresse={tenant.adresse} telephone={tenant.telephone} />
        <nav aria-label={t("Politiques de la boutique")} className="flex flex-wrap justify-center gap-x-4 gap-y-2 my-3">
          {politiquesPubliees(tenant.politiques).map((p) => (
            <Link key={p.type} href={`/${slug}/politiques/${p.type}`} className="hover:underline">{t(p.titre)}</Link>
          ))}
        </nav>
        <p>© {new Date().getFullYear()} {tenant.nomBoutique}{t(". Tous droits réservés.")}</p>
      </footer>
    </div>
  );
}
