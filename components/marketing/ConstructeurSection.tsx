"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { SECTION, SURTITRE, TITRE, INTRO, BOUTON_NOIR } from "./charte";

// Captures réelles des designs de Templates/ (accueil, 1440×900).
const THEMES_PREVIEW = [
  { nom: "Ignite",       image: "/theme-ignite.webp" },
  { nom: "Noir Atelier", image: "/theme-noir-atelier.webp" },
  { nom: "Pop!",         image: "/theme-pop.webp" },
  { nom: "Codex",        image: "/theme-codex.webp" },
];

const POINTS = [
  "Glisser-déposer, sans code",
  "Sous-sections personnalisées dans chaque bloc",
  "Thèmes adaptés aux marchés africains",
];

export function ConstructeurSection() {
  const tr = useT();
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="fonctionnalites" className={`${SECTION} bg-white overflow-hidden`}>
      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center max-w-[1400px] mx-auto">

          <div style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateX(-24px)", transition: "all 0.8s cubic-bezier(0.23,1,0.32,1)" }}>
            <span className={SURTITRE}>{tr("Constructeur")}</span>
            <h2 className={`${TITRE} mb-5`}>
              {tr("Crée une boutique sur-mesure en 3 minutes")}
            </h2>
            <p className={`${INTRO} mb-8 max-w-lg`}>
              {tr("Des thèmes prêts à vendre, personnalisables jusqu'au moindre détail — sans une ligne de code.")}
            </p>
            <ul className="space-y-3 mb-9">
              {POINTS.map(p => (
                <li key={p} className="flex items-center gap-3 text-[15px] text-gray-700">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#F5A62318" }}>
                    <Check size={11} style={{ color: "#F5A623" }} />
                  </span>
                  {tr(p)}
                </li>
              ))}
            </ul>
            <Link href="/inscription" className={BOUTON_NOIR}>
              {tr("Essayer le constructeur →")}
            </Link>
          </div>

          <div style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateX(24px)", transition: "all 0.8s 0.1s cubic-bezier(0.23,1,0.32,1)" }}>
            <div className="grid grid-cols-2 gap-4">
              {THEMES_PREVIEW.map((t, i) => (
                <Link key={t.nom} href="/themes" className="group rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-white"
                  style={{ animation: visible ? `flip3dIn 0.7s ${i * 100}ms cubic-bezier(0.23,1,0.32,1) both` : "none" }}>
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={t.image} alt={`${tr("Thème")} ${t.nom}`} loading="lazy"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <p className="px-3 py-2.5 text-sm font-bold text-[#111111]">{t.nom}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
