"use client";
// Briques visuelles du parcours, relevées sur le premier écran de la landing
// (components/marketing/HeroSection.tsx, charte.ts) : fond blanc + HeroFond, noir #111111,
// ambre #F5A623, Poppins extra-gras resserré, bouton pilule noir à flèche ambre, cartes rounded-2xl.
import { ArrowLeft, ArrowRight, Loader2, Volume2, VolumeX } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { palierJauge } from "@/lib/inscription";

export const NOIR = "#111111";
export const AMBRE = "#F5A623";
export const AMBRE_FONCE = "#D4911A";
// Courbe et décalages de l'entrée du hero (entree() de HeroSection).
export const COURBE = "cubic-bezier(0.23,1,0.32,1)";

export const CSS = `
  @keyframes inscEntree { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
  .insc-ecran > * { animation: inscEntree .7s ${COURBE} both; }
  .insc-ecran > *:nth-child(2) { animation-delay: 80ms }
  .insc-ecran > *:nth-child(3) { animation-delay: 160ms }
  .insc-ecran > *:nth-child(4) { animation-delay: 240ms }
  .insc-ecran > *:nth-child(n+5) { animation-delay: 320ms }

  .insc-carte { transition: transform .25s ${COURBE}, border-color .2s, background-color .2s, box-shadow .25s; }
  .insc-carte:hover:not([aria-pressed="true"]) { border-color: ${AMBRE}; transform: translateY(-2px); box-shadow: 0 10px 40px -12px rgba(17,17,17,.25); }
  .insc-carte:active { transform: scale(.98); }

  /* Focus visible : anneau noir (contraste suffisant sur blanc, ce que l'ambre n'a pas). */
  .insc :focus-visible { outline: 3px solid ${NOIR}; outline-offset: 3px; border-radius: 16px; }
  .insc .insc-sombre:focus-visible { outline-color: ${AMBRE}; }

  .insc-champ { width: 100%; height: 56px; border-radius: 16px; border: 1px solid #e5e7eb; background: #fff; padding: 0 18px;
    font-size: 16px; color: ${NOIR}; outline: none; transition: border-color .2s, box-shadow .2s; }
  .insc-champ:focus { border-color: ${AMBRE}; box-shadow: 0 10px 40px -12px rgba(17,17,17,.25); }
  .insc-champ::placeholder { color: #6b7280; }
  textarea.insc-champ { height: auto; padding: 14px 18px; resize: none; line-height: 1.55; }

  .insc-jauge-remplie { transition: transform .9s ${COURBE}; transform-origin: left; }
  @keyframes inscFondu { from { opacity: 0 } to { opacity: 1 } }
  .insc-fondu { animation: inscFondu .6s ${COURBE} both; }

  /* Version allégée (appareil modeste, connexion lente) : fond figé, rien ne tourne en continu. */
  .insc-leger .ax-nappe, .insc-leger .ax-lueur, .insc-leger .ax-grille-motif { animation: none !important; }

  @media (prefers-reduced-motion: reduce) {
    .insc-ecran > * { animation: none; }
    .insc-carte, .insc-jauge-remplie { transition: none; }
    .insc-carte:hover:not([aria-pressed="true"]) { transform: none; }
  }
`;

/** Titre de l'écran : reçoit le focus à chaque changement (lecteur d'écran, clavier). */
export function Question({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h1 id={id} tabIndex={-1} className="text-[28px] sm:text-[40px] font-extrabold leading-[1.06] tracking-tight text-[#111111] outline-none">
      {children}
    </h1>
  );
}

/** Une phrase d'Axia, au-dessus de la question. */
export function Axia({ children }: { children: React.ReactNode }) {
  const tr = useT();
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-[#111111]">
        <img src="/axia-icon.png" alt={tr("Axia")} className="w-full h-full object-cover" />
      </span>
      <p className="text-[15px] text-gray-600 leading-snug">{children}</p>
    </div>
  );
}

