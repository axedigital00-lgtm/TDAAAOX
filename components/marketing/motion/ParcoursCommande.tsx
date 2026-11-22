"use client";
// Récit épinglé : le défilement fait avancer une commande, de la vitrine au tableau de bord.
import { useEffect, useRef, useState, type ReactNode } from "react";

export type EtapeParcours = { titre: string; texte: string; scene: ReactNode };

export function ParcoursCommande({ surtitre, etapes }: { surtitre: string; etapes: EtapeParcours[] }) {
  const zone = useRef<HTMLElement>(null);
  const jauge = useRef<HTMLDivElement>(null);
  const [actif, setActif] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const cadre = () => {
      raf = 0;
      const z = zone.current; if (!z) return;
      const r = z.getBoundingClientRect(), course = r.height - window.innerHeight;
      if (course <= 0) return;
      const p = Math.min(1, Math.max(0, -r.top / course));
      if (jauge.current) jauge.current.style.transform = `scaleY(${p})`;
      setActif(Math.min(etapes.length - 1, Math.floor(p * etapes.length)));
    };
    const defile = () => { if (!raf) raf = requestAnimationFrame(cadre); };
    window.addEventListener("scroll", defile, { passive: true });
    window.addEventListener("resize", defile, { passive: true });
    cadre();
    return () => { window.removeEventListener("scroll", defile); window.removeEventListener("resize", defile); cancelAnimationFrame(raf); };
  }, [etapes.length]);

  return <section ref={zone} className="axp" style={{ "--n": etapes.length } as React.CSSProperties}>
    <div className="axp-colle"><div className="axm-wrap axp-grille">
      <div className="axp-texte">
        <p className="axm-eyebrow">{surtitre}</p>
        <div className="axp-rail"><div ref={jauge} /></div>
        <ol>{etapes.map((e, i) => <li key={e.titre} data-actif={i === actif || undefined}><span>0{i + 1}</span><div><h3>{e.titre}</h3><p>{e.texte}</p></div></li>)}</ol>
      </div>
      <div className="axp-ecran">{etapes.map((e, i) => <div key={e.titre} data-actif={i === actif || undefined}>{e.scene}</div>)}</div>
    </div></div>
  </section>;
}
