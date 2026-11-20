// Documentation : rubriques et guides prévus.
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";
import { PageAxm, HeroPage, Section, AppelFinal, Coches } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Documentation AXSO : démarrage, boutique, paiements, livraison, IA.",
};

const SECTIONS = [
  { titre: "Démarrage rapide", articles: ["Créer votre boutique en 3 étapes", "Choisir vos modes de paiement", "Ajouter vos premiers produits", "Personnaliser votre thème"] },
  { titre: "Boutique et produits", articles: ["Produits physiques et numériques", "Gestion des variantes", "Livraison des produits numériques", "Import du catalogue depuis Excel"] },
  { titre: "Paiements", articles: ["Paiement à la livraison", "Mobile Money à la livraison", "Gestion des remboursements"] },
  { titre: "Livraison", articles: ["Zones et tarifs de livraison", "Gérer vos livreurs", "Suivi de commande"] },
  { titre: "Stella", articles: ["Présentation de Stella", "Réponses aux clients", "Génération de fiches produits", "Démarrage de la boutique avec Stella"] },
];

export default async function DocsPage() {
  const t = await getT();
  return (
    <PageAxm>
      <HeroPage surtitre={t("Documentation")} titre={t("Tout ce qu’il faut savoir pour maîtriser AXSO")}
        lead={t("Les guides détaillés sont en cours de rédaction. Voici les rubriques prévues.")} />
      <Section serre>
        <div className="axm-grid axm-g3">
          {SECTIONS.map((s) => (
            <div key={s.titre} className="axm-card">
              <h3 className="axm-h4" style={{ marginBottom: 20 }}>{t(s.titre)}</h3>
              <Coches items={s.articles.map((a) => t(a))} />
            </div>
          ))}
        </div>
      </Section>
      <AppelFinal titre={t("Une question en attendant ?")} principal={{ label: t("Écrivez-nous"), href: "/contact" }} />
    </PageAxm>
  );
}
