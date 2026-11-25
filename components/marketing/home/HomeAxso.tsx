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
import { ApercuStella, Campagnes, SceneMarches } from "./ScenesCommerce";
import { Globe3D } from "../motion/Globe3D";
import { MoteurMotion, TexteLumiere } from "../motion/MoteurMotion";
import { ParcoursCommande } from "../motion/ParcoursCommande";
import { Scene } from "../motion/Scenes";
import "../motion/motion.css";
import "./scenes.css";
import { LaunchStory } from "./LaunchStory";
import "./editorial.css";
import { Reveal } from "./Reveal";
import { TableauPaysCouverts } from "@/components/paiement/TableauPaysCouverts";
import { paysCouverts, type PaysCouvert } from "@/lib/paiements/pays-couverts";

/** Logos officiels des services partenaires (public/brand/partenaires). */
const PARTENAIRES: { nom: string; logo: string; large?: boolean; texte?: boolean; sombre?: boolean }[] = [
  { nom: "Orange Money", logo: "orange-money.png", large: true, sombre: true },
  { nom: "MTN MoMo", logo: "mtn-momo.png", large: true, sombre: true },
];

const CANAUX = ["Boutique en ligne", "WhatsApp", "Caisse en magasin", "Mobile Money", "Paiement à la livraison", "Livreurs", "Stock unifié", "Vente en gros", "Multi-devises", "Stella", "Produits numériques", "Domaines"];

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
      <MoteurMotion />
      <CinemaHero />
      <div className="axx-defile" aria-hidden><div>{[0, 1].map((k) => <span key={k}>{CANAUX.map((c) => <span key={c}>{t(c)}</span>)}</span>)}</div></div>
      <section className="axx-manifeste"><div className="axm-wrap"><TexteLumiere texte={t("Une vitrine, une conversation, un comptoir, une livraison. AXSO réunit tout ce que votre commerce fait déjà, pour que chaque client compte et que chaque colis arrive.")} /></div></section>
      <Campagnes />
      <ParcoursCommande surtitre={t("Le voyage d’une commande")} etapes={[
        { titre: t("Votre vitrine attire"), texte: t("Un thème soigné, vos produits, votre adresse."), scene: <Scene type="vitrine" t={t} photo="/visuels/parcours-vitrine.webp" grande /> },
        { titre: t("La conversation convertit"), texte: t("Le client commande, le récapitulatif arrive sur WhatsApp."), scene: <Scene type="whatsapp" t={t} photo="/visuels/parcours-whatsapp.webp" grande /> },
        { titre: t("Le paiement rassure"), texte: t("À la réception, en espèces ou en Mobile Money."), scene: <Scene type="paiement" t={t} photo="/visuels/parcours-paiement.webp" grande /> },
        { titre: t("Le colis prend la route"), texte: t("Votre livreur suit la course, votre client aussi."), scene: <Scene type="livraison" t={t} photo="/visuels/parcours-livraison.webp" grande /> },
        { titre: t("Vos chiffres s’éclairent"), texte: t("Ventes, stock et clients se mettent à jour d’eux-mêmes."), scene: <Scene type="analyses" t={t} photo="/visuels/parcours-analyses.webp" grande /> },
      ]} />

      <section className="axm-section axm-light axm-clair">
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

      {/* ── International ────────────────────────────────────── */}
      <section className="axm-section axm-markets-band">
        <div className="axm-wrap"><h2 className="axm-h2">{t("Votre boutique, d’un marché à l’autre.")}</h2>
          <p className="axm-lead">{t("Choisissez un pays pour voir le produit, la devise et la destination de livraison.")}</p>
          <SceneMarches />
          <Link className="axm-link" href="/fonctionnalites/marches">{t("Découvrir les marchés")} →</Link>
        </div>
      </section>

      {/* ── Cas d'usage ──────────────────────────────────────── */}
      <section className="axm-section axm-light axm-clair">
        <div className="axm-wrap">
          <h2 className="axm-h2">{t("Que vous démarriez ou que vous grandissiez")}</h2>
          <div className="axm-grid axm-g3" style={{ marginTop: 48 }}>
            {[
              { img: "/editorial/colis.webp", t: "Lancez-vous", d: "Ouvrez votre boutique gratuitement, partagez votre lien sur WhatsApp et recevez vos premières commandes dès aujourd’hui.", l: "Créer ma boutique", h: "/inscription" },
              { img: "/catalogue-atelier.webp", t: "Vendez plus", d: "Promotions, relances WhatsApp, affiliés et analyses : les outils pour transformer vos visiteurs en clients fidèles.", l: "Voir les fonctionnalités", h: "/fonctionnalites" },
              { img: "/visuels/accueil-magasin.webp", t: "Ouvrez votre magasin", d: "La caisse AXSO encaisse en boutique physique et partage le même stock que votre site.", l: "Découvrir la caisse", h: "/fonctionnalites/caisse" },
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
      <section className="axm-section axm-light axm-clair" style={{ paddingTop: 0 }}>
        <div className="axm-wrap">
          <h2 className="axm-h2" style={{ maxWidth: 900 }}>{t("Grandissez avec l’écosystème AXSO")}</h2>
          <p className="axm-lead" style={{ marginTop: 20 }}>{t("Créateurs, revendeurs et partenaires vous aident à vendre plus loin.")}</p>
          <div className="axm-grid axm-g3" style={{ marginTop: 48 }}>
            {[
              { img: "/editorial/affiliation.webp", t: "Programme d’affiliation", d: "Des créateurs partagent vos produits et touchent une commission sur chaque vente.", h: "/affiliation" },
              { img: "/visuels/accueil-themes.webp", t: "Thèmes et constructeur", d: "Des vitrines prêtes à vendre, modifiables sans écrire une ligne de code.", h: "/themes" },
              { img: "/visuels/accueil-documentation.webp", t: "Documentation", d: "Guides pas à pas pour connecter vos outils et automatiser votre boutique.", h: "/docs" },
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
            <img src="/visuels/accueil-casque.webp" loading="lazy" alt="" />
            <figcaption><small>{t("Aperçu de commande")}</small><strong>{t("Casque sans fil")}</strong>
              <dl><div><dt>{t("Quantité")}</dt><dd>1</dd></div><div><dt>{t("Total")}</dt><dd>24 900 FCFA</dd></div></dl>
              <span>{t("Paiement à la livraison")}</span></figcaption>
          </figure></div>
          <div className="axm-grid axm-g3" style={{ marginTop: 56 }}>
            {[
              { v: "0 %", n: 0, u: " %", d: "de commission AXSO sur les ventes payées à la livraison" },
              { v: "3 min", n: 3, u: " min", d: "pour mettre votre boutique en ligne" },
              { v: "1", n: 1, u: "", d: "seul stock pour votre site, WhatsApp et votre magasin" },
            ].map((s) => (
              <div key={s.d}>
                <div className="axm-stat" data-compte={s.n} data-suffixe={s.u}>{s.v}</div>
                <p className="axm-muted" style={{ marginTop: 12, fontSize: 18 }}>{t(s.d)}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 40 }}><Link href="/legal/politique-prix" className="axm-link">{t("Lire la politique de prix")} →</Link></p>
        </div>
      </section>

      {/* ── Témoignage (avis réel publié) ────────────────────── */}
      {/* ── Mur des moyens de paiement et canaux ─────────────── */}
      <section className="axm-section--tight axm-light axm-clair" style={{ borderTop: "1px solid var(--m-line)", borderBottom: "1px solid var(--m-line)" }}>
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

      <Suspense fallback={null}><PaysMobileMoney /></Suspense>

      <Globe3D />
      <Suspense fallback={null}><AvisAccueil /></Suspense>

      {/* ── Démarrer en trois étapes ─────────────────────────── */}
      <section id="trois-etapes" className="axm-section axm-light axm-clair">
        <div className="axm-wrap">
          <h2 className="axm-h2">{t("Votre boutique en trois étapes")}</h2>
          <LaunchStory />
          <div style={{ marginTop: 48 }}><Link href="/inscription" className="axm-btn axm-btn--primary">{t("Démarrer gratuitement")}</Link></div>
        </div>
      </section>
    </div>
  );
}

// Pays où l'on paie un produit numérique par Mobile Money sur AXSO, lus en direct (jamais plus de 3 s
// d'attente : sans réponse, la section ne s'affiche pas).
async function PaysMobileMoney() {
  const t = await getT();
  const pays = await Promise.race([paysCouverts().catch(() => [] as PaysCouvert[]), new Promise<PaysCouvert[]>((ok) => setTimeout(() => ok([]), 3000))]);
  if (!pays.length) return null;
  return (
    <section className="axm-section axm-light axm-clair" id="pays-couverts">
      <div className="axm-wrap" style={{ maxWidth: 980 }}>
        <h2 className="axm-h2" suppressHydrationWarning>{t("Payé par Mobile Money dans {0} pays", String(pays.length))}</h2>
        <p className="axm-lead" style={{ marginTop: 16, marginBottom: 32 }} suppressHydrationWarning>{t("Vos produits numériques se vendent partout où vos clients ont un compte Mobile Money. Ils paient en monnaie locale, vous êtes crédité dans la vôtre.")}</p>
        <TableauPaysCouverts pays={pays} />
      </div>
    </section>
  );
}
