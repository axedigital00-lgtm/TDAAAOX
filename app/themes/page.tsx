// Thèmes : la bibliothèque de designs de boutique, en grille.
import { seoPage } from "@/lib/seo";
import type { Metadata } from "next";
import { GrilleThemes, NB_THEMES } from "@/components/marketing/ThemesSection";
import { getT } from "@/lib/i18n/serveur";
import Link from "next/link";
import { PageAxm, HeroPage, Section, AppelFinal, Bloc } from "@/components/marketing/site/Blocs";
import { FAMILLES_THEMES } from "@/lib/themes-familles";

export const metadata: Metadata = seoPage("/themes");

export default async function ThemesPage({ searchParams }: { searchParams: Promise<{ style?: string }> }) {
  const t = await getT();
  const { style } = await searchParams;
  const famille = FAMILLES_THEMES.some((f) => f.nom === style) ? style : undefined;
  return (
    <PageAxm>
      <HeroPage image={{ src: "/visuels/hero-themes.webp", alt: "" }}
        surtitre={t("Thèmes")}
        titre={t("Une boutique à votre image, sans écrire de code")}
        lead={<>{NB_THEMES} {t("thèmes conçus pour les marchés africains, tous inclus dans votre forfait.")}</>}
        principal={{ label: t("Créer ma boutique"), href: "/inscription" }}
      />
      <Section serre>
        <nav className="axm-tabs" aria-label={t("Filtrer par style")} style={{ marginBottom: 40 }}>
          <Link href="/themes" aria-current={!famille ? "page" : undefined} scroll={false}>{t("Tous les thèmes")}</Link>
          {FAMILLES_THEMES.map((f) => <Link key={f.nom} href={`/themes?style=${encodeURIComponent(f.nom)}`} aria-current={famille === f.nom ? "page" : undefined} scroll={false}>{t(f.nom)}</Link>)}
        </nav>
        <GrilleThemes famille={famille} />
      </Section>
      <Section clair>
        <Bloc
          titre={t("Stella vous propose les thèmes adaptés à votre activité")}
          texte={t("À l’inscription, Stella sélectionne quatre designs selon ce que vous vendez. Vous les appliquez ensuite et les personnalisez depuis le constructeur : couleurs, logo, sections et pages.")}
          puces={[t("Vos vrais produits déjà affichés dans le thème"), t("Parfait sur téléphone"), t("Changement de thème sans perdre vos réglages")]}
          visuel={<img src="/visuels/theme-construction.webp" alt="" className="axm-img" style={{ aspectRatio: "4 / 3" }} loading="lazy" />}
        />
      </Section>
      <AppelFinal
        titre={t("Choisissez votre thème et commencez à vendre")}
        principal={{ label: t("Démarrer gratuitement"), href: "/inscription" }}
        secondaire={{ label: t("Voir les fonctionnalités"), href: "/fonctionnalites" }}
      />
    </PageAxm>
  );
}
