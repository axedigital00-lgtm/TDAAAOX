"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";

export function FilmAmbiance({ nom, description }: { nom: string; description: string }) {
  const t = useT();
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [autorise, setAutorise] = useState(false);
  const [lecture, setLecture] = useState(false);
  useEffect(() => {
    const film = ref.current;
    if (!film) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const connexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const appliquer = () => setAutorise(!preference.matches && !connexion?.saveData);
    let dansEcran = false;
    const actualiser = () => setVisible(dansEcran && !document.hidden);
    const obs = new IntersectionObserver(([entree]) => { dansEcran = entree.isIntersecting; actualiser(); }, { threshold: .15 });
    appliquer();
    obs.observe(film);
    preference.addEventListener("change", appliquer);
    document.addEventListener("visibilitychange", actualiser);
    return () => {
      obs.disconnect();
      preference.removeEventListener("change", appliquer);
      document.removeEventListener("visibilitychange", actualiser);
    };
  }, []);

  useEffect(() => {
    const film = ref.current;
    if (!film) return;
    if (!visible || !autorise) { film.pause(); return; }
    if (!film.hasAttribute("src")) film.src = "/editorial/" + nom + ".mp4";
    let actif = true;
    film.play().catch(() => { if (actif) setAutorise(false); });
    return () => { actif = false; };
  }, [autorise, visible, nom]);

  return <div className="axm-loop">
    <video ref={ref} muted playsInline loop preload="none" poster={"/editorial/" + nom + ".webp"}
      aria-label={t(description)} onPlay={() => setLecture(true)} onPause={() => setLecture(false)} />
    <button type="button" aria-label={t(lecture ? "Mettre en pause" : "Lire l’animation") + " · " + t(description)}
      onClick={() => setAutorise(!lecture)}>{lecture ? <Pause size={16} /> : <Play size={16} />}</button>
  </div>;
}

