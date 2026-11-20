"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Crosshair, Eye, Maximize, Minimize, Minus, Plus } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { GlobeInteractif } from "./GlobeInteractif";
import { borner, origine, zoomMax, zoomMin, type Lieu } from "./globe";
import "./direct.css";

export function CarteCommandes({ lieux, children }: { lieux: Lieu[]; children: ReactNode }) {
  const t = useT();
  const [camera, setCamera] = useState(origine);
  const [ville, setVille] = useState("");
  const [panneaux, setPanneaux] = useState(true);
  const [mode, setMode] = useState<"normal" | "natif" | "dialogue">("normal");
  const carte = useRef<HTMLDivElement>(null);
  const dialogue = useRef<HTMLDialogElement>(null);
  const boutonEcran = useRef<HTMLButtonElement>(null);
  const demandeEnCours = useRef(false);
  const monte = useRef(false);
  const choix = lieux.find(v => v.nom === ville);
  const agrandi = mode !== "normal";

  useEffect(() => {
    monte.current = true;
    function synchroniser() {
      if (document.fullscreenElement === carte.current) setMode("natif");
      else setMode(m => m === "natif" ? "normal" : m);
    }
    document.addEventListener("fullscreenchange", synchroniser);
    return () => { monte.current = false; document.removeEventListener("fullscreenchange", synchroniser); };
  }, []);
  useLayoutEffect(() => {
    if (mode !== "dialogue") return;
    const el = dialogue.current!;
    el.showModal();
    el.querySelector<HTMLCanvasElement>("canvas")?.focus();
    return () => { if (el.open) el.close(); };
  }, [mode]);

  async function basculerEcran() {
    if (demandeEnCours.current) return;
    if (mode === "dialogue") {
      setMode("normal");
      requestAnimationFrame(() => boutonEcran.current?.focus());
      return;
    }
    demandeEnCours.current = true;
    try {
      if (document.fullscreenElement === carte.current && carte.current) {
        await document.exitFullscreen();
      } else if (carte.current?.requestFullscreen && document.fullscreenEnabled) {
        try { await carte.current.requestFullscreen(); }
        catch { if (monte.current) setMode("dialogue"); }
      } else {
        setMode("dialogue");
      }
    } finally { demandeEnCours.current = false; }
  }

  function choisir(nom: string) {
    setVille(nom);
    const lieu = lieux.find(v => v.nom === nom);
    if (!nom) setCamera(origine);
    else if (lieu && lieu.lat != null && lieu.lng != null) {
      setCamera(c => ({latitude:lieu.lat!,longitude:lieu.lng!,zoom:Math.max(c.zoom,1.5)}));
    }
  }
  function zoomer(facteur: number) {
    setCamera(c=>({...c,zoom:borner(c.zoom*facteur,zoomMin,zoomMax)}));
  }

  const surface = <>
    <div className="axd-direct-tools">
      <select aria-label={t("Rechercher un emplacement")} value={choix?.nom ?? ""} onChange={e=>choisir(e.target.value)}>
        <option value="">{t("Tous les emplacements")}</option>
        {lieux.map(v=><option key={v.nom} value={v.nom}>{v.nom} ({v.total})</option>)}
      </select>
      {!agrandi && <button type="button" onClick={()=>setPanneaux(v=>!v)} aria-pressed={panneaux} aria-label={t("Afficher les indicateurs")}><Eye size={17}/></button>}
      <button type="button" ref={boutonEcran} onClick={basculerEcran} aria-pressed={agrandi}
        aria-label={t(agrandi ? "Quitter le plein écran" : "Plein écran")}>{agrandi ? <Minimize size={17}/> : <Maximize size={17}/>}</button>
    </div>
    <div className="axd-globe-vue"><GlobeInteractif camera={camera} setCamera={setCamera} lieux={lieux} choisir={choisir} ville={ville}/></div>
    <div className="axd-direct-bottom"><small>{choix ? choix.nom + " · " + choix.total + " " + t("Commandes") : t("Commandes par ville")}{choix && choix.lat == null && " · " + t("Position indisponible")}</small>
      <div>
        <button type="button" aria-label={t("Recentrer le globe")} onClick={()=>choisir("")}><Crosshair size={17}/></button>
        <button type="button" aria-label={t("Réduire le zoom")} disabled={camera.zoom<=zoomMin} onClick={()=>zoomer(.8)}><Minus size={17}/></button>
        <output aria-label={t("Niveau de zoom")}>{Math.round(camera.zoom*100)} %</output>
        <button type="button" aria-label={t("Agrandir le zoom")} disabled={camera.zoom>=zoomMax} onClick={()=>zoomer(1.25)}><Plus size={17}/></button>
      </div>
    </div>
    <small className="axd-globe-aide" id="globe-mode-emploi">{t("Faites glisser pour tourner. Zoomez avec la molette, deux doigts ou les boutons.")} <span className="sr-only">{t("Au clavier, utilisez les flèches, les touches plus et moins, ou Début pour recentrer.")}</span></small>
  </>;

  return <div className="axd-direct" data-panels={panneaux}>
    {panneaux && children}
    <div ref={carte} className="axd-direct-map">{mode !== "dialogue" && surface}</div>
    <dialog ref={dialogue} className="axd-globe-dialog" aria-label={t("Globe interactif des commandes")}
      onCancel={e=>{e.preventDefault(); void basculerEcran();}}>
      {mode === "dialogue" && <div className="axd-direct-map">{surface}</div>}
    </dialog>
  </div>;
}
