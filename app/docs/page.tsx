// Documentation : tous les guides, par rubrique.
import type { Metadata } from "next";
import Link from "next/link";
import { AppelFinal, HeroPage, PageAxm, Section } from "@/components/marketing/site/Blocs";
import { Scene } from "@/components/marketing/motion/Scenes";
import { GUIDES, RUBRIQUES } from "@/lib/contenu-site";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = { title: "Documentation", description: "Documentation AXSO : démarrage, boutique, paiements, livraison, vente aux professionnels et Stella." };

export default async function DocsPage() {
  const t = await getT();
  return <PageAxm>
    <HeroPage image={{ src: "/visuels/hero-docs.webp", alt: "" }} surtitre={t("Documentation")} titre={t("Tout comprendre. Tout de suite.")} lead={t("Des guides courts, pas à pas, pour chaque étape de votre commerce.")} principal={{ label: t("Commencer par le début"), href: `/docs/${GUIDES[0].slug}` }} />
    <Section serre><div className="axx-duo"><div><h2 className="axm-h2">{t("Votre boutique en ligne aujourd'hui.")}</h2><p className="axm-lead" style={{ marginTop: 16 }}>{t("Suivez les trois premiers guides : compte, produits, paiement. Le reste vient quand vous en avez besoin.")}</p></div><Scene type="vitrine" t={t} photo="/visuels/premiers-guides.webp" /></div></Section>
    {RUBRIQUES.map((r) => <Section key={r} serre><h2 className="axm-h3" style={{ marginBottom: 22 }}>{t(r)}</h2>
      <div className="axx-index">{GUIDES.filter((g) => g.rubrique === r).map((g) => <Link key={g.slug} href={`/docs/${g.slug}`} className="axx-lien"><b>{t(g.titre)}</b><span>{t(g.resume)}</span><em>{g.duree} min</em></Link>)}</div>
    </Section>)}
    <AppelFinal titre={t("Vous ne trouvez pas votre réponse ?")} principal={{ label: t("Écrivez-nous"), href: "/contact" }} secondaire={{ label: t("Voir le blog"), href: "/blog" }} />
  </PageAxm>;
}
