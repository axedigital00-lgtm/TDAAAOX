// Carrières : candidature spontanée (aucun poste ouvert pour l'instant).
import { seoPage } from "@/lib/seo";
import type { Metadata } from "next";
import { AppelFinal, HeroPage, PageAxm, Section } from "@/components/marketing/site/Blocs";
import { Etapes } from "@/components/marketing/motion/Sections";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = seoPage("/jobs");

const VALEURS = [["Partir du terrain", "On construit pour le commerçant de Douala, de Dakar ou d'Abidjan, avec ses vraies contraintes : réseau, livraison, cash."], ["Finir ce qu'on commence", "Une fonctionnalité compte quand un marchand peut réellement s'en servir."], ["Dire la vérité", "Pas de chiffres gonflés ni de promesses en l'air, ni aux clients ni entre nous."], ["Apprendre vite", "Essayer, mesurer, corriger. Le produit évolue chaque semaine."]];
const METIERS = [["Produit et design", "Imaginer des écrans simples pour des usages exigeants."], ["Ingénierie", "Web, données, IA, paiement et fiabilité."], ["Accompagnement", "Aider les marchands à réussir leurs premières ventes."], ["Croissance", "Faire connaître AXSO, marché après marché."], ["Partenariats", "Livraison, paiement et fournisseurs locaux."], ["Contenu", "Guides, formations et vidéos pour les entrepreneurs."]];

export default async function JobsPage() {
  const t = await getT();
  return <PageAxm>
    <HeroPage surtitre={t("Carrières")} titre={t("Construisons le commerce africain de demain.")} lead={t("Une mission simple : donner à chaque commerçant les outils des plus grands.")} principal={{ label: t("Envoyer ma candidature"), href: "mailto:jobs@axsoafrica.com" }} image={{ src: "/visuels/equipe.webp", alt: t("Deux designers au travail dans leur atelier") }} />
    <Section serre titre={t("Comment nous travaillons")}><div className="axm-grid axm-g2">{VALEURS.map(([a, b]) => <div key={a} className="axm-card"><h3 className="axm-h4" style={{ fontSize: 24 }}>{t(a)}</h3><p className="axm-muted" style={{ marginTop: 10, lineHeight: 1.55 }}>{t(b)}</p></div>)}</div></Section>
    <Section serre titre={t("Les métiers qui nous intéressent")} lead={t("Aucun poste n'est ouvert pour le moment, mais une belle candidature spontanée est toujours lue.")}><div className="axx-index">{METIERS.map(([a, b]) => <a key={a} className="axx-lien" href={`mailto:jobs@axsoafrica.com?subject=${encodeURIComponent(`Candidature spontanée : ${a}`)}`}><b>{t(a)}</b><span>{t(b)}</span><em>{t("Candidature spontanée")} →</em></a>)}</div></Section>
    <Etapes t={t} titre="Bien candidater" items={[["Présentez-vous", "Qui vous êtes et ce que vous aimez construire."], ["Montrez une réalisation", "Un projet, un lien, un résultat concret."], ["Dites ce que vous changeriez", "Une idée précise pour améliorer AXSO."]]} />
    <AppelFinal titre={t("Envie d'en être ?")} lead="jobs@axsoafrica.com" principal={{ label: t("Envoyer ma candidature"), href: "mailto:jobs@axsoafrica.com" }} />
  </PageAxm>;
}
