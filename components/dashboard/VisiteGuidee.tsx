"use client";
// Visite guidée : éclaire l'élément à toucher (repéré par data-guide, ou par un sélecteur CSS
// « css:… »), pointe dessus avec une flèche animée et explique quoi faire dans une bulle.
// Démarre une seule fois par visite (clé localStorage) ou à la demande avec ?guide=1.
// Une étape dont la cible est absente s'affiche au centre de l'écran, sauf si elle est
// facultative : elle est alors sautée.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/components/I18nProvider";

export type EtapeGuide = {
  /** Valeur de l'attribut data-guide de l'élément visé, ou « css:sélecteur » ; absent : bulle centrée. */
  cible?: string;
  /** Sautée si sa cible n'est pas sur la page (visites communes à plusieurs pages). */
  facultative?: boolean;
  titre: string;
  texte: string;
};

const MARGE = 8;
const BULLE = 300;

function cibleVisible(nom?: string): HTMLElement | null {
  if (!nom) return null;
  let liste: NodeListOf<HTMLElement>;
  try { liste = document.querySelectorAll<HTMLElement>(nom.startsWith("css:") ? nom.slice(4) : `[data-guide="${nom}"]`); } catch { return null; }
  for (const el of liste) {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    // Visible et dans l'écran (un tiroir replié hors de l'écran compte comme absent).
    if (r.width > 0 && r.height > 0 && s.visibility !== "hidden" && r.right > 0 && r.left < window.innerWidth) return el;
  }
  return null;
}

/** Ouvre la visite d'une page depuis n'importe quel bouton (« Me guider »). */
export function relancerVisite(cle: string) {
  window.dispatchEvent(new CustomEvent("axso:visite", { detail: cle }));
}

export function VisiteGuidee({ cle, etapes, auto = true }: { cle: string; etapes: EtapeGuide[]; auto?: boolean }) {
  const t = useT();
  const [i, setIBrut] = useState<number | null>(null);
  // Étapes retenues au démarrage : les facultatives sans cible sur la page sont sautées.
  const [actives, setActives] = useState<EtapeGuide[]>(etapes);
  // Les pages recréent la liste des étapes à chaque rendu : on garde la dernière dans une référence,
  // pour que le démarrage ne se relance jamais tout seul (retour à l'étape 1 en pleine visite).
  const etapesRef = useRef(etapes);
  etapesRef.current = etapes;
  const setI = useCallback((n: number | null) => {
    if (n === 0) setActives(etapesRef.current.filter((e) => !e.facultative || cibleVisible(e.cible)));
    setIBrut(n);
  }, []);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const stockage = `axso:visite:${cle}`;

  const terminer = useCallback(() => {
    setIBrut(null);
    try { localStorage.setItem(stockage, "1"); } catch { /* stockage indisponible */ }
  }, [stockage]);

  // Démarrage : ?guide=1, première visite, ou relancerVisite(cle). Attend qu'aucune
  // autre fenêtre (bienvenue, confirmation…) ne soit ouverte.
  useEffect(() => {
    const demande = new URLSearchParams(location.search).get("guide");
    let vu = false;
    try { vu = localStorage.getItem(stockage) === "1"; } catch { vu = true; }
    let minuteur: ReturnType<typeof setTimeout>;
    const essayer = (n = 0) => {
      if (document.querySelector('[aria-modal="true"], [role="dialog"]:not(.axd-guide__bulle)') && n < 40) { minuteur = setTimeout(() => essayer(n + 1), 800); return; }
      setI(0);
    };
    if (demande || (auto && !vu)) minuteur = setTimeout(essayer, 900);
    const relance = (e: Event) => { if ((e as CustomEvent).detail === cle) setI(0); };
    window.addEventListener("axso:visite", relance);
    return () => { clearTimeout(minuteur); window.removeEventListener("axso:visite", relance); };
  }, [auto, cle, stockage, setI]);

  const etape = i === null ? null : actives[i] ?? null;

  // Position de la cible, suivie au défilement et au redimensionnement.
  useLayoutEffect(() => {
    if (!etape) return;
    const el = cibleVisible(etape.cible);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    let image = 0;
    const suivre = () => { const c = cibleVisible(etape.cible); setRect(c ? c.getBoundingClientRect() : null); image = requestAnimationFrame(suivre); };
    image = requestAnimationFrame(suivre);
    const clavier = (e: KeyboardEvent) => { if (e.key === "Escape") terminer(); };
    document.addEventListener("keydown", clavier);
    return () => { cancelAnimationFrame(image); document.removeEventListener("keydown", clavier); };
  }, [etape, terminer]);

  if (!etape || typeof document === "undefined") return null;
  const derniere = i === actives.length - 1;
  const vw = window.innerWidth, vh = window.innerHeight;
  const largeur = Math.min(BULLE, vw - 24);

  // Bulle sous la cible si la place le permet, sinon au-dessus ; flèche vers la cible.
  let bulle: React.CSSProperties = { left: (vw - largeur) / 2, top: vh / 2 - 110, width: largeur };
  let fleche: { x: number; y: number; haut: boolean } | null = null;
  if (rect) {
    const centreX = rect.left + rect.width / 2;
    const left = Math.max(12, Math.min(vw - largeur - 12, centreX - largeur / 2));
    const dessous = rect.bottom + 230 < vh || rect.top < 230;
    bulle = dessous
      ? { left, top: Math.min(rect.bottom + 54, vh - 220), width: largeur }
      : { left, bottom: Math.min(vh - rect.top + 54, vh - 60), width: largeur };
    fleche = { x: Math.max(16, Math.min(vw - 16, centreX)), y: dessous ? rect.bottom + MARGE + 4 : rect.top - MARGE - 4, haut: dessous };
  }

  return createPortal(
    <div className="axd-guide" aria-live="polite">
      {rect
        ? <div className="axd-guide__trou" style={{ left: rect.left - MARGE, top: rect.top - MARGE, width: rect.width + MARGE * 2, height: rect.height + MARGE * 2 }} />
        : <div className="axd-guide__voile" />}
      {fleche && (
        <svg className={`axd-guide__fleche${fleche.haut ? "" : " axd-guide__fleche--bas"}`} style={{ left: fleche.x - 18, top: fleche.haut ? fleche.y : fleche.y - 40 }} width="36" height="40" viewBox="0 0 36 40" aria-hidden>
          <path d="M18 38V6M6 17 18 4l12 13" fill="none" stroke="#EBA900" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <div className="axd-guide__bulle" role="dialog" aria-label={t(etape.titre)} style={bulle}>
        <div className="axd-guide__pas">{t("Étape {0} sur {1}", String(i! + 1), String(actives.length))}<i><b style={{ width: `${((i! + 1) / actives.length) * 100}%` }} /></i></div>
        <h3>{t(etape.titre)}</h3>
        <p>{t(etape.texte)}</p>
        <div className="axd-guide__actions">
          <button type="button" className="axd-guide__passer" onClick={terminer}>{t("Passer")}</button>
          {i! > 0 && <button type="button" className="axd-guide__prec" onClick={() => setI(i! - 1)}>{t("Précédent")}</button>}
          <button type="button" className="axd-guide__suiv" onClick={() => (derniere ? terminer() : setI(i! + 1))}>{derniere ? t("J'ai compris") : t("Suivant")}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
