"use client";
// Écoute les changements d'une course ; si le flux tombe, l'écran garde son actualisation périodique.
import { useEffect, useRef, useState } from "react";

export function useFluxCourse(id: string | null, surChange: () => void) {
  const [direct, setDirect] = useState(false);
  const rappel = useRef(surChange);
  useEffect(() => { rappel.current = surChange; });
  useEffect(() => {
    if (!id || typeof EventSource === "undefined") return;
    const flux = new EventSource(`/api/logistique/courses/${id}/flux`);
    flux.addEventListener("pret", () => setDirect(true));
    flux.addEventListener("change", () => { if (!document.hidden) rappel.current(); });
    flux.onerror = () => setDirect(false);
    return () => { flux.close(); setDirect(false); };
  }, [id]);
  return direct;
}
