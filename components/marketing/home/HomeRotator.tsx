"use client";
// Second vers du hero : la fin de phrase change toutes les 2,6 s (désactivé si
// l'utilisateur préfère réduire les animations).
import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";

export function HomeRotator({ mots }: { mots: string[] }) {
  const t = useT();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((v) => (v + 1) % mots.length), 2600);
    return () => clearInterval(id);
  }, [mots.length]);
  return <span className="axm-rotator" aria-live="off"><span key={i}>{t(mots[i])}</span></span>;
}
