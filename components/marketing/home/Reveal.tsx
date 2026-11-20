"use client";
// Apparition au défilement (titres, cartes, images) : fondu et légère montée.
// Sans JavaScript ou avec « réduire les animations », tout reste visible.
import { useEffect } from "react";

const CIBLES = ".axm-h2, .axm-h3, .axm-card, .axm-stat, .axm-checkout, .axm-img, .axm-logos, .axm-story__message, .axm-lead";

export function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const racine = document.querySelector(".axm-page");
    if (!racine) return;
    const elements = Array.from(racine.querySelectorAll<HTMLElement>(CIBLES)).filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    elements.forEach((el) => el.classList.add("axm-reveal"));
    const obs = new IntersectionObserver((entrees) => {
      for (const e of entrees) if (e.isIntersecting) { e.target.classList.add("axm-in"); obs.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    elements.forEach((el) => obs.observe(el));
    return () => {
      obs.disconnect();
      elements.forEach(el => el.classList.remove("axm-reveal", "axm-in"));
    };
  }, []);
  return null;
}
