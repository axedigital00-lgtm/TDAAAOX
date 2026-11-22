"use client";
// Expérience du globe : visite guidée au défilement, rotation libre à la souris ou au doigt,
// zoom, choix d'une ville. Sans WebGL ou avec « réduire les animations » : image fixe et liste.
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { creerGlobe, versVecteur, type Etat, type Ville } from "./moteurGlobe";

const RAD = Math.PI / 180;
const VILLES: Ville[] = [
  { id: "douala", nom: "Douala", lat: 4.05, lng: 9.7 }, { id: "dakar", nom: "Dakar", lat: 14.72, lng: -17.47 },
  { id: "abidjan", nom: "Abidjan", lat: 5.34, lng: -4.03 }, { id: "lagos", nom: "Lagos", lat: 6.52, lng: 3.38 },
  { id: "accra", nom: "Accra", lat: 5.6, lng: -0.19 }, { id: "bamako", nom: "Bamako", lat: 12.64, lng: -8 },
  { id: "libreville", nom: "Libreville", lat: 0.42, lng: 9.47 }, { id: "kinshasa", nom: "Kinshasa", lat: -4.32, lng: 15.31 },
  { id: "nairobi", nom: "Nairobi", lat: -1.29, lng: 36.82 }, { id: "casablanca", nom: "Casablanca", lat: 33.57, lng: -7.59 },
  { id: "johannesburg", nom: "Johannesburg", lat: -26.2, lng: 28.05 }, { id: "paris", nom: "Paris", lat: 48.86, lng: 2.35 },
];
const ETAPES = [
  { ville: "douala", zoom: 1.08, sur: "Votre atelier", titre: "Tout part de votre boutique.", texte: "Une seule adresse, un seul stock. Vos commandes s'organisent depuis le lieu où vous travaillez.", produit: "Tissu kente", prix: "18 500 XAF" },
  { ville: "dakar", zoom: 1.28, sur: "Afrique de l'Ouest", titre: "Dakar voit ses prix en XOF.", texte: "Regroupez vos pays en marchés : chaque visiteur lit la devise qui lui parle.", produit: "Huile d’argan", prix: "6 500 XOF" },
  { ville: "lagos", zoom: 1.32, sur: "Nigeria", titre: "Lagos commande sur WhatsApp.", texte: "La conversation devient une commande, avec son récapitulatif et son suivi.", produit: "Café en grains", prix: "9 400 NGN" },
  { ville: "nairobi", zoom: 1.22, sur: "Afrique de l'Est", titre: "Nairobi suit son colis.", texte: "Chaque client garde un lien de suivi, du départ à la remise en main propre.", produit: "Cabas en raphia", prix: "7 800 KES" },
  { ville: "paris", zoom: 1.12, sur: "Diaspora", titre: "Paris achète pour la famille.", texte: "Votre vitrine reste la même d'un continent à l'autre. Seul l'affichage s'adapte.", produit: "Coffret karité", prix: "24,99 EUR" },
];
const cible = (id: string, zoom: number) => { const v = VILLES.find((x) => x.id === id)!; return { yaw: -v.lng * RAD, pitch: Math.min(v.lat, 34) * RAD * 0.86, zoom }; };
const plusCourt = (de: number, vers: number) => { let d = (vers - de) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return de + d; };

