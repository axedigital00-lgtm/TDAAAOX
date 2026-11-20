// À propos : mission, ce qui nous guide, présence africaine, appel final.
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";
import { PageAxm, HeroPage, Section, AppelFinal, CartesLiens } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = {
  title: "À propos",
  description: "AXSO est la plateforme de commerce pensée pour les entrepreneurs africains : boutique en ligne, WhatsApp, caisse et livraison au même endroit.",
};

const VALEURS = [
  { titre: "Pensé pour l’Afrique", desc: "Paiement à la livraison, Mobile Money, livraison par quartier, prix en FCFA : nous partons des réalités du terrain." },
  { titre: "Simple, sans technique", desc: "Un commerçant à Dakar ou à Douala n’a pas besoin d’un développeur pour vendre en ligne. AXSO reste simple, même quand il devient puissant." },
  { titre: "L’IA au service du marchand", desc: "Stella s’occupe de ce qui prend du temps : fiches produits, analyses, idées de promotions. Vous gardez toujours la décision." },
  { titre: "Transparence", desc: "Pas de frais cachés ni de commission surprise. Votre boutique, vos données et votre argent restent à vous." },
];

const PAYS = [["cm", "Cameroun"], ["ci", "Côte d’Ivoire"], ["sn", "Sénégal"], ["ga", "Gabon"], ["cg", "Congo"], ["bj", "Bénin"], ["tg", "Togo"], ["bf", "Burkina Faso"], ["ml", "Mali"], ["ng", "Nigeria"], ["gh", "Ghana"], ["ke", "Kenya"]];

export default async function AboutPage() {
  const t = await getT();
  return (
    <PageAxm>
      <HeroPage
        surtitre={t("À propos d’AXSO")}
        titre={t("Donner à chaque commerçant africain les outils des plus grands")}
        lead={t("AXSO est né d’un constat simple : les entrepreneurs africains méritent des outils aussi puissants que ceux du reste du monde, et adaptés à leur réalité.")}
      />
      <Section serre>
        <div className="axm-grid axm-g3">
          {["/hero-market.webp", "/catalogue-atelier.webp", "/hero-moto.webp"].map((src) => (
            <img key={src} src={src} alt="" className="axm-img" style={{ aspectRatio: "3 / 4" }} loading="lazy" />
          ))}
        </div>
      </Section>

      <Section clair titre={t("Notre mission")} lead={t("Le commerce africain est l’un des moteurs de la décennie. AXSO permet à chaque marchand, qu’il soit à Dakar, Abidjan, Douala ou Lagos, de vendre en ligne, d’organiser ses livraisons et de grandir sans limite.")} />

      <Section titre={t("Ce qui nous guide")}>
        <div className="axm-grid axm-g2">
          {VALEURS.map((v) => (
            <div key={v.titre} className="axm-card" style={{ minHeight: 200 }}>
              <h3 className="axm-h4" style={{ fontSize: 24 }}>{t(v.titre)}</h3>
              <p className="axm-muted" style={{ marginTop: 12, lineHeight: 1.6, fontSize: 17 }}>{t(v.desc)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section serre titre={t("Conçu pour les marchés africains")}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {PAYS.map(([c, n]) => <span key={c} className="axm-pill"><img src={`/brand/drapeaux/${c}.png`} alt="" className="axm-flag" />{t(n)}</span>)}
        </div>
      </Section>

      <Section serre titre={t("En savoir plus")}>
        <CartesLiens items={[
          { titre: t("Carrières"), texte: t("Rejoignez l’équipe qui construit le commerce africain de demain."), href: "/jobs", lien: t("Voir les postes") },
          { titre: t("Presse"), texte: t("Ressources et contacts pour les journalistes."), href: "/press", lien: t("Espace presse") },
          { titre: t("Témoignages"), texte: t("Ce que disent les marchands qui vendent avec AXSO."), href: "/temoignages", lien: t("Lire les avis") },
        ]} />
      </Section>

      <AppelFinal
        titre={t("Rejoignez les commerçants qui vendent avec AXSO")}
        principal={{ label: t("Démarrer gratuitement"), href: "/inscription" }}
        secondaire={{ label: t("Nous contacter"), href: "/contact" }}
      />
    </PageAxm>
  );
}
