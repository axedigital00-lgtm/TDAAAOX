"use client";

import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";

const canaux = ["En ligne.", "Sur WhatsApp.", "En magasin."];

export function CinemaHero() {
  const t = useT();
  const film = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    const video = film.current;
    if (!video) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const appliquer = () => setActive(!preference.matches && !connection?.saveData);
    appliquer();
    let dansEcran = false;
    const actualiser = () => setVisible(dansEcran && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      dansEcran = entry.isIntersecting;
      actualiser();
    });
    observer.observe(video);
    document.addEventListener("visibilitychange", actualiser);
    preference.addEventListener("change", appliquer);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", actualiser);
      preference.removeEventListener("change", appliquer);
    };
  }, []);

  useEffect(() => {
    const video = film.current;
    if (!video) return;
    if (!active || !visible) {
      video.pause();
      return;
    }
    if (!charge) {
      setCharge(true);
      return;
    }
    let courant = true;
    video.play().catch(() => { if (courant) setActive(false); });
    const interval = window.setInterval(() => setIndex(i => (i + 1) % canaux.length), 3400);
    return () => { courant = false; window.clearInterval(interval); };
  }, [visible, active, charge]);

  return (
    <section className="axm-cinema">
      <video ref={film} aria-hidden="true" className="axm-cinema__film" muted playsInline loop preload="none"
        poster="/editorial/atelier.webp" src={charge ? "/editorial/atelier.mp4" : undefined} />
      <div className="axm-wrap axm-cinema__content">
        <h1 className="axm-display">{t("Vendez partout en Afrique.")}<br />
          <span className="axm-rotator" aria-hidden="true"><span key={index}>{t(canaux[index])}</span></span>
        </h1>
        <p className="axm-lead">{t("Créez votre boutique, recevez les commandes WhatsApp, encaissez en magasin et livrez vos clients, depuis une seule plateforme pensée pour le commerce africain.")}</p>
        <div className="axm-cinema__actions">
          <Link href="/inscription" className="axm-btn axm-btn--primary">{t("Démarrer gratuitement")}</Link>
          <Link href="/tarifs" className="axm-btn axm-btn--secondary">{t("Voir les forfaits")}</Link>
        </div>
        <p className="axm-cinema__note">{t("Sans carte bancaire.")}</p>
      </div>
      <button type="button" className="axm-cinema__control" onClick={() => setActive(!active)}
        aria-label={active ? t("Mettre l’animation en pause") : t("Lire l’animation")}>
        {active ? <Pause size={18} /> : <Play size={18} />}
      </button>
    </section>
  );
}
