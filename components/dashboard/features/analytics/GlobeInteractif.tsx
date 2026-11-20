"use client";
import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction,
  type PointerEvent as ReactPointerEvent, type KeyboardEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { borner, dessinerGlobe, longitude, zoomMax, zoomMin, type Camera, type Lieu, type Repere } from "./globe";

type Position = { x: number; y: number };
const distance = (a: Position, b: Position) => Math.hypot(a.x-b.x, a.y-b.y);
type Props = { camera: Camera; setCamera: Dispatch<SetStateAction<Camera>>; lieux: Lieu[]; ville: string; choisir: (nom: string) => void };

export function GlobeInteractif({ camera, setCamera, lieux, ville, choisir }: Props) {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const reperes = useRef<Repere[]>([]);
  const doigts = useRef(new Map<number, Position>());
  const clic = useRef<Position | null>(null);
  const [taille, setTaille] = useState({ largeur: 0, hauteur: 0, dpr: 1 });

  useLayoutEffect(() => {
    const el = canvas.current!;
    function mesurer() {
      const r = el.getBoundingClientRect();
      setTaille({ largeur: r.width, hauteur: r.height, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    }
    const observateur = new ResizeObserver(mesurer);
    mesurer();
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = canvas.current!;
    const { largeur, hauteur, dpr } = taille;
    const ctx = el.getContext("2d");
    if (!ctx || !largeur || !hauteur) return;
    const frame = requestAnimationFrame(() => {
      const w = Math.round(largeur*dpr), h = Math.round(hauteur*dpr);
      if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
      ctx.setTransform(dpr,0,0,dpr,0,0);
      reperes.current = dessinerGlobe(ctx, largeur, hauteur, camera, lieux, ville);
    });
    return () => cancelAnimationFrame(frame);
  }, [camera, lieux, ville, taille]);

  useEffect(() => {
    const el = canvas.current!;
    function molette(e: WheelEvent) {
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1);
      setCamera(c => ({ ...c, zoom: borner(c.zoom * Math.exp(-borner(delta,-240,240)*.002), zoomMin, zoomMax) }));
    }
    el.addEventListener("wheel", molette, { passive: false });
    return () => el.removeEventListener("wheel", molette);
  }, [setCamera]);

  function commencer(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.button !== 0) return;
    const position = { x: e.clientX, y: e.clientY };
    doigts.current.set(e.pointerId, position);
    clic.current = doigts.current.size === 1 ? position : null;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
  }
  function deplacer(e: ReactPointerEvent<HTMLCanvasElement>) {
    const suivis = doigts.current;
    const avant = suivis.get(e.pointerId);
    if (!avant) return;
    const apres = { x:e.clientX, y:e.clientY };
    suivis.set(e.pointerId, apres);
    if (clic.current && distance(clic.current, apres) > 5) clic.current = null;
    if (suivis.size === 2) {
      const autre = [...suivis].find(([id]) => id !== e.pointerId)![1];
      const ratio = distance(apres,autre) / Math.max(1,distance(avant,autre));
      setCamera(c=>({...c, zoom:borner(c.zoom*ratio,zoomMin,zoomMax)}));
    } else if (suivis.size === 1) {
      const dimension = Math.max(1, Math.min(taille.largeur,taille.hauteur));
      setCamera(c => ({ ...c, longitude: longitude(c.longitude - (apres.x-avant.x)*140/(dimension*c.zoom)),
        latitude: borner(c.latitude + (apres.y-avant.y)*140/(dimension*c.zoom), -90, 90) }));
    }
  }
  function terminer(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!doigts.current.delete(e.pointerId)) return;
    if (e.type === "pointerup" && clic.current && distance(clic.current,{x:e.clientX,y:e.clientY}) <= 5) {
      const rect = e.currentTarget.getBoundingClientRect();
      const p = {x:e.clientX-rect.left,y:e.clientY-rect.top};
      const hit = reperes.current.filter(r=>distance(p,r)<14).sort((a,b)=>distance(p,a)-distance(p,b))[0];
      if (hit) choisir(hit.nom);
    }
    clic.current = null;
  }
  function clavier(e: KeyboardEvent<HTMLCanvasElement>) {
    const key=e.key;
    if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-","Home"].includes(key)) return;
    e.preventDefault();
    if(key==="Home") { choisir(""); return; }
    setCamera(c=> {
      const pas = (e.shiftKey ? 25 : 9) / c.zoom;
      if (key==="+" || key==="=" || key==="-") return {...c,zoom:borner(c.zoom*(key==="-" ? .8 : 1.25),zoomMin,zoomMax)};
      return {...c,longitude:longitude(c.longitude+(key==="ArrowRight"?pas:key==="ArrowLeft"?-pas:0)),
        latitude:borner(c.latitude+(key==="ArrowUp"?pas:key==="ArrowDown"?-pas:0),-90,90)};
    });
  }

  return <canvas ref={canvas} className="axd-direct-globe" tabIndex={0} role="group"
    aria-label={t("Globe interactif des commandes")} aria-describedby="globe-mode-emploi"
    onPointerDown={commencer} onPointerMove={deplacer} onPointerUp={terminer}
    onPointerCancel={terminer} onLostPointerCapture={terminer} onKeyDown={clavier}
    onDoubleClick={()=>setCamera(c=>({...c,zoom:borner(c.zoom*1.5,zoomMin,zoomMax)}))} />;
}
