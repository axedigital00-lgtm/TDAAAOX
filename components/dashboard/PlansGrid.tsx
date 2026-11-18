"use client";

import { Check, X, HelpCircle, Globe } from "lucide-react";
import { PlanBadge } from "@/components/dashboard/PlanBadge";
import AbonnementActions from "@/app/(dashboard)/dashboard/abonnement/AbonnementActions";
import { PLANS_CATALOGUE, ABONNEMENT_FAQ } from "@/lib/plans-catalogue";
import { convertirDepuisXAF } from "@/lib/devise-convert";
import { useT } from "@/components/I18nProvider";
import { BoutonEssai, useTempsRestant } from "@/components/dashboard/EssaiIllimite";
import { Badge, EnTetePage } from "@/components/ui";

// Essai Illimité du compte (lib/essai.ts) : `planActuel` reste le plan PAYÉ, pour pouvoir s'abonner pendant l'essai.
export interface EssaiGrille { phase: "disponible" | "en_cours" | "termine"; finLe: string | null }

interface PlansGridProps {
  planActuel: string;
  nomPlan: string;
  devise: string;
  compact?: boolean;
  essai?: EssaiGrille;
  /** Promo de lancement en cours (lib/promo.ts) : tout est offert, les packs payants sont fermés. */
  promo?: boolean;
}

export function PlansGrid({ planActuel, nomPlan, devise, compact, essai, promo }: PlansGridProps) {
  const t = useT();
  const afficherXAF = devise === "XAF" || devise === "XOF";

  return (
    <div className={compact ? "space-y-6" : "space-y-8 max-w-4xl"}>

      <EnTetePage
        className="mb-0"
        titre={t("Abonnement")}
        indicateurs={<>
          <PlanBadge plan={planActuel} />
          {devise !== "XAF" && devise !== "XOF" && <Badge ton="neutre" icone={<Globe aria-hidden />}>{t("Prix en")} {t(devise)}</Badge>}
        </>}
        description={<>{t("Votre plan actuel :")} <strong className="text-encre">{t(nomPlan)}</strong>. {t("Comparez les paliers ci-dessous : ce qui est inclus est coché, ce qui ne l'est pas est barré.")}</>}
      />

      {!promo && essai && essai.phase !== "termine" && planActuel === "palier0" && <CarteEssai essai={essai} />}

      {/* ── Cards plans ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        {PLANS_CATALOGUE.map((plan) => {
          const estActuel = plan.id === planActuel;
          const ferme = !!promo && plan.prixXAF > 0;
          const Icone = plan.icone;
          const prixLocal = convertirDepuisXAF(plan.prixXAF, devise);

          return (
            <div key={plan.id}
              className={`relative flex flex-col rounded-carte bg-carte border transition-all ${ferme ? "grayscale opacity-60" : ""}`}
              aria-disabled={ferme || undefined}
              style={{
                borderColor: plan.recommande || estActuel ? plan.border : "var(--ax-bordure)",
                borderWidth: estActuel ? 2 : 1,
                boxShadow: plan.recommande
                  ? `0 12px 40px ${plan.couleur}18`
                  : estActuel ? `0 4px 20px ${plan.couleur}15` : "0 1px 6px #0000000a",

              }}>

              {plan.recommande && !ferme && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap"
                  style={{ background: plan.couleur }}>
                  {t("Recommandé")}
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col">
                {/* Label palier */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
                      style={{ background: plan.bg, color: plan.couleur, border: `1px solid ${plan.border}` }}>
                      {t(plan.palier)}
                    </span>
                    {estActuel && <Badge ton="succes" icone={<Check aria-hidden />}>{t("Plan actuel")}</Badge>}
                  </span>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: plan.bg, border: `1px solid ${plan.border}` }}>
                    <Icone size={15} style={{ color: plan.couleur }} aria-hidden />
                  </div>
                </div>

                {/* Nom + description */}
                <h2 className="text-xl font-black text-encre mb-0.5">{t(plan.nom)}</h2>
                <p className="ax-texte-secondaire mb-4">{t(plan.description)}</p>

                {/* Prix */}
                <div className="mb-5">
                  {plan.prixXAF === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <p className="text-4xl font-black" style={{ color: plan.couleur }}>{t("Gratuit")}</p>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <p className="text-4xl font-black" style={{ color: plan.couleur }}>
                        {afficherXAF
                          ? plan.prixXAF.toLocaleString(t.loc)
                          : prixLocal.toLocaleString(t.loc)}
                      </p>
                      <span className="text-doux text-sm font-semibold">
                        {afficherXAF ? "FCFA" : t(devise)} {t("/ mois")}
                      </span>
                    </div>
                  )}
                  {plan.prixXAF !== 0 && !afficherXAF && (
                    <p className="text-xs text-doux mt-0.5">
                      ≈ {plan.prixXAF.toLocaleString(t.loc)}{" "}{t("FCFA/mois")}
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {f.ok ? (
                        <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: plan.bg, border: `1px solid ${plan.border}` }}>
                          <Check size={10} style={{ color: plan.couleur }} aria-label={t("Inclus")} />
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-carte-2 border border-bordure">
                          <X size={10} className="text-doux" aria-label={t("Non inclus")} />
                        </span>
                      )}
                      <span className={`text-sm leading-snug ${f.ok ? "text-encre" : "text-doux line-through decoration-bordure-forte"}`}>
                        {t(f.label)}
                      </span>
                    </li>
                  ))}
                </ul>

                {ferme ? (
                  <p className="w-full text-center text-sm font-semibold text-doux bg-carte-2 rounded-controle py-2.5">{t("Fermé pendant la promo : déjà inclus")}</p>
                ) : (
                  <AbonnementActions planId={plan.id} planActuel={planActuel} couleur={plan.couleur} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="rounded-carte border border-bordure bg-carte shadow-carte p-carte">
        <h2 className="ax-titre-section flex items-center gap-2 mb-4">
          <HelpCircle size={16} className="text-attention" aria-hidden />{t("Questions fréquentes")}
        </h2>
        <div className="space-y-4">
          {ABONNEMENT_FAQ.map((item, i) => (
            <div key={i} className="border-b border-bordure last:border-0 pb-4 last:pb-0">
              <h3 className="ax-libelle mb-1">{t(item.q)}</h3>
              <p className="ax-texte-secondaire">{t(item.r)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CarteEssai({ essai }: { essai: EssaiGrille }) {
  const t = useT();
  const reste = useTempsRestant(essai.phase === "en_cours" ? essai.finLe : null);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-carte border border-attention-bordure bg-primaire-fond px-5 py-4">
      {reste ? (
        <p className="ax-texte">
          <strong>{t("Essai Illimité en cours")}</strong>{" "}— {t("{0} restants", reste.texte)}.{" "}
          {t("Abonne-toi avant la fin pour garder tes avantages, sinon ta boutique repassera en Essentiel.")}{" "}
          {t("Tes 30 jours payés ne commencent qu'à la fin de l'essai : tu ne perds aucun jour.")}
        </p>
      ) : (
        <>
          <p className="ax-texte"><strong>{t("7 jours d'Illimité offerts")}</strong>{" "}— {t("sans carte, une seule fois par compte. À la fin, tu choisis un plan ou tu restes en Essentiel.")}</p>
          <BoutonEssai />
        </>
      )}
    </div>
  );
}
