"use client";
// Forfaits (page /tarifs) dans la charte du site public : trois cartes, le
// forfait recommandé en blanc, puis ce qui est inclus et les moyens de régler
// l'abonnement. Données et liens d'inscription inchangés.
import Link from "next/link";
import { useCallback, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { CompteurPromoLanding } from "@/components/promo/CompteurPromo";

// id = identifiant réel de lib/plans-catalogue.ts, transmis à /inscription?plan=…
const PLANS = [
  {
    id: "palier0",
    nom: "Essentiel",
    prix: 0,
    desc: "Lance-toi sans risquer un franc. Tu n'as pas besoin de budget pour commencer : crée ta boutique, mets tes produits en ligne, accepte les paiements mobile money dès aujourd'hui. Aucune commission sur tes ventes : tu touches ton prix en entier. Quand ton client paie en ligne, 10 % s'ajoutent à son prix (13 % pour un produit numérique) ; rien sur le paiement à la livraison.",
    features: [
      "60 commandes / mois",
      "1 boutique en ligne",
      "Stella IA — version essentielle",
      "Social Media intégré",
      "Paiements Mobile Money",
      "Support WhatsApp (lun-ven, 8h-20h)",
    ],
    notIncluded: ["Commandes illimitées", "Sourcing dropshipping mondial"],
    recommande: false,
    cta: "Démarrer gratuitement — sans carte bancaire",
  },
  {
    id: "palier1",
    nom: "Pro",
    prix: 6000,
    desc: "Pour vendre sérieusement. Commandes illimitées, IA pour tes visuels pub, analytics pour voir ce qui marche. À 6 000 FCFA, c'est moins cher qu'un bon repas au restaurant. Et ça rapporte bien plus.",
    features: [
      "Commandes illimitées",
      "Social Media intégré",
      "Stella IA — version avancée",
      "Analytics avancés",
      "Marketing & automatisations",
      "Support WhatsApp (lun-ven, 8h-20h)",
    ],
    notIncluded: ["Sourcing dropshipping mondial"],
    recommande: true,
    cta: "Passer à Pro →",
  },
  {
    id: "palier2",
    nom: "Illimité",
    prix: 20000,
    desc: "Pour les PME qui scalent. Boutiques multiples, sourcing dropshipping mondial et analytics en temps réel. Aucune limite.",
    features: [
      "AUCUNE LIMITE — tout inclus",
      "Stella IA — version complète",
      "Sourcing dropshipping mondial",
      "Boutiques illimitées",
      "Analytics temps réel",
      "Support WhatsApp (lun-ven, 8h-20h)",
    ],
    notIncluded: [],
    recommande: false,
    cta: "Choisir Illimité →",
  },
];

const INCLUS = [
  "Paiement à la livraison sans commission AXSO",
  "Commandes WhatsApp enregistrées dans l’admin",
  "Support WhatsApp en français",
  "Aucun prélèvement automatique",
];

const Coche = () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden style={{ flex: "none", marginTop: 2 }}><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Croix = () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden style={{ flex: "none", marginTop: 2 }}><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;

/** `promoFinLe` : promo de lancement en cours (lib/promo.ts) → compteur et packs payants grisés. */
export function TarifsSection({ promoFinLe = null, maintenant = 0 }: { promoFinLe?: string | null; maintenant?: number }) {
  const t = useT();
  const [promo, setPromo] = useState(!!promoFinLe);
  const finPromo = useCallback(() => setPromo(false), []);

  return (
    <section className="axm axm-page axm-section" id="tarifs" style={{ paddingTop: 0 }}>
      <div className="axm-wrap">
        {promo && promoFinLe && <CompteurPromoLanding finLe={promoFinLe} maintenant={maintenant} onFin={finPromo} />}

        <div className="axm-grid axm-g3" style={{ alignItems: "stretch" }}>
          {PLANS.map((plan) => <CartePlan key={plan.id} plan={plan} promo={promo} />)}
        </div>

        <div className="axm-split" style={{ marginTop: "clamp(64px, 9vw, 112px)", alignItems: "start" }}>
          <div>
            <h2 className="axm-h3">{t("Inclus dans tous les forfaits")}</h2>
            <ul className="axm-checks" style={{ marginTop: 24 }}>
              {INCLUS.map((f) => <li key={f}><Coche /><span>{t(f)}</span></li>)}
            </ul>
          </div>
          <div className="axm-card">
            <h3 className="axm-h4">{t("Prépayé pour 30 jours, sans engagement")}</h3>
            <p className="axm-muted" style={{ marginTop: 10, lineHeight: 1.55 }}>
              {t("Les forfaits payants sont prépayés pour 30 jours, en FCFA. Rien n’est débité sans une action de votre part : il n’y a rien à résilier.")}
            </p>
            <p className="axm-muted" style={{ marginTop: 20, fontSize: 14 }}>{t("Sans renouvellement automatique · 0 frais cachés · Support WhatsApp inclus")}</p>
            <p style={{ marginTop: 16 }}><Link href="/legal/abonnements" className="axm-link">{t("Lire les conditions d’abonnement")} →</Link></p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CartePlan({ plan, promo }: { plan: typeof PLANS[0]; promo: boolean }) {
  const t = useT();
  // Promo de lancement : les packs payants sont grisés, le gratuit donne déjà tout.
  const ferme = promo && plan.prix > 0;
  const clair = plan.recommande && !ferme;
  return (
    <div
      className="axm-card"
      aria-disabled={ferme || undefined}
      style={{
        display: "flex", flexDirection: "column", gap: 20,
        background: clair ? "#fff" : undefined, color: clair ? "#0b0b0b" : undefined,
        opacity: ferme ? .45 : 1, pointerEvents: ferme ? "none" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h3 className="axm-h4" style={{ fontSize: 24 }}>{t(plan.nom)}</h3>
        {clair && <span className="axm-mock__tag" style={{ background: "#0b0b0b", color: "#fff" }}>{t("Le plus choisi")}</span>}
      </div>

      <div>
        {plan.prix === 0 ? (
          <>
            <div style={{ fontSize: 48, fontWeight: 600, letterSpacing: "-.03em", lineHeight: 1 }}>{t("Gratuit")}</div>
            <p style={{ marginTop: 8, fontSize: 14, opacity: .65 }}>{t("Pour toujours · Pas de carte requise")}</p>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 48, fontWeight: 600, letterSpacing: "-.03em", lineHeight: 1 }}>{plan.prix.toLocaleString(t.loc)}</span>
              <span style={{ fontSize: 15, opacity: .65 }}>{t("FCFA / mois")}</span>
            </div>
            <p style={{ marginTop: 8, fontSize: 14, opacity: .65 }}>≈ {Math.round(plan.prix / 655).toLocaleString()} {t("€/mois")}</p>
          </>
        )}
      </div>

      <p style={{ fontSize: 15, lineHeight: 1.55, opacity: .72 }}>{t(plan.desc)}</p>

      <ul className="axm-checks" style={{ flex: 1 }}>
        {plan.features.map((f) => <li key={f} style={{ fontSize: 15 }}><Coche /><span>{t(f)}</span></li>)}
        {plan.notIncluded.map((f) => <li key={f} style={{ fontSize: 15, opacity: .4 }}><Croix /><span>{t(f)}</span></li>)}
      </ul>

      {ferme ? (
        <span className="axm-btn axm-btn--secondary" style={{ whiteSpace: "normal", textAlign: "center", height: "auto", minHeight: 52, padding: "12px 20px" }}>{t("Fermé pendant la promo : déjà inclus gratuitement")}</span>
      ) : (
        <Link
          href={`/inscription?plan=${promo ? "palier0" : plan.id}`}
          className={`axm-btn ${clair ? "" : "axm-btn--primary"}`}
          style={{ whiteSpace: "normal", textAlign: "center", height: "auto", minHeight: 52, padding: "12px 20px", ...(clair ? { background: "#0b0b0b", color: "#fff" } : {}) }}
        >
          {promo ? t("S'inscrire gratuitement — tout l'Illimité offert") : t(plan.cta)}
        </Link>
      )}
    </div>
  );
}