/** Bouton principal du hero : pilule noire, flèche ambre. */
export function BoutonNoir({ children, disabled, chargement, type = "button", onClick }: {
  children: React.ReactNode; disabled?: boolean; chargement?: boolean; type?: "button" | "submit"; onClick?: () => void;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled || chargement}
      className="insc-sombre inline-flex items-center justify-center gap-2 rounded-full px-7 h-14 text-[15px] font-bold text-white bg-[#111111] transition-transform hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed w-full sm:w-auto">
      {chargement ? <Loader2 size={18} className="animate-spin" /> : null}
      {children}
      {!chargement && <ArrowRight size={17} style={{ color: AMBRE }} aria-hidden />}
    </button>
  );
}

/** Grande carte de choix. */
export function Carte({ titre, desc, icone, choisi, onClick, compacte }: {
  titre: React.ReactNode; desc?: React.ReactNode; icone?: React.ReactNode; choisi?: boolean; onClick: () => void; compacte?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={!!choisi}
      className={`insc-carte ${choisi ? "insc-sombre" : ""} w-full text-left flex items-center gap-4 rounded-2xl border ${compacte ? "min-h-[56px] px-4 py-3" : "min-h-[84px] px-5 py-4"}`}
      style={choisi
        ? { background: NOIR, borderColor: NOIR, color: "#fff", boxShadow: "0 10px 40px -12px rgba(17,17,17,.45)" }
        : { background: "#fff", borderColor: "#e5e7eb", color: NOIR }}>
      {icone && (
        <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: choisi ? "rgba(245,166,35,.16)" : "#f9fafb", color: choisi ? AMBRE : NOIR }}>
          {icone}
        </span>
      )}
      <span className="min-w-0">
        <span className={`block font-bold ${compacte ? "text-[14px]" : "text-[16px]"} leading-tight`}>{titre}</span>
        {desc && <span className={`block text-[14px] mt-1 leading-snug ${choisi ? "text-white/70" : "text-gray-500"}`}>{desc}</span>}
      </span>
    </button>
  );
}

/** Jauge de poussée : remplace la barre de progression. */
export function Jauge({ p }: { p: number }) {
  const tr = useT();
  const pct = Math.round(p * 100);
  return (
    <div className="w-full" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={tr("Poussée")} aria-valuetext={tr(palierJauge(p))}>
      <div className="flex items-center justify-between mb-1.5 text-[12px] font-bold uppercase tracking-widest">
        <span className="text-[#111111]">{tr(palierJauge(p))}</span>
        <span className="text-gray-500 tabular-nums">{pct} %</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="insc-jauge-remplie h-full rounded-full" style={{ transform: `scaleX(${Math.max(p, 0.02)})`, background: `linear-gradient(90deg, ${NOIR}, ${AMBRE_FONCE} 55%, ${AMBRE})` }} />
      </div>
    </div>
  );
}

export function BoutonSon({ coupe, onClick }: { coupe: boolean; onClick: () => void }) {
  const tr = useT();
  return (
    <button type="button" onClick={onClick} aria-pressed={coupe} aria-label={coupe ? tr("Réactiver le son") : tr("Couper le son")}
      className="w-[44px] h-[44px] rounded-full flex items-center justify-center border border-gray-200 bg-white text-[#111111] hover:border-[#F5A623] transition-colors">
      {coupe ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}

export function Retour({ onClick }: { onClick: () => void }) {
  const tr = useT();
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 h-[44px] px-3 -ml-3 rounded-full text-[14px] font-semibold text-gray-600 hover:text-[#111111] transition-colors">
      <ArrowLeft size={16} aria-hidden /> {tr("Retour")}
    </button>
  );
}

/**
 * Téléphone : à l'ouverture du clavier, ramène le bouton du formulaire (Continuer…) dans la partie visible,
 * juste sous le champ touché. À poser en onFocus d'un <form>.
 */
export function garderBoutonVisible(e: React.FocusEvent<HTMLFormElement>) {
  const champ = e.target;
  if (!(champ instanceof HTMLInputElement || champ instanceof HTMLTextAreaElement)) return;
  try { if (!matchMedia("(pointer: coarse)").matches) return; } catch { return; }
  const form = e.currentTarget;
  setTimeout(() => form.querySelector<HTMLElement>("[type=submit]")?.scrollIntoView({ block: "nearest" }), 350);
}

/** Message d'erreur d'un champ (aucun son, aucune vibration : voir page.tsx). */
export function Erreur({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return <p id={id} role="alert" className="mt-2 text-[14px] font-medium text-[#B91C1C]">{children}</p>;
}
