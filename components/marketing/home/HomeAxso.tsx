// Page d'accueil du site public : même enchaînement que les grandes
// plateformes de commerce (hero, réseau, IA, plateforme, international, cas
// d'usage, assistante, partenaires, chiffres, témoignage, forfaits, démarrage).
// Contenu propre à AXSO ; aucun chiffre ni logo de marchand inventé.
import Link from "next/link";
import { getT } from "@/lib/i18n/serveur";
import type { AvisPublic } from "@/lib/avis-plateforme";
import { FilmBoutique } from "../VideoSection";
import { CinemaHero } from "./CinemaHero";
import { MarketRail } from "./MarketRail";
import { LaunchStory } from "./LaunchStory";
import "./editorial.css";
import { Reveal } from "./Reveal";

const PAYS = [
  ["cm", "Cameroun"], ["ci", "Côte d’Ivoire"], ["sn", "Sénégal"], ["ga", "Gabon"], ["cg", "Congo"], ["bj", "Bénin"],
  ["tg", "Togo"], ["bf", "Burkina Faso"], ["ml", "Mali"], ["ng", "Nigeria"], ["gh", "Ghana"], ["ke", "Kenya"],
];

/** Logos officiels des services partenaires (public/brand/partenaires). */
const PARTENAIRES: { nom: string; logo: string; large?: boolean; texte?: boolean; sombre?: boolean }[] = [
  { nom: "Orange Money", logo: "orange-money.png", large: true, sombre: true },
  { nom: "MTN MoMo", logo: "mtn-momo.png", large: true, sombre: true },
  { nom: "WhatsApp", logo: "whatsapp.svg", texte: true },
  { nom: "Facebook", logo: "facebook.svg", texte: true },
  { nom: "Instagram", logo: "instagram.svg", texte: true },
  { nom: "TikTok", logo: "tiktok.svg", texte: true },
  { nom: "Google", logo: "google.png" },
];

const PRODUITS = [
  { img: "/hero-kente.webp", nom: "Tissu kente", prix: "18 500 FCFA" },
  { img: "/hero-argan.webp", nom: "Huile d’argan", prix: "6 500 FCFA" },
  { img: "/hero-coffee.webp", nom: "Café en grains", prix: "5 500 FCFA" },
  { img: "/hero-bags.webp", nom: "Cabas en cuir", prix: "39 000 FCFA" },
  { img: "/hero-headphones.webp", nom: "Casque sans fil", prix: "24 900 FCFA" },
  { img: "/hero-stand.webp", nom: "Présentoir artisanal", prix: "12 000 FCFA" },
];

const OUTILS = ["Commandes", "Livraison", "Clients", "Caisse", "Stock", "Catalogue", "Réductions", "Analyses"];

