import type { Metadata } from "next";
import Link from "next/link";
import { AppelFinal, HeroPage, PageAxm, Section } from "@/components/marketing/site/Blocs";
import { Scene, type TypeScene } from "@/components/marketing/motion/Scenes";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = { title: "Les nouveautés AXSO", description: "Devis, comptes entreprises, workflows, lancements, marchés, vente en gros, Stella : tout ce qui vient d'arriver sur AXSO." };

const NOUVEAUTES: { nom: string; titre: string; texte: string; h: string; scene: TypeScene; points: string[] }[] = [
  { nom: "Vente aux pros", titre: "Devis et comptes entreprises", texte: "Envoyez un devis, faites-le accepter en ligne, vendez à terme.", h: "devis-entreprises", scene: "gros", points: ["Lien d'acceptation", "Paiement à 15, 30, 60 jours", "Portail de commande rapide"] },
  { nom: "Automatisation", titre: "L'éditeur de workflows", texte: "Quand, si, alors : automatisez sans écrire de code.", h: "automatisations", scene: "flux", points: ["Quatre déclencheurs", "Conditions combinables", "Modèles prêts à l'emploi"] },
  { nom: "Boutique", titre: "Les lancements planifiés", texte: "Votre opération se met en ligne, puis se retire toute seule.", h: "lancements", scene: "vitrine", points: ["Date de début et de fin", "Retour automatique", "Vos retouches protégées"] },
  { nom: "Client", titre: "Les retours en libre-service", texte: "Le client ouvre sa demande depuis son compte.", h: "comptes-clients", scene: "compte", points: ["14 jours après livraison", "Remboursement ou échange", "Votre accord reste requis"] },
  { nom: "International", titre: "Les marchés multi-pays", texte: "Chaque visiteur lit vos prix dans sa devise.", h: "marches", scene: "marches", points: ["Modèles CEMAC et UEMOA", "Taux personnalisable", "Arrondi local"] },
  { nom: "Gros", titre: "Les prix dégressifs", texte: "Le bon prix s'applique selon la quantité.", h: "vente-en-gros", scene: "promo", points: ["Jusqu'à 10 paliers", "Minimum et maximum", "Vente par multiples"] },
  { nom: "Savoir", titre: "Services, abonnements et parcours", texte: "Vendez votre expertise avec réservation et espace membre.", h: "services-abonnements", scene: "stella", points: ["Réservation de séances", "Livrables et révisions", "Abonnements renouvelables"] },
  { nom: "Domaines", titre: "Domaines personnalisés guidés", texte: "Une connexion claire, avec HTTPS automatique.", h: "domaines", scene: "domaine", points: ["DNS à copier", "Vérification en un clic", "Certificat automatique"] },
];

export default async function Nouveautes() {
  const t = await getT();
  return <PageAxm>
    <HeroPage image={{ src: "/visuels/hero-nouveautes.webp", alt: "" }} centre surtitre={t("Nouveautés")} titre={t("AXSO avance vite. Voici la preuve.")} lead={t("Les dernières fonctionnalités arrivées sur la plateforme, prêtes à être utilisées dans votre boutique.")} />
    <Section serre><div className="axx-bento" style={{ marginTop: 0 }}>
      {NOUVEAUTES.map((n, i) => <Link key={n.h} href={`/fonctionnalites/${n.h}`} className={`axx-carte ${i % 4 === 0 || i % 4 === 3 ? "axx-carte--l" : "axx-carte--m"}`}>
        <Scene type={n.scene} t={t} photo={`/visuels/nouveaute-${n.h}.webp`} />
        <div><p style={{ margin: "0 0 6px", color: "#EBA900", fontSize: 13, fontWeight: 600 }}>{t(n.nom)}</p><h3>{t(n.titre)}</h3><p>{t(n.texte)}</p>
          <ul className="axx-liste" style={{ marginTop: 14 }}>{n.points.map((p) => <li key={p}>{t(p)}</li>)}</ul></div>
      </Link>)}
    </div></Section>
    <AppelFinal titre={t("Essayez tout ça sur votre boutique")} principal={{ href: "/inscription", label: t("Démarrer gratuitement") }} secondaire={{ href: "/fonctionnalites", label: t("Voir tous les modules") }} />
  </PageAxm>;
}
