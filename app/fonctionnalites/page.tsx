// Fonctionnalités : une page par grands piliers (vendre, encaisser, livrer,
// développer, gérer, Stella), chacun avec ses outils et un aperçu de l'admin.
import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/serveur";
import { PageAxm, HeroPage, Section, Bloc, Faq, AppelFinal, Coches } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = {
  title: "Fonctionnalités — la plateforme e-commerce africaine",
  description: "Boutique en ligne, WhatsApp, caisse, paiement à la livraison, livreurs, promotions, analyses et l'assistante Stella : tout pour vendre en Afrique.",
};

const PILIERS = [
  { id: "vendre", label: "Vendre" }, { id: "encaisser", label: "Encaisser" }, { id: "livrer", label: "Livrer" },
  { id: "developper", label: "Développer" }, { id: "gerer", label: "Gérer" }, { id: "axia", label: "Stella" },
];

export default async function FonctionnalitesPage() {
  const t = await getT();
  return (
    <PageAxm>
      <HeroPage
        surtitre={t("Fonctionnalités")}
        titre={t("Tout ce qu’il faut pour vendre, au même endroit")}
        lead={t("Boutique en ligne, commandes WhatsApp, caisse en magasin, livraison et promotions : AXSO réunit vos outils de commerce dans un seul admin, pensé pour l’Afrique.")}
        principal={{ label: t("Démarrer gratuitement"), href: "/inscription" }}
        secondaire={{ label: t("Voir les forfaits"), href: "/tarifs" }}
        image={{ src: "/editorial/atelier.webp", alt: t("Une créatrice prépare ses commandes dans son atelier") }}
      >
        <nav className="axm-tabs" style={{ marginTop: 56 }} aria-label={t("Piliers")}>
          {PILIERS.map((p) => <a key={p.id} href={`#${p.id}`}>{t(p.label)}</a>)}
        </nav>
      </HeroPage>

      {/* ── Vendre ── */}
      <Section id="vendre" titre={t("Vendez partout où sont vos clients")} serre>
        <Bloc
          surtitre={t("Boutique en ligne")}
          titre={t("Une boutique qui vous ressemble, en quelques minutes")}
          texte={t("Choisissez un thème, ajoutez vos produits et personnalisez vos pages avec le constructeur visuel. Votre boutique s’affiche parfaitement sur téléphone.")}
          puces={[t("Thèmes prêts à vendre, modifiables sans code"), t("Variantes de taille, couleur et matière"), t("Produits physiques et numériques"), t("Import du catalogue depuis un fichier Excel")]}
          lien={{ label: t("Découvrir les thèmes"), href: "/themes" }}
          visuel={<img src="/theme-noir-atelier.webp" alt="" className="axm-img" style={{ aspectRatio: "4 / 3" }} loading="lazy" />}
        />
        <Bloc
          inverse
          surtitre={t("WhatsApp et réseaux sociaux")}
          titre={t("Les commandes WhatsApp arrivent directement dans votre admin")}
          texte={t("Partagez vos produits sur WhatsApp, Facebook, Instagram et TikTok. Chaque commande est enregistrée avec le client, l’adresse et le stock mis à jour.")}
          visuel={
            <div className="axm-mock">
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                {["whatsapp", "facebook", "instagram", "tiktok"].map((l) => <img key={l} src={`/brand/partenaires/${l}.svg`} alt={l} width={26} height={26} />)}
              </div>
              {[
                [t("Commande n° 1042 · WhatsApp"), t("À livrer"), "wait"],
                [t("Commande n° 1041 · Boutique en ligne"), t("Livrée"), "ok"],
                [t("Commande n° 1040 · Instagram"), t("En livraison"), ""],
              ].map(([a, b, c]) => (
                <div key={a} className="axm-mock__row"><span>{a}</span><span className={`axm-mock__tag${c ? ` axm-mock__tag--${c}` : ""}`}>{b}</span></div>
              ))}
            </div>
          }
        />
        <Bloc
          surtitre={t("Caisse en magasin")}
          titre={t("Encaissez en boutique avec le même stock que votre site")}
          texte={t("La caisse AXSO fonctionne sur ordinateur, tablette ou téléphone. Ventes en ligne et en magasin se retrouvent dans les mêmes rapports.")}
          puces={[t("Stock partagé entre la boutique et le site"), t("Tickets et historique des ventes"), t("Plusieurs vendeurs, chacun son accès")]}
          visuel={<img src="/hero-stand.webp" alt="" className="axm-img" style={{ aspectRatio: "4 / 3" }} loading="lazy" />}
        />
      </Section>

      {/* ── Encaisser ── */}
      <Section id="encaisser" clair titre={t("Encaissez comme vos clients préfèrent payer")} lead={t("Le paiement à la livraison reste le moyen préféré en Afrique. AXSO l’organise de bout en bout, sans commission sur vos ventes.")}>
        <div className="axm-grid axm-g3">
          {[
            { titre: t("Paiement à la livraison"), texte: t("Le client paie à la réception. Le livreur confirme l’encaissement et la commande est soldée automatiquement.") },
            { titre: t("Mobile Money"), texte: t("À la livraison, vos clients peuvent aussi régler par Orange Money ou MTN MoMo, les moyens qu’ils utilisent tous les jours."), logos: ["orange-money.png", "mtn-momo.png"] },
            { titre: t("Commande par WhatsApp"), texte: t("Le client commande en discutant avec vous, vous confirmez et suivez le paiement depuis l’admin."), logos: ["whatsapp.svg"] },
          ].map((c) => (
            <div key={c.titre} className="axm-card" style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 240 }}>
              <h3 className="axm-h4">{c.titre}</h3>
              <p className="axm-muted" style={{ lineHeight: 1.55 }}>{c.texte}</p>
              {c.logos && <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>{c.logos.map((l) => <span key={l} className="axm-partner axm-partner--sombre" style={{ height: 52, padding: "0 14px" }}><img src={`/brand/partenaires/${l}`} alt="" style={{ height: 34 }} /></span>)}</div>}
            </div>
          ))}
        </div>
        <p style={{ marginTop: 32 }}><Link href="/legal/politique-prix" className="axm-link">{t("Lire la politique de prix")} →</Link></p>
      </Section>

      {/* ── Livrer ── */}
      <Section id="livrer" titre={t("Livrez vite, suivez chaque colis")}>
        <Bloc
          titre={t("Vos livreurs, vos zones, vos tarifs")}
          texte={t("Définissez vos zones et frais de livraison par ville ou quartier, assignez les commandes à vos livreurs et suivez leur position en temps réel.")}
          puces={[t("Application livreur sur téléphone"), t("Suivi du colis partagé avec le client"), t("Encaissements à la livraison rapprochés automatiquement")]}
          lien={{ label: t("Suivre un colis"), href: "/suivi" }}
          visuel={
            <div className="axm-mock">
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("Livraisons du jour")}</div>
              {[
                [t("Akwa · Douala"), t("Livré"), "ok"],
                [t("Bonamoussadi · Douala"), t("En route"), ""],
                [t("Bastos · Yaoundé"), t("À assigner"), "wait"],
              ].map(([a, b, c]) => (
                <div key={a} className="axm-mock__row"><span>{a}</span><span className={`axm-mock__tag${c ? ` axm-mock__tag--${c}` : ""}`}>{b}</span></div>
              ))}
            </div>
          }
        />
      </Section>

      {/* ── Développer ── */}
      <Section id="developper" serre titre={t("Faites grandir vos ventes")}>
        <div className="axm-grid axm-g2">
          {[
            [t("Codes promo et réductions automatiques"), t("Pourcentage, montant fixe ou livraison offerte, avec dates de début et de fin.")],
            [t("Relance des paniers abandonnés"), t("Un message rappelle au client les articles qu’il a laissés de côté.")],
            [t("Programme d’affiliation"), t("Des créateurs partagent vos produits et touchent une commission sur chaque vente.")],
            [t("Référencement et partage"), t("Pages optimisées pour Google et aperçus soignés sur les réseaux sociaux.")],
          ].map(([a, b]) => (
            <div key={a} className="axm-card"><h3 className="axm-h4">{a}</h3><p className="axm-muted" style={{ marginTop: 10, lineHeight: 1.55 }}>{b}</p></div>
          ))}
        </div>
      </Section>

      {/* ── Gérer ── */}
      <Section id="gerer" clair titre={t("Gérez tout depuis un seul admin")}>
        <Bloc
          inverse
          titre={t("Commandes, clients, stock et analyses")}
          texte={t("Retrouvez l’essentiel de votre activité sur l’accueil, filtrez vos commandes et suivez vos ventes jour après jour, sur ordinateur comme sur téléphone.")}
          puces={[t("Tableau de bord des ventes et des visites"), t("Fiches clients avec historique d’achats"), t("Alertes de stock faible"), t("Accès par membre de l’équipe")]}
          visuel={
            <div className="axm-mock">
              <div className="axm-muted" style={{ color: "#5c5c5c", fontSize: 13 }}>{t("Ventes totales")}</div>
              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-.02em", margin: "4px 0 16px" }}>1 245 000 FCFA</div>
              <svg viewBox="0 0 300 90" width="100%" height="90" aria-hidden><path d="M0 70 L30 62 L60 66 L90 48 L120 52 L150 36 L180 40 L210 28 L240 30 L270 16 L300 20" fill="none" stroke="#0b0b0b" strokeWidth="2.5" strokeLinejoin="round" /></svg>
              <p style={{ fontSize: 12, color: "#8a8a8a", marginTop: 8 }}>{t("Exemple d’affichage")}</p>
            </div>
          }
        />
      </Section>

      {/* ── Stella ── */}
      <Section id="axia" titre={t("Stella, votre assistante de commerce")}>
        <Bloc
          titre={t("Elle prépare, vous validez")}
          texte={t("Stella rédige vos fiches produits, analyse vos ventes, propose des promotions et répond à vos questions sur votre boutique. Avant chaque action importante, elle vous demande votre accord.")}
          puces={[t("Fiches produits et descriptions"), t("Résumé de la journée et alertes"), t("Idées de promotions et de messages clients")]}
          visuel={
            <div className="axm-mock">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><img src="/brand/axia-mark.png" alt="" width={34} height={34} /><b>Stella</b></div>
              <div style={{ background: "#f1f1f1", borderRadius: 14, padding: "10px 14px", marginLeft: "auto", width: "fit-content", maxWidth: "80%" }}>{t("Rédige la fiche de mon nouveau pagne wax")}</div>
              <p style={{ marginTop: 14, lineHeight: 1.55 }}>{t("Voici une proposition : titre, description, trois variantes de taille et un prix conseillé. Je l’enregistre en brouillon ?")}</p>
            </div>
          }
        />
      </Section>

      <Section clair>
        <Faq titre={t("Questions fréquentes")} items={[
          { q: t("Faut-il des compétences techniques ?"), r: t("Non. Tout se fait depuis l’admin, avec des thèmes prêts à l’emploi et Stella pour vous guider.") },
          { q: t("Puis-je vendre en ligne et en magasin ?"), r: t("Oui. La caisse et la boutique en ligne partagent le même stock et les mêmes rapports.") },
          { q: t("AXSO prend-il une commission ?"), r: <>{t("Aucune commission AXSO sur les ventes payées à la livraison. Les détails sont dans la")} <Link href="/legal/politique-prix" className="axm-link">{t("politique de prix")}</Link>.</> },
          { q: t("Puis-je commencer gratuitement ?"), r: <Coches items={[t("Le forfait de départ est gratuit"), t("Aucune carte bancaire demandée"), t("Vous changez de forfait quand vous voulez")]} /> },
        ]} />
      </Section>

      <AppelFinal
        titre={t("Commencez à vendre dès aujourd’hui")}
        lead={t("Créez votre boutique gratuitement, sans carte bancaire.")}
        principal={{ label: t("Démarrer gratuitement"), href: "/inscription" }}
        secondaire={{ label: t("Voir les forfaits"), href: "/tarifs" }}
      />
    </PageAxm>
  );
}
