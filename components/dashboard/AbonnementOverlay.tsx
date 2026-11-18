"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Lock } from "lucide-react";
import { Badge, Bouton, BoutonIcone, EtatChargement, EtatErreur } from "@/components/ui";
import { PlansGrid } from "@/components/dashboard/PlansGrid";
import { NOMS_PALIERS, type Palier } from "@/lib/plans";
import { useT } from "@/components/I18nProvider";
import type { EssaiGrille } from "@/components/dashboard/PlansGrid";

interface Etat {
  planActuel: Palier;
  nomPlan: string;
  nomBoutique: string | null;
  devise: string;
  promo?: boolean;
  essai?: EssaiGrille;
}

// Prend le dessus sur tout le dashboard (sidebar comprise) via un portail —
// c'est le point d'entrée unique déclenché par chaque cadenas de fonctionnalité
// hors plan, ainsi que par le lien "Abonnement" de la sidebar.
// `actionSecondaire` : libellé d'un bouton qui ferme aussi (ex. « Continuer en Essentiel » à la fin de l'essai).
export function AbonnementOverlay({ palierRequis, message, onClose, actionSecondaire }: { palierRequis?: Palier; message?: string; onClose: () => void; actionSecondaire?: string }) {
  const t = useT();
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState(false);

  const charger = () => {
    setErreur(false);
    fetch("/api/abonnement/etat")
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(setEtat)
      .catch(() => setErreur(true));
  };
  useEffect(() => {
    document.body.style.overflow = "hidden";
    charger();
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t("Abonnement")} className="fixed inset-0 z-[10002] bg-fond flex flex-col" style={{ animation: "axFadeIn 0.15s ease-out" }}>
      <style>{`@keyframes axFadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      {/* Barre supérieure */}
      <div className="flex-shrink-0 min-h-14 py-2 flex items-center justify-between gap-3 px-page sm:px-5 border-b border-bordure bg-carte">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {palierRequis && (
            <Badge ton="accent" icone={<Lock aria-hidden />}>{t("Réservé au Palier")}{" "}{t(NOMS_PALIERS[palierRequis])}</Badge>
          )}
          {message && <p className="text-sm font-semibold text-encre">{t(message)}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
        {actionSecondaire && (
          <Bouton variante="secondaire" taille="compact" onClick={onClose}>{t(actionSecondaire)}</Bouton>
        )}
        <BoutonIcone label={t("Fermer")} onClick={onClose}>
          <X size={18} aria-hidden />
        </BoutonIcone>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-page sm:px-6 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {erreur && (
            <EtatErreur titre={t("Votre abonnement n'a pas pu être chargé.")} texte={t("Vérifiez votre connexion puis réessayez.")} onReessayer={charger} />
          )}
          {!erreur && !etat && <EtatChargement texte={t("Chargement des abonnements…")} />}
          {etat && (
            <PlansGrid planActuel={etat.planActuel} nomPlan={etat.nomPlan} devise={etat.devise} essai={etat.essai} promo={!!etat.promo} compact />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
