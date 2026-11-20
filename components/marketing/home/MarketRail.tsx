"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/components/I18nProvider";

export function MarketRail({ children }: { children: ReactNode }) {
  const t = useT();
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft < 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); el.removeEventListener("scroll", update); };
  }, []);

  function move(direction: number) {
    const el = rail.current;
    if (!el || el.children.length < 2) return;
    const step = el.children[1].getBoundingClientRect().left - el.children[0].getBoundingClientRect().left;
    el.scrollBy({ left: direction * step, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return <>
    <div className="axm-rail-controls">
      <button type="button" disabled={edges.start} onClick={() => move(-1)} aria-controls="catalogue-exemples" aria-label={t("Produit précédent")}><ChevronLeft size={19} /></button>
      <button type="button" disabled={edges.end} onClick={() => move(1)} aria-controls="catalogue-exemples" aria-label={t("Produit suivant")}><ChevronRight size={19} /></button>
    </div>
    <div id="catalogue-exemples" ref={rail} className="axm-market-rail" role="region" tabIndex={0} aria-label={t("Exemples de produits")}>{children}</div>
  </>;
}
