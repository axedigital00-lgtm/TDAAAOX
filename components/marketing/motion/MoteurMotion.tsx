"use client";
// Motion commun au site public : barre de lecture, parallaxe, cartes en relief, boutons
// magnétiques, compteurs et scènes lancées à l'écran. Ne modifie jamais le texte rendu par React ;
// avec « réduire les animations », tout reste affiché et immobile.
import { useEffect, useRef } from "react";

const PARALLAXE = ".axm-hero__image, .axm-case-img, [data-parallaxe]";
const RELIEF = ".axm-card, .axx-carte, .axm-edition";
const AIMANT = ".axm-btn--primary";

export function MoteurMotion() {
  const barre = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const racine = document.querySelector<HTMLElement>(".axm-page");
    if (!racine) return;
    const scenes = new IntersectionObserver((es) => { for (const e of es) e.target.toggleAttribute("data-joue", e.isIntersecting); }, { rootMargin: "10% 0px" });
    racine.querySelectorAll(".axs").forEach((s) => scenes.observe(s));
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      racine.querySelectorAll<HTMLElement>("[data-compte]").forEach((el) => { el.textContent = el.dataset.compte ?? el.textContent; });
      return () => scenes.disconnect();
    }

    const compteurs = new IntersectionObserver((es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        compteurs.unobserve(e.target);
        const el = e.target as HTMLElement, fin = Number(el.dataset.compte), suffixe = el.dataset.suffixe ?? "", debut = performance.now();
        if (!Number.isFinite(fin)) continue;
        const pas = (m: number) => { const p = Math.min(1, (m - debut) / 1300), v = Math.round(fin * (1 - Math.pow(1 - p, 4))); el.textContent = `${v}${suffixe}`; if (p < 1) requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      }
    }, { threshold: .5 });
    racine.querySelectorAll("[data-compte]").forEach((c) => compteurs.observe(c));

    const visibles = new Set<HTMLElement>();
    const para = new IntersectionObserver((es) => { for (const e of es) e.isIntersecting ? visibles.add(e.target as HTMLElement) : visibles.delete(e.target as HTMLElement); }, { rootMargin: "80px" });
    racine.querySelectorAll<HTMLElement>(PARALLAXE).forEach((el) => para.observe(el));
    let raf = 0;
    const cadre = () => {
      raf = 0;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (barre.current) barre.current.style.transform = `scaleX(${h > 0 ? window.scrollY / h : 0})`;
      const vh = window.innerHeight;
      for (const el of visibles) {
        const r = el.getBoundingClientRect(), p = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.setProperty("--axp", `${(p * -22).toFixed(1)}px`);
      }
    };
    const defile = () => { if (!raf) raf = requestAnimationFrame(cadre); };
    window.addEventListener("scroll", defile, { passive: true });
    window.addEventListener("resize", defile, { passive: true });
    cadre();

    const fin = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const bouge = (ev: PointerEvent) => {
      const cible = ev.target as Element | null;
      const carte = cible?.closest?.<HTMLElement>(RELIEF);
      if (carte) {
        const r = carte.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        carte.style.setProperty("--axx", `${(x * 100).toFixed(1)}%`); carte.style.setProperty("--axy", `${(y * 100).toFixed(1)}%`);
        carte.style.setProperty("--axrx", `${((.5 - y) * 4.5).toFixed(2)}deg`); carte.style.setProperty("--axry", `${((x - .5) * 5.5).toFixed(2)}deg`);
        carte.dataset.survol = "1";
      }
      const b = cible?.closest?.<HTMLElement>(AIMANT);
      if (b) { const r = b.getBoundingClientRect(); b.style.setProperty("--axmx", `${((ev.clientX - r.left - r.width / 2) * .16).toFixed(1)}px`); b.style.setProperty("--axmy", `${((ev.clientY - r.top - r.height / 2) * .22).toFixed(1)}px`); }
    };
    const sort = (ev: PointerEvent) => {
      const el = ev.target as Element | null;
      if (el?.matches?.(RELIEF)) { const c = el as HTMLElement; c.style.removeProperty("--axrx"); c.style.removeProperty("--axry"); delete c.dataset.survol; }
      if (el?.matches?.(AIMANT)) { const b = el as HTMLElement; b.style.removeProperty("--axmx"); b.style.removeProperty("--axmy"); }
    };
    if (fin) { racine.addEventListener("pointermove", bouge, { passive: true }); racine.addEventListener("pointerout", sort, { passive: true }); }

    return () => {
      scenes.disconnect(); compteurs.disconnect(); para.disconnect(); cancelAnimationFrame(raf);
      window.removeEventListener("scroll", defile); window.removeEventListener("resize", defile);
      racine.removeEventListener("pointermove", bouge); racine.removeEventListener("pointerout", sort);
    };
  }, []);
  return <div className="axm-lecture" aria-hidden><div ref={barre} /></div>;
}

/** Texte qui s'éclaire mot à mot au défilement. */
export function TexteLumiere({ texte }: { texte: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mots = Array.from(el.querySelectorAll<HTMLElement>("span"));
    el.dataset.pret = "1";
    let raf = 0;
    const cadre = () => {
      raf = 0;
      const r = el.getBoundingClientRect(), vh = window.innerHeight, p = Math.min(1, Math.max(0, (vh * .86 - r.top) / (r.height + vh * .42)));
      mots.forEach((m, i) => m.style.setProperty("--o", String(Math.min(1, Math.max(.16, (p * mots.length - i) * .9 + .16)))));
    };
    const defile = () => { if (!raf) raf = requestAnimationFrame(cadre); };
    window.addEventListener("scroll", defile, { passive: true });
    cadre();
    return () => { window.removeEventListener("scroll", defile); cancelAnimationFrame(raf); };
  }, []);
  return <p ref={ref} className="axx-lumiere" aria-label={texte}>{texte.split(" ").map((m, i) => <span key={i} aria-hidden>{m} </span>)}</p>;
}
