"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/components/I18nProvider";

const etapes = [
  { titre: "Ajoutez vos produits", detail: "Photos, prix et stock, ou import depuis un fichier Excel.", photo: "fiche", cadre: "50% 48%" },
  { titre: "Personnalisez votre boutique", detail: "Un thème, vos couleurs, votre logo.", photo: "vitrine", cadre: "75% 42%" },
  { titre: "Recevez vos commandes", detail: "Sur votre site, sur WhatsApp et en magasin.", photo: "commande", cadre: "60% 50%" },
];

function ApercuEtape({ index }: { index: number }) {
  const t = useT();
  const entetes = ["Fiche produit", "Aperçu de la vitrine", "Nouvelle commande"];
  return <div className="axm-launch__demo">
    <div className="axm-launch__chrome">{t(entetes[index])}</div>
    <div className="axm-launch__sheet">
      {index === 0 && <>
        <small>{t("Nom du produit")}</small><strong>{t("Eau de parfum Ambre")}</strong>
        <dl><div><dt>{t("Prix")}</dt><dd>18 500 FCFA</dd></div>
          <div><dt>{t("Stock disponible")}</dt><dd>12</dd></div></dl>
      </>}
      {index === 1 && <>
        <small>Maison Ambre</small><strong className="axm-launch__serif">{t("Les parfums de la maison")}</strong>
        <div className="axm-launch__palette"><i /><i /><i /></div>
        <span>{t("Collection en ligne")}</span>
      </>}
      {index === 2 && <>
        <small>{t("Commande")} #1001</small><strong>{t("À préparer")}</strong>
        <dl><div><dt>{t("Eau de parfum Ambre")}</dt><dd>× 1</dd></div>
          <div><dt>{t("Total")}</dt><dd>18 500 FCFA</dd></div></dl>
      </>}
    </div>
  </div>;
}

export function LaunchStory() {
  const t = useT();
  const section = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    el.dataset.animated = "true";
    const preference = matchMedia("(min-width: 760px) and (min-height: 540px) and (prefers-reduced-motion: no-preference)");
    const steps = Array.from(el.querySelectorAll<HTMLElement>(".axm-launch__step"));
    const frames = Array.from(el.querySelectorAll<HTMLElement>(".axm-launch__frame"));
    let raf = 0;
    let visible = false;

    function draw() {
      raf = 0;
      if (!preference.matches) return;
      const center = window.innerHeight * .52;
      const rects = steps.map(step => step.getBoundingClientRect());
      const centers = rects.map(r => r.top + r.height / 2);
      const clamp = (n: number) => Math.min(1, Math.max(0, n));
      frames.forEach((frame, i) => {
        const mix = i === 0 ? 1 : clamp(((center - centers[i - 1]) / (centers[i] - centers[i - 1]) - .22) / .57);
        const eased = mix * mix * (3 - 2 * mix);
        frame.style.setProperty("--cut", ((1 - eased) * 100).toFixed(2) + "%");
        const offset = clamp((center - centers[i]) / rects[i].height + .5);
        frame.style.setProperty("--travel", ((.5 - offset) * 4).toFixed(2) + "%");
      });
    }

    function queue() {
      if (visible && preference.matches && !raf) raf = requestAnimationFrame(draw);
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; queue(); });
    observer.observe(el);
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    preference.addEventListener("change", queue);
    return () => {
      delete el.dataset.animated;
      observer.disconnect();
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      preference.removeEventListener("change", queue);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div className="axm-launch" ref={section}>
    <div className="axm-launch__stage" aria-hidden="true">
      {etapes.map(({ photo, cadre }, i) => <div key={photo} className="axm-launch__frame">
        <img src={`/editorial/${photo}.webp`} alt="" loading="lazy" style={{ objectPosition: cadre }} />
        <ApercuEtape index={i} />
      </div>)}
    </div>
    <ol className="axm-launch__steps">
      {etapes.map(({ titre, detail, photo, cadre }, i) => <li key={titre} className="axm-launch__step">
        <div className="axm-launch__inline" aria-hidden="true"><img loading="lazy" src={`/editorial/${photo}.webp`} alt="" style={{ objectPosition: cadre }} /><ApercuEtape index={i} /></div>
        <div><span className="axm-launch__index" aria-hidden="true">0{i + 1} / 03</span>
          <h3 className="axm-h3">{t(titre)}</h3>
          <p className="axm-lead">{t(detail)}</p>
        </div>
      </li>)}
    </ol>
  </div>;
}