export async function HomeAxso({ avis }: { avis: AvisPublic[] }) {
  const t = await getT();
  const temoin = avis.find((a) => (a.texte ?? "").length > 40) ?? avis[0];

  return (
    <div className="axm axm-page">
      <Reveal />
      <CinemaHero />

      {/* ── Mur des moyens de paiement et canaux ─────────────── */}
      <section className="axm-section--tight" style={{ borderTop: "1px solid var(--m-line)", borderBottom: "1px solid var(--m-line)" }}>
        <div className="axm-wrap">
          <p className="axm-eyebrow" style={{ textAlign: "center" }}>{t("Vos clients paient et commandent comme ils en ont l’habitude")}</p>
          <div className="axm-partners">
            <div className="axm-partner">
              <svg width="26" height="26" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.8 5.5h9v8h-9zM11.8 8.5h3l2.4 2.6v2.4h-5.4M6 15.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM14.4 15.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z" /></svg>
              {t("Paiement à la livraison")}
            </div>
            {PARTENAIRES.map((p) => (
              <div key={p.nom} className={`axm-partner${p.large ? " axm-partner--wide" : ""}${p.sombre ? " axm-partner--sombre" : ""}`}>
                <img src={`/brand/partenaires/${p.logo}`} alt={p.nom} loading="lazy" />{p.texte && <span>{p.nom}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="axm-section">
        <div className="axm-wrap">
          <div className="axm-story">
            <div className="axm-story__copy">
              <h2 className="axm-h2">{t("De la vitrine à la conversation.")}</h2>
              <p className="axm-lead">{t("Présentez une collection sur votre boutique et retrouvez vos clients sur WhatsApp pour préparer leur commande.")}</p>
              <Link href="/fonctionnalites" className="axm-link">{t("Découvrir les canaux de vente")}</Link>
            </div>
            <div className="axm-story__scene">
              <video src="/editorial/cabas.mp4" poster="/editorial/cabas.webp" controls playsInline preload="none"
                aria-label={t("Exemple de film produit")} />
              <span className="axm-story__message">{t("Bonjour, ce sac est-il disponible ?")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── La plateforme (bento) ────────────────────────────── */}
      <section className="axm-section" style={{ paddingTop: 0 }}>
        <div className="axm-wrap">
          <h2 className="axm-h2" style={{ maxWidth: 900 }}>{t("Une seule plateforme pour tout votre commerce")}</h2>
          <div className="axm-bento" style={{ marginTop: 48 }}>
            <div className="axm-card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <h3 className="axm-h3">{t("Une boutique qui vous ressemble")}</h3>
              <p className="axm-lead">{t("Choisissez un thème prêt à vendre, ajoutez vos produits et personnalisez chaque page avec le constructeur visuel. Aucune compétence technique n’est nécessaire.")}</p>
              <p><Link href="/themes" className="axm-link">{t("Découvrir les thèmes")} →</Link></p>
              <FilmBoutique />
            </div>
            <div className="axm-card">
              <h3 className="axm-h3">{t("Tout se gère depuis un seul admin")}</h3>
              <p className="axm-lead" style={{ marginTop: 12 }}>{t("Commandes, clients, stock et livraisons au même endroit, sur ordinateur comme sur téléphone.")}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 24 }}>
                {OUTILS.map((o) => <span key={o} className="axm-pill">{t(o)}</span>)}
              </div>
            </div>
            <div className="axm-card">
              <h3 className="axm-h3">{t("Vendez là où sont vos clients")}</h3>
              <p className="axm-lead" style={{ marginTop: 12 }}>
                {t("Boutique en ligne, WhatsApp, réseaux sociaux et magasin physique : vos ventes et votre stock restent synchronisés.")}{" "}
                <Link href="/fonctionnalites" className="axm-link">{t("Voir les canaux")}</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── International ────────────────────────────────────── */}
      <section className="axm-section axm-light">
        <div className="axm-wrap">
          <h2 className="axm-h2" style={{ maxWidth: 900 }}>{t("Pensé pour l’Afrique, du premier client au premier millier")}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 32 }}>
            {PAYS.map(([c, n]) => <span key={n} className="axm-pill" style={{ background: "#f1f1f1", color: "#0b0b0b" }}><img src={`/brand/drapeaux/${c}.png`} alt="" className="axm-flag" />{t(n)}</span>)}
          </div>
          <MarketRail>
            {PRODUITS.map((p) => (
              <div key={p.nom} className="axm-checkout" style={{ boxShadow: "0 0 0 1px #e8e8e8" }}>
                <img src={p.img} alt="" loading="lazy" />
                <div className="axm-checkout__row"><b>{t(p.nom)}</b><span>{p.prix}</span></div>
                <div className="axm-checkout__btn">{t("Commander, payer à la livraison")}</div>
              </div>
            ))}
          </MarketRail>
          <div className="axm-card" style={{ marginTop: 16 }}>
            <h3 className="axm-h4">{t("Devise, langue et livraison adaptées à chaque marché")}</h3>
            <p className="axm-lead" style={{ marginTop: 10 }}>
              {t("Prix en FCFA ou dans votre devise, boutique en français et en anglais, zones et tarifs de livraison par ville, livreurs suivis en temps réel.")}{" "}
              <Link href="/fonctionnalites" className="axm-link">{t("En savoir plus")}</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── Cas d'usage ──────────────────────────────────────── */}
      <section className="axm-section">
        <div className="axm-wrap">
          <h2 className="axm-h2">{t("Que vous démarriez ou que vous grandissiez")}</h2>
          <div className="axm-grid axm-g3" style={{ marginTop: 48 }}>
            {[
              { img: "/editorial/colis.webp", t: "Lancez-vous", d: "Ouvrez votre boutique gratuitement, partagez votre lien sur WhatsApp et recevez vos premières commandes dès aujourd’hui.", l: "Créer ma boutique", h: "/inscription" },
              { img: "/catalogue-atelier.webp", t: "Vendez plus", d: "Promotions, relances WhatsApp, affiliés et analyses : les outils pour transformer vos visiteurs en clients fidèles.", l: "Voir les fonctionnalités", h: "/fonctionnalites" },
              { img: "/hero-market.webp", t: "Ouvrez votre magasin", d: "La caisse AXSO encaisse en boutique physique et partage le même stock que votre site.", l: "Découvrir la caisse", h: "/fonctionnalites" },
            ].map((c) => (
              <div key={c.t} className="axm-card" style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 280 }}>
                <img src={c.img} alt="" loading="lazy" className="axm-case-img" />
                <h3 className="axm-h4" style={{ fontSize: 24 }}>{t(c.t)}</h3>
                <p className="axm-lead" style={{ fontSize: 17 }}>{t(c.d)}</p>
                <p style={{ marginTop: "auto" }}><Link href={c.h} className="axm-link">{t(c.l)} →</Link></p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32 }}><Link href="/tarifs" className="axm-btn axm-btn--secondary">{t("Choisir un forfait")}</Link></div>
        </div>
      </section>

      {/* ── IA et vitrines intelligentes ─────────────────────── */}
      <section className="axm-section" id="axia">
        <div className="axm-wrap">
          <h2 className="axm-h2" style={{ maxWidth: 900 }}>{t("Le commerce de demain se fait avec l’IA. Vos produits aussi.")}</h2>
          <div className="axm-grid axm-g2" style={{ marginTop: 56, alignItems: "center", gap: 48 }}>
            <div>
              <h3 className="axm-h3">{t("Stella travaille pour votre boutique, jour et nuit")}</h3>
              <p className="axm-lead" style={{ marginTop: 16 }}>
                {t("Votre assistante analyse vos ventes, rédige vos fiches produits, prépare vos promotions et vous signale ce qui demande votre attention. Vous gardez la main : elle vous demande votre accord avant chaque action importante.")}
              </p>
              <p style={{ marginTop: 24 }}><Link href="/inscription" className="axm-link">{t("Essayer Stella")} →</Link></p>
            </div>
            <div className="axm-card" style={{ background: "#fff", color: "#0b0b0b" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <img src="/brand/axia-mark.png" alt="" width={36} height={36} />
                <b>Stella</b>
              </div>
              <div style={{ background: "#f1f1f1", borderRadius: 14, padding: "10px 14px", marginLeft: "auto", maxWidth: "80%", width: "fit-content" }}>{t("Quels produits relancer cette semaine ?")}</div>
              <div style={{ marginTop: 14, lineHeight: 1.55 }}>
                {t("Vos sacs en cuir se vendent deux fois plus le week-end. Je vous propose une promotion de 10 % vendredi et un message WhatsApp aux 24 clients qui les ont consultés. Je prépare ?")}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <span style={{ background: "#000", color: "#fff", borderRadius: 999, padding: "8px 16px", fontWeight: 600, fontSize: 14 }}>{t("Oui, prépare")}</span>
                <span style={{ boxShadow: "inset 0 0 0 1px #d4d4d4", borderRadius: 999, padding: "8px 16px", fontWeight: 600, fontSize: 14 }}>{t("Plus tard")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Affiliation et partenaires ───────────────────────── */}
      <section className="axm-section" style={{ paddingTop: 0 }}>
        <div className="axm-wrap">
          <h2 className="axm-h2" style={{ maxWidth: 900 }}>{t("Grandissez avec l’écosystème AXSO")}</h2>
          <p className="axm-lead" style={{ marginTop: 20 }}>{t("Créateurs, revendeurs et partenaires vous aident à vendre plus loin.")}</p>
          <div className="axm-grid axm-g3" style={{ marginTop: 48 }}>
            {[
              { t: "Programme d’affiliation", d: "Des créateurs partagent vos produits et touchent une commission sur chaque vente.", h: "/affiliation" },
              { t: "Thèmes et constructeur", d: "Des vitrines prêtes à vendre, modifiables sans écrire une ligne de code.", h: "/themes" },
              { t: "Documentation", d: "Guides pas à pas pour connecter vos outils et automatiser votre boutique.", h: "/docs" },
            ].map((c) => (
              <Link key={c.t} href={c.h} className="axm-card" style={{ display: "block", color: "inherit", textDecoration: "none" }}>
                <h3 className="axm-h4">{t(c.t)}</h3>
                <p className="axm-muted" style={{ marginTop: 10, lineHeight: 1.55 }}>{t(c.d)}</p>
                <span className="axm-link" style={{ marginTop: 20 }}>{t("En savoir plus")} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chiffres du paiement à la livraison ──────────────── */}
      <section className="axm-section axm-light">
        <div className="axm-wrap">
          <h2 className="axm-h2" style={{ maxWidth: 900 }}>{t("Le paiement à la livraison, sans commission")}</h2>
          <p className="axm-lead" style={{ marginTop: 20 }}>{t("Vos clients paient comme ils préfèrent : à la livraison, avec Orange Money ou MTN MoMo. Vous gardez votre prix en entier.")}</p>
          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            <span className="axm-partner axm-partner--wide axm-partner--sombre" style={{ height: 60 }}><img src="/brand/partenaires/orange-money.png" alt="Orange Money" /></span>
            <span className="axm-partner axm-partner--wide axm-partner--sombre" style={{ height: 60 }}><img src="/brand/partenaires/mtn-momo.png" alt="MTN MoMo" /></span>
          </div>
          <div className="axm-grid axm-g3" style={{ marginTop: 56 }}>
            {[
              { v: "0 %", d: "de commission AXSO sur les ventes payées à la livraison" },
              { v: "3 min", d: "pour mettre votre boutique en ligne" },
              { v: "1", d: "seul stock pour votre site, WhatsApp et votre magasin" },
            ].map((s) => (
              <div key={s.d}>
                <div className="axm-stat">{s.v}</div>
                <p className="axm-muted" style={{ marginTop: 12, fontSize: 18 }}>{t(s.d)}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 40 }}><Link href="/legal/politique-prix" className="axm-link">{t("Lire la politique de prix")} →</Link></p>
        </div>
      </section>

      {/* ── Témoignage (avis réel publié) ────────────────────── */}
      {temoin && (
        <section className="axm-section">
          <div className="axm-wrap">
            <p className="axm-eyebrow">{t("Ils vendent avec AXSO")}</p>
            <blockquote className="axm-h3" style={{ margin: 0, maxWidth: 1000, fontWeight: 500 }}>« {temoin.texte} »</blockquote>
            <p className="axm-muted" style={{ marginTop: 24, fontSize: 16 }}>
              <b style={{ color: "#fff" }}>{temoin.auteurNom}</b>{temoin.auteurRole ? `, ${temoin.auteurRole}` : ""} · {temoin.boutique}{temoin.ville ? ` · ${temoin.ville}` : ""}
            </p>
            <p style={{ marginTop: 24 }}><Link href="/temoignages" className="axm-link">{t("Lire d’autres témoignages")} →</Link></p>
          </div>
        </section>
      )}

      {/* ── Démarrer en trois étapes ─────────────────────────── */}
      <section id="trois-etapes" className="axm-section" style={temoin ? { paddingTop: 0 } : undefined}>
        <div className="axm-wrap">
          <h2 className="axm-h2">{t("Votre boutique en trois étapes")}</h2>
          <LaunchStory />
          <div style={{ marginTop: 48 }}><Link href="/inscription" className="axm-btn axm-btn--primary">{t("Démarrer gratuitement")}</Link></div>
        </div>
      </section>
    </div>
  );
}
