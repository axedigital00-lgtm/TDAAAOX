export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, Package } from "lucide-react";
import { catalogueAffiliation } from "@/lib/affiliation";
import { formatMontant } from "@/lib/utils";
import { PageAxm, HeroPage, Section, Faq, AppelFinal } from "@/components/marketing/site/Blocs";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = {
  title: "Programme d'affiliation AXSO — gagnez de l'argent en recommandant des produits africains",
  description: "Créez votre compte affilié gratuit, partagez vos liens et touchez une commission (10 % minimum, 20 % sur le numérique) sur chaque vente payée en ligne, versée par Axso sur Mobile Money.",
};

const INSCRIPTION = "/inscription/affilie";
const VERS_CATALOGUE = `${INSCRIPTION}?suite=/affilie/catalogue`;
const pct = (taux: number) => `${Math.round(taux * 100)} %`;

const ETAPES = [
  { titre: "Créez votre compte", texte: "Gratuit, sans boutique : un nom, un e-mail et un mot de passe suffisent." },
  { titre: "Choisissez un produit et copiez votre lien", texte: "Parcourez le catalogue des boutiques Axso et partagez votre lien personnel où vous voulez." },
  { titre: "Touchez votre commission", texte: "Chaque vente payée en ligne via votre lien vous rapporte une commission, versée par Axso sur Mobile Money." },
];

const FAQ = [
  { q: "C'est gratuit ?", r: "Oui. Créer un compte affilié ne coûte rien et ne demande pas de boutique." },
  { q: "Quand suis-je payé ?", r: "Votre commission devient disponible 48 h après la livraison de la commande (immédiatement pour un produit numérique). Vous demandez ensuite un retrait sur Mobile Money, validé par Axso." },
  { q: "Combien je gagne ?", r: "Chaque boutique fixe sa commission, avec un minimum de 10 % sur les produits physiques et 20 % sur les produits numériques. Le taux est affiché sur chaque produit." },
  { q: "Les paiements à la livraison comptent ?", r: "Non. Seules les commandes payées en ligne donnent droit à une commission." },
  { q: "Combien de temps mon lien est valable ?", r: "30 jours après le clic. Si l'acheteur clique ensuite sur le lien d'un autre affilié, c'est le dernier clic qui compte." },
  { q: "Je suis déjà marchand ?", r: "Connectez-vous avec votre compte habituel : votre espace affilié est inclus, inutile de créer un second compte." },
  { q: "Puis-je acheter avec mon propre lien ?", r: "Oui, mais ces achats ne donnent pas de commission." },
];

export default async function AffiliationPage() {
  const t = await getT();
  const { produits, total, boutiques, tauxMax } = await catalogueAffiliation({ take: 8 });

  return (
    <PageAxm>
      <HeroPage
        surtitre={t("Programme d’affiliation")}
        titre={t("Gagnez de l'argent en recommandant des produits africains")}
        lead={t("Touchez une commission sur chaque vente payée en ligne grâce à votre lien, versée par Axso sur Mobile Money.")}
        principal={{ label: t("Créer mon compte affilié"), href: INSCRIPTION }}
        secondaire={{ label: t("Déjà affilié ? Se connecter"), href: "/connexion?callbackUrl=/affilie" }}
      />

      {/* ── Chiffres (réels, issus du catalogue ; masqués tant qu'il est vide) ── */}
      {total > 0 && <Section serre>
        <div className="axm-grid axm-g3">
          {[
            { n: String(boutiques), label: "boutiques partenaires" },
            { n: String(total), label: "produits à recommander" },
            { n: pct(tauxMax), label: "commission max" },
          ].map(({ n, label }) => (
            <div key={label} style={{ borderTop: "1px solid var(--m-line)", paddingTop: 24 }}>
              <div className="axm-stat" style={{ fontSize: "clamp(48px, 6vw, 80px)" }}>{n}</div>
              <p className="axm-muted" style={{ marginTop: 10, fontSize: 17 }}>{t(label)}</p>
            </div>
          ))}
        </div>
      </Section>}

      {/* ── Comment ça marche ── */}
      <Section clair titre={t("Comment ça marche")}>
        <ol className="axm-grid axm-g3" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {ETAPES.map(({ titre, texte }, i) => (
            <li key={titre} className="axm-card" style={{ minHeight: 220 }}>
              <div className="axm-muted" style={{ fontWeight: 600 }}>0{i + 1}</div>
              <h3 className="axm-h4" style={{ marginTop: 12, fontSize: 22 }}>{t(titre)}</h3>
              <p className="axm-muted" style={{ marginTop: 10, lineHeight: 1.55 }}>{t(texte)}</p>
            </li>
          ))}
        </ol>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
          <span className="axm-muted">{t("Versement sur")}</span>
          <span className="axm-partner axm-partner--sombre" style={{ height: 52 }}><img src="/brand/partenaires/orange-money.png" alt="Orange Money" style={{ height: 36 }} /></span>
          <span className="axm-partner axm-partner--sombre" style={{ height: 52 }}><img src="/brand/partenaires/mtn-momo.png" alt="MTN MoMo" style={{ height: 32 }} /></span>
        </div>
      </Section>

      {/* ── Aperçu du catalogue ── */}
      {produits.length > 0 && (
        <Section titre={t("Quelques produits à recommander")} lead={t("Les commissions les plus élevées du moment")}>
          <div className="axm-grid axm-g4" style={{ gap: "32px 16px" }}>
            {produits.map((p) => (
              <Link key={p.produitId} href={VERS_CATALOGUE} className="axm-theme">
                <div className="axm-theme__img" style={{ aspectRatio: "1 / 1" }}>
                  {p.image
                    ? <img src={p.image} alt={p.nom} loading="lazy" />
                    : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><Package size={36} style={{ color: "rgba(255,255,255,.3)" }} /></div>}
                  <span className="axm-theme__badge">+{pct(p.taux)}</span>
                </div>
                <div style={{ padding: "14px 4px 0" }}>
                  <p style={{ fontWeight: 600, lineHeight: 1.35 }}>{p.nom}</p>
                  <p className="axm-muted" style={{ fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    {p.logoUrl && <img src={p.logoUrl} alt="" style={{ width: 14, height: 14, borderRadius: "50%", objectFit: "cover" }} />}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.boutique}</span>
                    {p.certifie && <BadgeCheck size={12} style={{ flex: "none" }} />}
                  </p>
                  <p style={{ fontWeight: 600, marginTop: 8 }}>{formatMontant(p.prix, p.devise)}</p>
                  <p className="axm-muted" style={{ fontSize: 14, marginTop: 2 }}>{t("Vous gagnez ~")}{formatMontant(p.gain, p.devise)}</p>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 48 }}><Link href={VERS_CATALOGUE} className="axm-btn axm-btn--secondary">{t("Voir tout le catalogue")}</Link></div>
        </Section>
      )}

      <Section clair>
        <Faq titre={t("Questions fréquentes")} items={FAQ.map(({ q, r }) => ({ q: t(q), r: t(r) }))} />
      </Section>

      <AppelFinal
        titre={t("Commencez à recommander dès aujourd’hui")}
        lead={t("Gratuit, sans boutique.")}
        principal={{ label: t("Créer mon compte affilié"), href: INSCRIPTION }}
      />
    </PageAxm>
  );
}
