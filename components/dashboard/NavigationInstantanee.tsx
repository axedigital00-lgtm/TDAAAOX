"use client";
// Retour immédiat au toucher d'un lien : barre de progression pendant le chargement de la page.
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function lienInterne(e: MouseEvent | React.MouseEvent, origine: string, cheminActuel: string) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || a.target === "_blank" || a.hasAttribute("download")) return false;
  const u = new URL(a.href, origine);
  return u.origin === origine && u.pathname !== cheminActuel;
}

export function NavigationInstantanee() {
  const chemin = usePathname();
  const recherche = useSearchParams();
  const [actif, setActif] = useState(false);
  useEffect(() => { setActif(false); }, [chemin, recherche]);
  useEffect(() => {
    const clic = (e: MouseEvent) => { if (lienInterne(e, location.origin, location.pathname)) setActif(true); };
    document.addEventListener("click", clic, true); // avant Link, qui annule le clic natif
    return () => document.removeEventListener("click", clic, true);
  }, []);
  useEffect(() => {
    if (!actif) return;
    const fin = setTimeout(() => setActif(false), 12_000);
    return () => clearTimeout(fin);
  }, [actif]);
  if (!actif) return null;
  return <div role="progressbar" aria-label="Chargement de la page" className="axd-nav-progress"><i /></div>;
}