export function Globe3D() {
  const t = useT();
  const zone = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const etiquettes = useRef<Record<string, HTMLButtonElement | null>>({});
  const commandes = useRef({ libre: false, cibleLibre: null as null | { yaw: number; pitch: number; zoom: number }, zoomManuel: 1 });
  const [etape, setEtape] = useState(0);
  const [mode, setMode] = useState<"chargement" | "3d" | "statique">("chargement");
  const [libre, setLibre] = useState(false);
  const etapeRef = useRef(0);

  useEffect(() => {
    const c = canvas.current, z = zone.current;
    if (!c || !z) return;
    const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let moteur: ReturnType<typeof creerGlobe> = null, raf = 0, visible = false, fin = false, dernier = 0;
    const e: Etat = { ...cible("douala", 0.82), focus: versVecteur(VILLES[0].lat, VILLES[0].lng) };
    const vit = { yaw: 0, pitch: 0 };
    let tire = false, px = 0, py = 0, temps = 0;

    const progression = () => {
      const r = z.getBoundingClientRect(), course = r.height - window.innerHeight;
      return course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 0;
    };
    const boucle = (ms: number) => {
      if (fin || !visible || !moteur) { raf = 0; return; }
      const dt = Math.min(0.05, (ms - dernier) / 1000 || 0.016); dernier = ms; temps += dt;
      const p = progression();
      if (!commandes.current.libre) {
        const i = Math.min(ETAPES.length - 1, Math.floor(p * ETAPES.length));
        if (i !== etapeRef.current) { etapeRef.current = i; setEtape(i); }
        const b = cible(ETAPES[i].ville, ETAPES[i].zoom);
        const k = 1 - Math.exp(-dt * 3.2);
        e.yaw += (plusCourt(e.yaw, b.yaw + Math.sin(temps * .25) * .04) - e.yaw) * k;
        e.pitch += (b.pitch - e.pitch) * k;
        e.zoom += (b.zoom * commandes.current.zoomManuel - e.zoom) * k;
      } else {
        const b = commandes.current.cibleLibre;
        if (b && !tire) {
          const k = 1 - Math.exp(-dt * 4);
          e.yaw += (plusCourt(e.yaw, b.yaw) - e.yaw) * k; e.pitch += (b.pitch - e.pitch) * k; e.zoom += (b.zoom * commandes.current.zoomManuel - e.zoom) * k;
        } else if (!tire) {
          e.yaw += vit.yaw * dt + dt * .05; e.pitch = Math.max(-1.1, Math.min(1.1, e.pitch + vit.pitch * dt));
          vit.yaw *= Math.exp(-dt * 2.6); vit.pitch *= Math.exp(-dt * 2.6);
          e.zoom += (commandes.current.zoomManuel * 1.1 - e.zoom) * (1 - Math.exp(-dt * 4));
        }
      }
      const v = commandes.current.libre ? null : VILLES.find((x) => x.id === ETAPES[etapeRef.current].ville)!;
      if (v) { const f = versVecteur(v.lat, v.lng); e.focus = [e.focus[0] + (f[0] - e.focus[0]) * .08, e.focus[1] + (f[1] - e.focus[1]) * .08, e.focus[2] + (f[2] - e.focus[2]) * .08]; const n = Math.hypot(...e.focus) || 1; e.focus = [e.focus[0] / n, e.focus[1] / n, e.focus[2] / n]; }
      moteur.dessiner(e, temps);
      for (const ville of VILLES) {
        const el = etiquettes.current[ville.id]; if (!el) continue;
        const pos = moteur.projeter(ville, e);
        if (pos) { el.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`; el.style.opacity = "1"; el.tabIndex = 0; el.style.pointerEvents = "auto"; }
        else { el.style.opacity = "0"; el.tabIndex = -1; el.style.pointerEvents = "none"; }
      }
      raf = requestAnimationFrame(boucle);
    };
    const lancer = () => { if (!raf && visible && moteur && !calme) { dernier = performance.now(); raf = requestAnimationFrame(boucle); } };

    const passerLibre = () => { if (!commandes.current.libre) { commandes.current.libre = true; setLibre(true); } commandes.current.cibleLibre = null; };
    const bas = (ev: PointerEvent) => { if (ev.button) return; tire = true; px = ev.clientX; py = ev.clientY; vit.yaw = vit.pitch = 0; c.setPointerCapture(ev.pointerId); c.dataset.tire = "1"; };
    const bouge = (ev: PointerEvent) => {
      if (!tire) return;
      const dx = ev.clientX - px, dy = ev.clientY - py;
      if (Math.abs(dx) + Math.abs(dy) < 2) return;
      passerLibre(); px = ev.clientX; py = ev.clientY;
      const k = 2.3 / (c.clientHeight * e.zoom);
      e.yaw += dx * k; vit.yaw = dx * k * 60;
      if (ev.pointerType !== "touch") { e.pitch = Math.max(-1.1, Math.min(1.1, e.pitch + dy * k)); vit.pitch = dy * k * 60; }
      if (calme && moteur) moteur.dessiner(e, temps);
    };
    const haut = () => { tire = false; delete c.dataset.tire; };
    const clavier = (ev: KeyboardEvent) => {
      const d = { ArrowLeft: [.14, 0], ArrowRight: [-.14, 0], ArrowUp: [0, .1], ArrowDown: [0, -.1] }[ev.key];
      if (!d) return;
      ev.preventDefault(); passerLibre(); e.yaw += d[0]; e.pitch = Math.max(-1.1, Math.min(1.1, e.pitch + d[1]));
      if (calme && moteur) moteur.dessiner(e, temps);
    };
    c.addEventListener("pointerdown", bas); c.addEventListener("pointermove", bouge); c.addEventListener("pointerup", haut); c.addEventListener("pointercancel", haut); c.addEventListener("keydown", clavier);

    const obs = new IntersectionObserver(([x]) => { visible = x.isIntersecting; if (visible) lancer(); }, { rootMargin: "120px" });
    const ro = new ResizeObserver(() => { moteur?.redimensionner(); if (calme && moteur) moteur.dessiner(e, 0); });
    const page = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else lancer(); };
    document.addEventListener("visibilitychange", page);

    const img = new Image();
    img.onload = () => {
      if (fin) return;
      try { moteur = creerGlobe(c, img, VILLES, "douala"); } catch { moteur = null; }
      if (!moteur) return setMode("statique");
      setMode("3d"); ro.observe(c); obs.observe(z);
      if (calme) { e.zoom = 1.08; moteur.dessiner(e, 0); for (const v of VILLES) { const el = etiquettes.current[v.id], pos = moteur.projeter(v, e); if (el) { el.style.opacity = pos ? "1" : "0"; if (pos) el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`; } } }
    };
    img.onerror = () => setMode("statique");
    const charger = new IntersectionObserver(([x]) => { if (x.isIntersecting) { img.src = "/globe/terres.png"; charger.disconnect(); } }, { rootMargin: "700px" });
    charger.observe(z);
    return () => {
      fin = true; cancelAnimationFrame(raf); obs.disconnect(); ro.disconnect(); charger.disconnect(); document.removeEventListener("visibilitychange", page);
      c.removeEventListener("pointerdown", bas); c.removeEventListener("pointermove", bouge); c.removeEventListener("pointerup", haut); c.removeEventListener("pointercancel", haut); c.removeEventListener("keydown", clavier);
      moteur?.detruire();
    };
  }, []);

  const allerVers = (id: string) => {
    const i = ETAPES.findIndex((x) => x.ville === id);
    commandes.current.libre = true; setLibre(true);
    commandes.current.cibleLibre = cible(id, i >= 0 ? ETAPES[i].zoom + .12 : 1.4);
    if (i >= 0) { etapeRef.current = i; setEtape(i); }
  };
  const reprendre = () => { commandes.current.libre = false; commandes.current.cibleLibre = null; commandes.current.zoomManuel = 1; setLibre(false); };
  const zoomer = (k: number) => { commandes.current.zoomManuel = Math.max(.72, Math.min(1.7, commandes.current.zoomManuel * k)); };
  const e = ETAPES[etape];

  return (
    <section ref={zone} className="axg" aria-label={t("Globe interactif des livraisons")} data-mode={mode}>
      <div className="axg-scene">
        {mode !== "3d" && <img className="axg-repli" src="/editorial/terre-nuit.webp" alt={t("Le continent africain de nuit")} />}
        <canvas ref={canvas} className="axg-canvas" tabIndex={0} role="img" aria-label={t("Globe en 3D. Faites-le tourner avec la souris, le doigt ou les flèches du clavier.")} />
        {mode === "3d" && <div className="axg-etiquettes">
          {VILLES.map((v) => <button key={v.id} type="button" ref={(el) => { etiquettes.current[v.id] = el; }} data-actif={ETAPES[etape].ville === v.id || undefined} onClick={() => allerVers(v.id)}><span>{v.nom}</span></button>)}
        </div>}
        <div className="axg-voile" aria-hidden />
        <div className="axg-texte" key={etape} aria-live="polite">
          <p className="axg-sur"><i />{t(e.sur)}</p>
          <h2>{t(e.titre)}</h2>
          <p className="axg-lead">{t(e.texte)}</p>
        </div>
        <aside className="axg-ticket" key={`t${etape}`}>
          <small>{t("Exemple de commande")}</small>
          <strong>{t(e.produit)}</strong>
          <dl><div><dt>{t("Destination")}</dt><dd>{VILLES.find((v) => v.id === e.ville)!.nom}</dd></div><div><dt>{t("Total affiché")}</dt><dd>{e.prix}</dd></div></dl>
          <div className="axg-barre"><span /></div>
          <p>{t("En route vers le client")}</p>
        </aside>
        <nav className="axg-chapitres" aria-label={t("Étapes de la visite")}>
          {ETAPES.map((x, i) => <button key={x.ville} type="button" aria-current={i === etape ? "step" : undefined} aria-label={VILLES.find((v) => v.id === x.ville)!.nom} onClick={() => allerVers(x.ville)}><span /></button>)}
        </nav>
        {mode === "3d" && <div className="axg-outils">
          <button type="button" aria-label={t("Zoom avant")} onClick={() => zoomer(1.14)}><Plus size={17} /></button>
          <button type="button" aria-label={t("Zoom arrière")} onClick={() => zoomer(1 / 1.14)}><Minus size={17} /></button>
          {libre && <button type="button" aria-label={t("Reprendre la visite guidée")} onClick={reprendre}><RotateCcw size={16} /></button>}
        </div>}
        {mode === "3d" && !libre && <p className="axg-aide">{t("Faites tourner le globe")}</p>}
      </div>
    </section>
  );
}
