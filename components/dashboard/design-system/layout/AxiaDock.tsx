"use client";
// Dock Stella flottant (MASTERPROMPT §10) : centré en bas, sur toutes les pages
// sauf l'accueil. Il ouvre le panneau Stella (components/dashboard/AxiaBulle.tsx)
// via l'évènement « axia:assister », comme la barre mobile.

import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Icon, AxiaMark } from "../icons/Icon";

/** Ouvre le panneau Stella, avec une question à envoyer si fournie. */
export function ouvrirAxia(question?: string) {
  window.dispatchEvent(new CustomEvent("axia:assister", { detail: question ? { question } : undefined }));
}

export function AxiaDock() {
  const t = useT();
  const [propositions, setPropositions] = useState(0);
  useEffect(() => {
    const maj = (e: Event) => setPropositions(Number((e as CustomEvent).detail) || 0);
    window.addEventListener("axia:compte", maj);
    return () => window.removeEventListener("axia:compte", maj);
  }, []);

  return (
    <div className="axd-dock" onClick={() => ouvrirAxia()} role="group" aria-label="Stella">
      <AxiaMark />
      <button type="button" className="axd-dock__ph">{t("Travailler avec Stella")}</button>
      {propositions > 0 && <span className="axd-dock__count" aria-label={t("{0} propositions de Stella", propositions)}>{propositions}</span>}
      <button type="button" className="axd-icon-btn" aria-label={t("Ajouter")} title={t("Ajouter")}><Icon name="plus" /></button>
      <button type="button" className="axd-icon-btn" aria-label={t("Dicter")} title={t("Dicter")}><Icon name="mic" /></button>
      <span className="axd-sep" />
      <button type="button" className="axd-icon-btn" aria-label={t("Ouvrir le panneau")} title={t("Ouvrir le panneau")}><Icon name="panel" /></button>
    </div>
  );
}
