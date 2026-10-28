"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X, Zap, Star, Lock } from "lucide-react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { SECTION, SURTITRE, TITRE, INTRO, BOUTON_NOIR, BOUTON_AMBRE } from "./charte";
import { CompteurPromoLanding } from "@/components/promo/CompteurPromo";

// id = identifiant réel de lib/plans-catalogue.ts, transmis à /inscription?plan=…
const PLANS = [
  {
    id: "palier0",
    nom: "Essentiel",
    prix: 0,
    couleur: "#6b7280",
    gradFrom: "#6b7280",
    gradTo: "#9ca3af",
    bg: "#f9fafb",
    borderColor: "rgba(107,114,128,0.25)",
    shadowColor: "rgba(107,114,128,0.15)",
    desc: "Lance-toi sans risquer un franc. Tu n'as pas besoin de budget pour commencer : crée ta boutique, mets tes produits en ligne, accepte les paiements mobile money dès aujourd'hui. Aucune commission sur tes ventes : tu touches ton prix en entier. Quand ton client paie en ligne, 10 % s'ajoutent à son prix (13 % pour un produit numérique) ; rien sur le paiement à la livraison.",
    features: [
      "60 commandes / mois",
      "1 boutique en ligne",
      "AXIA IA — version essentielle",
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
    couleur: "#F5A623",
    gradFrom: "#F5A623",
    gradTo: "#FFD280",
    bg: "#fffbeb",
    borderColor: "rgba(245,166,35,0.35)",
    shadowColor: "rgba(245,166,35,0.25)",
    desc: "Pour vendre sérieusement. Commandes illimitées, IA pour tes visuels pub, analytics pour voir ce qui marche. À 6 000 FCFA, c'est moins cher qu'un bon repas au restaurant. Et ça rapporte bien plus.",
    features: [
      "Commandes illimitées",
      "Social Media intégré",
      "AXIA IA — version avancée",
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
    couleur: "#111111",
    gradFrom: "#111111",
    gradTo: "#555555",
    bg: "#F5F5F5",
    borderColor: "rgba(17,17,17,0.22)",
    shadowColor: "rgba(17,17,17,0.16)",
    desc: "Pour les PME qui scalent. Boutiques multiples, sourcing dropshipping mondial et analytics en temps réel. Aucune limite.",
    features: [
      "AUCUNE LIMITE — tout inclus",
      "AXIA IA — version complète",
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

/** `promoFinLe` : promo de lancement en cours (lib/promo.ts) → compteur et packs payants grisés. */
export function TarifsSection({ promoFinLe = null, maintenant = 0 }: { promoFinLe?: string | null; maintenant?: number }) {
  const t = useT();
  const [promo, setPromo] = useState(!!promoFinLe);
  const finPromo = useCallback(() => setPromo(false), []);
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={`${SECTION} bg-white relative overflow-hidden`} id="tarifs">
      {/* Aurora */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(245,166,35,0.09) 0%, transparent 70%)", animation: "aurora 12s ease-in-out infinite" }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(245,166,35,0.06) 0%, transparent 70%)", animation: "aurora 14s ease-in-out 5s infinite" }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(245,166,35,0.06) 0%, transparent 70%)", animation: "aurora 10s ease-in-out 2s infinite" }} />
      </div>

      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 relative">

        {/* Header */}
        <div
          className="text-center mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(24px)",
            transition: "all 0.8s cubic-bezier(0.23,1,0.32,1)",
          }}
        >
          <span className={`${SURTITRE} inline-flex items-center gap-1.5`}>
            <Zap size={14} />{" "}{t("Paliers de puissance")}
          </span>
          <h2 className={`${TITRE} mb-5`}>
            {t("Commence gratuit. Grandis quand tu es prêt.")}
          </h2>
          <p className={`${INTRO} max-w-2xl mx-auto`}>
            {t("Pas de frais cachés. Pas de carte bancaire requise pour démarrer.")}{" "}
            <br className="hidden sm:block" />
            {t("Aucun prélèvement automatique : tu paies 30 jours à la fois, directement par Orange Money ou MTN.")}
          </p>
        </div>

        {promo && promoFinLe && <CompteurPromoLanding finLe={promoFinLe} maintenant={maintenant} onFin={finPromo} />}

        {/* Plans grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan, idx) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              visible={visible}
              delay={idx * 120}
              promo={promo}
            />
          ))}
        </div>

        {/* Comparaison Axso vs concurrents */}
        <div
          className="mt-14 sm:mt-20 max-w-3xl mx-auto"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 1s 0.8s" }}
        >
          <h3 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] mb-8">
            {t("Tout ce que Shopify ne fera jamais pour toi")}
          </h3>
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] sm:grid-cols-4 bg-gray-50 border-b border-gray-100">
              <div className="px-3 py-3 sm:p-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-400">{t("Critère")}</div>
              <div className="px-1 py-3 sm:p-4 text-center text-xs sm:text-sm font-bold" style={{ color: "#F5A623" }}>AXSO</div>
              <div className="px-1 py-3 sm:p-4 text-center text-xs sm:text-sm font-bold text-gray-400">{t("Shopify")}</div>
              <div className="px-1 py-3 sm:p-4 text-center text-xs sm:text-sm font-bold text-gray-400"><span className="sm:hidden">Woo</span><span className="hidden sm:inline">WooCommerce</span></div>
            </div>
            {[
              { critere: "Paiement Orange Money natif",       axso: true, shopify: false, woo: "✗" },
              { critere: "Support WhatsApp en français",       axso: true, shopify: false, woo: "✗" },
              { critere: "IA visuels pub intégrée",            axso: true, shopify: false, woo: "✗" },
              { critere: "Payer l'abonnement en mobile money", axso: true, shopify: false, woo: "✗" },
            ].map((row, i) => (
              <div key={row.critere} className={`grid grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] sm:grid-cols-4 items-center ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                <div className="px-3 py-3 sm:p-4 text-xs sm:text-sm text-gray-700 leading-snug">{t(row.critere)}</div>
                <div className="px-1 py-3 sm:p-4 self-stretch flex items-center justify-center" style={{ background: "rgba(245,166,35,0.06)" }}>
                  <Check size={16} strokeWidth={3} style={{ color: "#F5A623" }} />
                </div>
                <div className="px-1 py-3 sm:p-4 flex justify-center">
                  <X size={16} strokeWidth={3} className="text-gray-300" />
                </div>
                <div className="px-1 py-3 sm:p-4 text-center text-[10px] sm:text-xs text-gray-400"><X size={16} strokeWidth={3} className="text-gray-300 inline-block" /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Guarantee strip */}
        <div
          className="mt-14 text-center"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 1s 1s" }}
        >
          <p className="text-sm text-gray-400 inline-flex items-center gap-1.5">
            <Lock size={13} />{" "}{t("Paiement par Orange Money ou MTN · Sans renouvellement automatique · 0 frais cachés · Support WhatsApp inclus")}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes aurora { 0%,100%{transform:scale(1) translate(0,0)} 50%{transform:scale(1.05) translate(10px,-10px)} }
      `}</style>
    </section>
  );
}

function PlanCard({
  plan, visible, delay, promo,
}: {
  plan: typeof PLANS[0];
  visible: boolean;
  delay: number;
  promo: boolean;
}) {
  const t = useT();
  // Promo de lancement : les packs payants sont grisés, le gratuit donne déjà tout.
  const ferme = promo && plan.prix > 0;
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientY - rect.top) / rect.height - 0.5;
    const y = (e.clientX - rect.left) / rect.width - 0.5;
    setTilt({ x: x * -10, y: y * 10 });
  };

  const isActive = tilt.x !== 0;

  return (
    <div
      ref={ref}
      className="relative rounded-3xl"
      onMouseMove={onMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
          : "translateY(30px)",
        transition: isActive
          ? "transform 0.08s linear"
          : `transform 0.6s cubic-bezier(0.23,1,0.32,1), opacity 0.8s ${delay}ms cubic-bezier(0.23,1,0.32,1)`,
        willChange: "transform",
      }}
    >
      {/* Recommandé badge */}
      {plan.recommande && !ferme && (
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xl whitespace-nowrap"
          style={{
            background: `linear-gradient(135deg, ${plan.gradFrom}, ${plan.gradTo})`,
            color: "#111111",
            boxShadow: `0 4px 20px ${plan.shadowColor}`,
          }}
        >
          <Star size={11} fill="#111111" />
          {t("LE PLUS CHOISI")}
          <Star size={11} fill="#111111" />
        </div>
      )}

      {/* Card */}
      <div
        className={`relative rounded-3xl border overflow-hidden h-full flex flex-col ${ferme ? "grayscale opacity-50 pointer-events-none select-none" : ""}`}
        aria-disabled={ferme || undefined}
        style={{
          background: plan.recommande ? "white" : plan.bg,
          borderColor: plan.borderColor,
          borderWidth: plan.recommande ? "2px" : "1px",
          boxShadow: isActive
            ? `0 30px 60px ${plan.shadowColor}, 0 0 0 1px ${plan.borderColor}`
            : plan.recommande
            ? `0 20px 50px ${plan.shadowColor}`
            : "0 2px 10px rgba(0,0,0,0.04)",
        }}
      >
        {/* Shimmer on hover */}
        {isActive && (
          <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(105deg, transparent 40%, ${plan.couleur}10 50%, transparent 60%)`,
                animation: "axReflet 2s linear infinite",
                willChange: "transform",
              }}
            />
          </div>
        )}

        {/* Top gradient bar */}
        {plan.recommande && (
          <div className="h-1 w-full"
            style={{ background: `linear-gradient(90deg, ${plan.gradFrom}, ${plan.gradTo})` }} />
        )}

        <div className="p-7 flex-1 flex flex-col">
          {/* Plan name */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                style={{ background: `${plan.couleur}15`, color: plan.couleur }}
              >
                {t(plan.nom)}
              </span>
              {plan.recommande && <Zap size={14} style={{ color: plan.couleur }} />}
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">{t(plan.desc)}</p>
          </div>

          {/* Price */}
          <div className="mb-8">
            {plan.prix === 0 ? (
              <div>
                <span
                  className="text-5xl font-black leading-none"
                  style={{
                    background: `linear-gradient(135deg, ${plan.gradFrom}, ${plan.gradTo})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {t("Gratuit")}
                </span>
                <p className="text-xs text-gray-400 mt-1">{t("Pour toujours · Pas de carte requise")}</p>
              </div>
            ) : (
              <div>
                <div className="flex items-end gap-2 mb-1">
                  <span
                    className="text-5xl font-black leading-none"
                    style={{
                      background: `linear-gradient(135deg, ${plan.gradFrom}, ${plan.gradTo})`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {plan.prix.toLocaleString(t.loc)}
                  </span>
                  <span className="text-gray-400 text-sm mb-1.5">{t("FCFA / mois")}</span>
                </div>
                <p className="text-xs text-gray-400">
                  ≈ {Math.round(plan.prix / 655).toLocaleString()}{" "}{t("€/mois")}
                </p>
              </div>
            )}
          </div>

          {/* Features incluses */}
          <div className="space-y-3 mb-6 flex-1">
            {plan.features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${plan.couleur}15` }}
                >
                  <Check size={11} strokeWidth={3} style={{ color: plan.couleur }} />
                </div>
                <span className="text-sm text-gray-600 leading-snug">{t(f)}</span>
              </div>
            ))}
            {plan.notIncluded.map((f, i) => (
              <div key={`not-${i}`} className="flex items-start gap-3 opacity-35">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-100">
                  <X size={10} strokeWidth={3} className="text-gray-400" />
                </div>
                <span className="text-sm text-gray-400 leading-snug">{t(f)}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          {ferme ? (
            <span className={`${BOUTON_NOIR} w-full text-sm text-center`}>{t("Fermé pendant la promo : déjà inclus gratuitement")}</span>
          ) : (
            <Link
              href={`/inscription?plan=${promo ? "palier0" : plan.id}`}
              className={`${plan.recommande || promo ? BOUTON_AMBRE : BOUTON_NOIR} w-full text-sm text-center`}
            >
              {promo ? t("S'inscrire gratuitement — tout l'Illimité offert") : t(plan.cta)}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
