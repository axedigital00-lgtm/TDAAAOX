export const dynamic = "force-dynamic";

// FAQ de la boutique : les questions de sa section FAQ (lib/liens-design.ts, faqBoutique), rien d'inventé.
// Sans question, pas de page (le lien du pied de page est retiré de la même façon).
import { prisma } from "@/lib/prisma";
import { boutiqueVisible } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { resolveConfigVitrine } from "@/lib/vitrine-design";
import { faqBoutique } from "@/lib/liens-design";
import { habillageDesign } from "@/components/storefront/templates/HabillageDesign";
import { StorefrontNavbar } from "@/components/storefront/StorefrontNavbar";
import { getT } from "@/lib/i18n/serveur";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { nomBoutique: true } });
  return { title: tenant ? `FAQ — ${tenant.nomBoutique}` : "Page introuvable" };
}

export default async function FaqPage({ params }: Props) {
  const t = await getT();
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug }, include: { collections: { where: { actif: true }, take: 6, orderBy: { createdAt: "desc" } } } });
  if (!tenant || !(await boutiqueVisible(tenant))) notFound();
  const cfg = await resolveConfigVitrine(tenant.themeId, tenant.id, (tenant.themeConfig as Record<string, any>) || {});
  const questions = faqBoutique(cfg);
  if (!questions.length) notFound();
  const c = cfg.colors;

  const page = (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-10 pb-16">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8" style={{ color: c.texte }}>{t("Questions fréquentes")}</h1>
      <div className="divide-y" style={{ borderColor: `${c.accent}20` }}>
        {questions.map((q, i) => (
          <details key={i} className="py-4 group">
            <summary className="cursor-pointer font-semibold min-h-11 flex items-center">{t(q.question)}</summary>
            <p className="mt-2 leading-relaxed opacity-75 whitespace-pre-line">{t(q.reponse)}</p>
          </details>
        ))}
      </div>
    </main>
  );

  const Habillage = habillageDesign(cfg);
  if (Habillage) return <Habillage>{page}</Habillage>;
  return (
    <div style={{ backgroundColor: c.fond, color: c.texte, minHeight: "100vh" }}>
      <StorefrontNavbar slug={slug} nomBoutique={tenant.nomBoutique} logoUrl={tenant.logoUrl} accent={c.accent} fond={c.fond} texte={c.texte} radius={cfg.radius}
        collections={tenant.collections} certifie={tenant.certifie} navStyle={cfg.navigationStyle} showAbout={cfg.aboutPage?.actif} showContact={cfg.contactPage?.actif} />
      {page}
    </div>
  );
}
