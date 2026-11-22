// Page d'accueil du site public : même enchaînement que les grandes
// plateformes de commerce (hero, réseau, IA, plateforme, international, cas
// d'usage, assistante, partenaires, chiffres, témoignage, forfaits, démarrage).
// Contenu propre à AXSO ; aucun chiffre ni logo de marchand inventé.
import Link from "next/link";
import { getT } from "@/lib/i18n/serveur";
import { Suspense } from "react";
import { avisPublies } from "@/lib/avis-plateforme";
import { FilmBoutique } from "../VideoSection";
import { CinemaHero } from "./CinemaHero";
import { ApercuStella, Campagnes, SceneMarches, SceneMonde } from "./ScenesCommerce";
import "./scenes.css";
import { LaunchStory } from "./LaunchStory";
import "./editorial.css";
import { Reveal } from "./Reveal";

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

async function AvisAccueil() {
  const [t, avis] = await Promise.all([getT(), avisPublies(8)]);
  const temoin = avis.find(a => (a.texte ?? "").length > 40) ?? avis[0];
  if (!temoin) return null;
  return (
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
  );
}

export async function HomeAxso() {
  const t = await getT();
  return (
    <div className="axm axm-page axm-editorial">
      <Reveal />
      <CinemaHero />
      <Campagnes />

      <section className="axm-section">
        <div className="axm-wrap">
          <div className="axm-story">
            <div className="axm-story__copy">
              <h2 className="axm-h2">{t("De la vitrine à la conversation.")}</h2>
              <p className="axm-lead">{t("Présentez une collection sur votre boutique et retrouvez vos clients sur WhatsApp pour préparer leur commande.")}</p>
              <Link href="/fonctionnalites/whatsapp" className="axm-link">{t("Découvrir les canaux de vente")}</Link>
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
          <div className="axm-platform">
            <article><FilmBoutique />
              <h3>{t("Boutiques en ligne")}</h3><p>{t("Choisissez un thème, ajoutez vos produits et personnalisez votre vitrine.")}</p>
              <Link href="/fonctionnalites/boutique-en-ligne" className="axm-link">{t("Découvrir le constructeur")} →</Link>
            </article>
            <article><div className="axm-platform-admin">
              <img src="/editorial/ventes.webp" alt="" loading="lazy" />
              <div><small>{t("Centre de gestion")}</small><b>{t("Commandes")}</b><span>{t("À préparer")} <i>03</i></span><span>{t("En livraison")} <i>02</i></span></div>
            </div><h3>{t("Tout votre commerce en vue")}</h3><p>{t("Retrouvez commandes, clients et stock dans un seul tableau de bord.")}</p>
              <Link href="/fonctionnalites#gerer" className="axm-link">{t("Explorer les outils")} →</Link>
            </article>
            <article><div className="axm-platform-social"><img src="/hero-bags.webp" alt="" loading="lazy" />
              <span>{t("Bonjour, ce sac est-il disponible ?")}</span></div>
              <h3>{t("Du message à la commande")}</h3><p>{t("Partagez un article et poursuivez la vente sur WhatsApp.")}</p>
              <Link href="/fonctionnalites/whatsapp" className="axm-link">{t("Voir les canaux")} →</Link>
            </article>
          </div>
        </div>
      </section>

      {/* ── International ────────────────────────────────────── */}
      <section className="axm-section axm-markets-band">
        <div className="axm-wrap"><h2 className="axm-h2">{t("Votre boutique, d’un marché à l’autre.")}</h2>
          <p className="axm-lead">{t("Choisissez un pays pour voir le produit, la devise et la destination de livraison.")}</p>
          <SceneMarches />
          <Link className="axm-link" href="/fonctionnalites/marches">{t("Découvrir les marchés")} →</Link>
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
              { img: "/hero-market.webp", t: "Ouvrez votre magasin", d: "La caisse AXSO encaisse en boutique physique et partage le même stock que votre site.", l: "Découvrir la caisse", h: "/fonctionnalites/caisse" },
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
      <section className="axm-section axm-intelligence" id="axia">
        <div className="axm-wrap">
          <h2 className="axm-h2" style={{ maxWidth: 900 }}>{t("Le commerce de demain se fait avec l’IA. Vos produits aussi.")}</h2>
          <div className="axm-grid axm-g2" style={{ marginTop: 56, alignItems: "center", gap: 48 }}>
            <div>
              <h3 className="axm-h3">{t("Stella travaille pour votre boutique, jour et nuit")}</h3>
              <p className="axm-lead" style={{ marginTop: 16 }}>
                {t("Votre assistante analyse vos ventes, rédige vos fiches produits, prépare vos promotions et vous signale ce qui demande votre attention. Vous gardez la main : elle vous demande votre accord avant chaque action importante.")}
              </p>
              <p style={{ marginTop: 24 }}><Link href="/fonctionnalites/stella" className="axm-link">{t("Découvrir Stella")} →</Link></p>
            </div>
            <ApercuStella />
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
              { img: "/editorial/affiliation.webp", t: "Programme d’affiliation", d: "Des créateurs partagent vos produits et touchent une commission sur chaque vente.", h: "/affiliation" },
              { img: "/theme-pop.webp", t: "Thèmes et constructeur", d: "Des vitrines prêtes à vendre, modifiables sans écrire une ligne de code.", h: "/themes" },
              { img: "/theme-codex.webp", t: "Documentation", d: "Guides pas à pas pour connecter vos outils et automatiser votre boutique.", h: "/docs" },
            ].map((c) => (
              <Link key={c.t} href={c.h} className="axm-card" style={{ display: "block", color: "inherit", textDecoration: "none" }}>
                <img src={c.img} alt="" className="axm-case-img" loading="lazy" style={{ marginBottom: 18 }} />
                <h3 className="axm-h4">{t(c.t)}</h3>
                <p className="axm-muted" style={{ marginTop: 10, lineHeight: 1.55 }}>{t(c.d)}</p>
                <span className="axm-link" style={{ marginTop: 20 }}>{t("En savoir plus")} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chiffres du paiement à la livraison ──────────────── */}
      <section className="axm-section axm-checkout-band">
        <div className="axm-wrap">
          <div className="axm-encaissement"><div>
          <h2 className="axm-h2" style={{ maxWidth: 900 }}>{t("Le paiement à la livraison, sans commission")}</h2>
          <p className="axm-lead" style={{ marginTop: 20 }}>{t("Vos clients paient comme ils préfèrent : à la livraison, avec Orange Money ou MTN MoMo. Vous gardez votre prix en entier.")}</p>
          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            <span className="axm-partner axm-partner--wide axm-partner--sombre" style={{ height: 60 }}><img src="/brand/partenaires/orange-money.png" alt="Orange Money" /></span>
            <span className="axm-partner axm-partner--wide axm-partner--sombre" style={{ height: 60 }}><img src="/brand/partenaires/mtn-momo.png" alt="MTN MoMo" /></span>
          </div>
          </div><figure className="axm-recu">
            <img src="/hero-headphones.webp" loading="lazy" alt="" />
            <figcaption><small>{t("Aperçu de commande")}</small><strong>{t("Casque sans fil")}</strong>
              <dl><div><dt>{t("Quantité")}</dt><dd>1</dd></div><div><dt>{t("Total")}</dt><dd>24 900 FCFA</dd></div></dl>
              <span>{t("Paiement à la livraison")}</span></figcaption>
          </figure></div>
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

      <SceneMonde />
      <Suspense fallback={null}><AvisAccueil /></Suspense>

      {/* ── Démarrer en trois étapes ─────────────────────────── */}
      <section id="trois-etapes" className="axm-section">
        <div className="axm-wrap">
          <h2 className="axm-h2">{t("Votre boutique en trois étapes")}</h2>
          <LaunchStory />
          <div style={{ marginTop: 48 }}><Link href="/inscription" className="axm-btn axm-btn--primary">{t("Démarrer gratuitement")}</Link></div>
        </div>
      </section>
    </div>
  );
}
