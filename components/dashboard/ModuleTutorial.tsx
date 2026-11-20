"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, ArrowRight, ArrowLeft, Check, Crown, LayoutDashboard } from "lucide-react";
import { useT } from "@/components/I18nProvider";

export interface TutorialStep {
  Icon: any;
  titre: string;
  description: string;
}

interface Props {
  /** Identifiant unique et stable du module — nom d'événement pour la réouverture manuelle (bouton "?"). */
  moduleKey: string;
  titre: string;
  sousTitre?: string;
  steps: TutorialStep[];
  /**
   * Étape spéciale "palier" — affichée en dernière position quand le
   * marchand n'a pas le palier requis, avec un CTA dédié (ex: renvoyer vers
   * "Tableau de bord" pour Stella en palier Essentiel). N'affecte que le
   * contenu du tutoriel, ne bloque jamais l'accès au module lui-même.
   */
  offrePalier?: { label: string; href: string };
  /**
   * true UNIQUEMENT pour le tutoriel d'accueil combiné (un seul par
   * boutique, à la première connexion) — tous les tutoriels par module
   * restent purement à la demande (bouton "?"), jamais auto-affichés, pour
   * éviter la fenêtre récurrente à chaque nouveau module visité.
   */
  autoOpen?: boolean;
  /** Clé de persistance localStorage — par défaut moduleKey, mais peut être surchargée (ex: scoper par tenantId pour le tutoriel d'accueil). */
  storageKey?: string;
}

function cleVue(key: string) { return `axso-tutoriel-vu:${key}`; }

// Fenêtre tutoriel (modale du design system, ds.css « .axd-tuto ») — rendue via portail (document.body) pour ne
// jamais dépendre du positionnement d'un ancêtre : une page dont le wrapper
// a une animation CSS avec transform (.ax-page-enter, présent sur TOUTES les
// pages du dashboard) devient le containing block d'un position:fixed et
// pousse la fenêtre bien en dessous du pli visible sur une page longue —
// même bug déjà corrigé une fois pour PCOnlyGate.
// Auto-affichage réservé au tutoriel d'accueil combiné (autoOpen=true, un
// seul par boutique) ; tous les autres restent silencieux et ne s'ouvrent
// que via le bouton "?" (BoutonRevoirTutoriel) — voir les props ci-dessus.
export function ModuleTutorial({ moduleKey, titre, sousTitre, steps, offrePalier, autoOpen, storageKey }: Props) {
  const tr = useT();
  const [ouvert, setOuvert] = useState(false);
  const [step, setStep] = useState(0);
  const [monte, setMonte] = useState(false);
  const totalSteps = steps.length + (offrePalier ? 1 : 0);
  const surEtapePalier = offrePalier && step === steps.length;
  const key = storageKey ?? moduleKey;

  useEffect(() => { setMonte(true); }, []);

  useEffect(() => {
    if (!autoOpen) return;
    try {
      if (!window.localStorage.getItem(cleVue(key))) {
        const t = setTimeout(() => setOuvert(true), 450);
        return () => clearTimeout(t);
      }
    } catch { /* localStorage indisponible — pas de tutoriel plutôt que planter */ }
  }, [autoOpen, key]);

  useEffect(() => {
    const handler = (e: Event) => { if ((e as CustomEvent).detail === moduleKey) { setStep(0); setOuvert(true); } };
    window.addEventListener("axso:ouvrir-tutoriel", handler as EventListener);
    return () => window.removeEventListener("axso:ouvrir-tutoriel", handler as EventListener);
  }, [moduleKey]);

  function fermer() {
    setOuvert(false);
    try { window.localStorage.setItem(cleVue(key), "1"); } catch {}
  }

  if (!ouvert || !monte) return null;

  const s = !surEtapePalier ? steps[step] : null;

  return createPortal((
    <div className="ax-admin axd-tuto" role="dialog" aria-modal="true" aria-label={tr(titre)} onClick={fermer}>
      <div className="axd-tuto__carte" onClick={(e) => e.stopPropagation()}>
        <div className="axd-tuto__tete">
          <div style={{ minWidth: 0 }}>
            <p className="axd-tuto__titre">{tr(titre)}</p>
            {sousTitre && <p className="axd-tuto__sous">{tr(sousTitre)}</p>}
          </div>
          <button type="button" onClick={fermer} className="axd-icon-btn" aria-label={tr("Fermer")}><X size={16} /></button>
        </div>

        <div className="axd-tuto__corps">
          {surEtapePalier ? (
            <>
              <div className="axd-tuto__icone"><Crown size={22} /></div>
              <h3 className="axd-tuto__h">{tr("Fonctionnalité Pro")}</h3>
              <p className="axd-tuto__p">
                {tr("L'interface Stella en plein écran, dès la connexion, fait partie du palier")}{" "}<strong>{tr("Pro")}</strong>{tr(". En attendant, retrouve toutes tes ventes, produits et statistiques depuis le tableau de bord classique.")}
              </p>
              <Link href={offrePalier!.href} onClick={fermer} className="axd-btn axd-btn--primary" style={{ marginTop: 16 }}>
                <LayoutDashboard size={14} /> {tr(offrePalier!.label)}
              </Link>
            </>
          ) : s && (
            <div key={step} className="axd-tuto__etape">
              <div className="axd-tuto__icone"><s.Icon size={22} /></div>
              <h3 className="axd-tuto__h">{tr(s.titre)}</h3>
              <p className="axd-tuto__p">{tr(s.description)}</p>
            </div>
          )}
        </div>

        <div className="axd-tuto__pied">
          <div className="axd-tuto__points" aria-label={tr("Étape {0} sur {1}", step + 1, totalSteps)}>
            {Array.from({ length: totalSteps }).map((_, i) => <span key={i} data-actif={i === step || undefined} data-fait={i < step || undefined} />)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={fermer} className="axd-btn axd-btn--plain">{tr("Passer")}</button>
            {step > 0 && <button type="button" onClick={() => setStep((v) => v - 1)} className="axd-btn" aria-label={tr("Précédent")}><ArrowLeft size={14} /></button>}
            {step < totalSteps - 1
              ? <button type="button" onClick={() => setStep((v) => v + 1)} className="axd-btn axd-btn--primary">{tr("Suivant")}<ArrowRight size={13} /></button>
              : <button type="button" onClick={fermer} className="axd-btn axd-btn--primary"><Check size={13} />{tr("Compris")}</button>}
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}

/** Bouton "?" compact à poser à côté du titre d'une page pour rouvrir son tutoriel à la demande. */
export function BoutonRevoirTutoriel({ moduleKey, dark }: { moduleKey: string; dark?: boolean }) {
  const tr = useT();
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("axso:ouvrir-tutoriel", { detail: moduleKey }))}
      title={tr("Revoir le tutoriel")}
      aria-label={tr("Revoir le tutoriel")}
      className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors flex-shrink-0"
      style={dark
        ? { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.12)" }
        : { background: "var(--color-surface-secondary, #f1f1f1)", color: "var(--color-text-secondary, #616161)", border: "1px solid var(--color-border-secondary, #e3e3e3)" }}
    >
      ?
    </button>
  );
}
