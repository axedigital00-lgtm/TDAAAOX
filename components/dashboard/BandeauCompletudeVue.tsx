"use client";
// Bandeau « Boutique complète à X % » (PROMPT MISSION B10) : éléments manquants en liens directs,
// conséquence réelle de chacun, « Plus tard » = réduit 24 h. Données : etatCompletude (lib/demarrage.ts).
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { TITRES_ETAPES, listeFr } from "@/lib/demarrage-messages";
import type { EtatCompletude } from "@/lib/demarrage";

export function BandeauCompletudeVue({ etat, discret = false }: { etat: EtatCompletude; discret?: boolean }) {
  const t = useT();
  const [reduit, setReduit] = useState(false);
  if (etat.badge) return discret ? null : <BadgeComplete />;
  if (!etat.visible || reduit) return null;

  function plusTard() {
    setReduit(true);
    fetch("/api/demarrage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reduire_bandeau" }) }).catch(() => {});
  }
  const boutonPlusTard = (
    <button type="button" onClick={plusTard} className="min-h-10 sm:min-h-8 px-2 -mx-2 rounded-controle text-xs font-semibold text-attention hover:underline flex-shrink-0">{t("Plus tard")}</button>
  );

  if (discret) {
    return (
      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap px-4 py-1.5 bg-primaire-fond border-b border-attention-bordure text-sm text-encre flex-shrink-0">
        <span className="font-semibold">{t("Boutique complète à {0} %", etat.pourcent)}</span>
        <span className="flex items-center gap-x-3 gap-y-1 flex-wrap flex-1 min-w-0">
          {etat.manquantes.map((m) => (
            <Link key={m.cle} href={m.href} className="underline underline-offset-2 text-attention hover:text-encre">{t(TITRES_ETAPES[m.cle])}</Link>
          ))}
        </span>
        {boutonPlusTard}
      </div>
    );
  }

  return (
    <section className="rounded-carte border border-attention-bordure bg-primaire-fond p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="ax-sous-titre">{t("Boutique complète à {0} %", etat.pourcent)}</h2>
          <p className="ax-texte-secondaire mt-0.5">{t("Ta boutique est en ligne. Pour bien vendre, il te reste :")}</p>
        </div>
        {boutonPlusTard}
      </div>
      <div className="mt-3 h-2 rounded-full bg-primaire/20 overflow-hidden" role="progressbar" aria-label={t("Boutique complète à {0} %", etat.pourcent)} aria-valuenow={etat.pourcent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primaire" style={{ width: `${etat.pourcent}%` }} />
      </div>
      <ul className="mt-3 space-y-2">
        {etat.manquantes.map((m) => (
          <li key={m.cle}>
            <Link href={m.href} className="flex items-center gap-3 rounded-controle bg-carte border border-attention-bordure px-3.5 py-2.5 hover:border-primaire transition-colors">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-encre">{t(TITRES_ETAPES[m.cle])}</span>
                <span className="block text-xs text-doux leading-snug">{t(m.texte, listeFr((m.liste ?? []).map((x) => t(x))))}</span>
              </span>
              <ArrowRight size={16} className="text-attention flex-shrink-0" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Récompense : affichée 7 jours après le passage à 100 %, tant que c'est vrai (lib/demarrage-regles.ts). */
export function BadgeComplete() {
  const t = useT();
  return (
    <div role="status" className="flex items-center gap-3 rounded-carte border border-succes-bordure bg-succes-fond px-4 py-3">
      <BadgeCheck size={22} className="text-succes flex-shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-bold text-succes">{t("Boutique complète")}</p>
        <p className="text-sm text-encre/80">{t("Bravo : toutes les étapes pour bien vendre sont terminées.")}</p>
      </div>
    </div>
  );
}
