// Apprendre AXSO : parcours pas à pas (guides écrits) et film de présentation.
import type { Metadata } from "next";
import Link from "next/link";
import { FilmBoutique } from "@/components/marketing/VideoSection";
import { AppelFinal, HeroPage, PageAxm, Section } from "@/components/marketing/site/Blocs";
import { GUIDES } from "@/lib/contenu-site";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = { title: "Tutoriels", description: "Des parcours pas à pas pour apprendre AXSO, du premier produit à l'automatisation." };

const PARCOURS: { niveau: string; titre: string; texte: string; guides: string[] }[] = [
  { niveau: "Débutant", titre: "Ouvrir sa boutique aujourd'hui", texte: "Du compte à la première commande.", guides: ["creer-sa-boutique", "ajouter-ses-produits", "paiement-livraison", "zones-livraison", "configurer-whatsapp"] },
  { niveau: "Intermédiaire", titre: "Livrer sans stress", texte: "Une logistique propre, même à petite échelle.", guides: ["gerer-livreurs", "suivi-commande", "mobile-money", "remboursements-retours"] },
  { niveau: "Intermédiaire", titre: "Soigner sa marque", texte: "Une boutique à votre image et à votre adresse.", guides: ["variantes", "personnaliser-domaine", "presentation-stella"] },
  { niveau: "Avancé", titre: "Passer à l'échelle", texte: "Vendre aux pros, automatiser et diversifier.", guides: ["vente-en-gros", "devis-entreprises", "workflows-lancements", "produits-numeriques"] },
];

export default async function TutorialsPage() {
  const t = await getT();
  return <PageAxm>
    <HeroPage image={{ src: "/visuels/hero-tutorials.webp", alt: "" }} surtitre={t("Tutoriels")} titre={t("De zéro à votre première vente.")} lead={t("Suivez un parcours, guide après guide, à votre rythme.")} principal={{ label: t("Commencer le parcours"), href: `/docs/${PARCOURS[0].guides[0]}` }} />
    <Section serre><FilmBoutique /></Section>
    {PARCOURS.map((p) => {
      const guides = p.guides.map((s) => GUIDES.find((g) => g.slug === s)!);
      return <Section key={p.titre} serre>
        <p className="axm-eyebrow">{t(p.niveau)} · {guides.length} {t("guides")} · {guides.reduce((n, g) => n + g.duree, 0)} min</p>
        <h2 className="axm-h2" style={{ fontSize: "clamp(30px, 4vw, 52px)" }}>{t(p.titre)}</h2>
        <p className="axm-lead" style={{ margin: "12px 0 26px" }}>{t(p.texte)}</p>
        <div className="axx-index">{guides.map((g, i) => <Link key={g.slug} href={`/docs/${g.slug}`} className="axx-lien"><small>{t("Étape")} {i + 1}</small><b>{t(g.titre)}</b><span>{t(g.resume)}</span><em>{g.duree} min</em></Link>)}</div>
      </Section>;
    })}
    <AppelFinal titre={t("Besoin d’aide pour démarrer ?")} principal={{ label: t("Nous contacter"), href: "/contact" }} secondaire={{ label: t("Toute la documentation"), href: "/docs" }} />
  </PageAxm>;
}
