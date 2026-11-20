"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface CommandeSuivie {
  numero: string; statut: string; createdAt?: string; livreeAt?: string;
  tenant?: { nomBoutique: string; slug: string; whatsapp?: string; logoUrl?: string };
  montantTotal?: number; devise?: string; echecRaison?: string; codeLivraison?: string;
  adresseExacte?: string; adresseLivraison?: string; ville?: string; mapsLienClient?: string;
  transporteur?: string; numeroSuivi?: string;
  livreurNom?: string; livreurTelephone?: string; livreur?: { nom: string; telephone?: string };
  livreurPosition?: { lat: number; lng: number; updatedAt?: string };
  latitudeClient?: number; longitudeClient?: number;
  lignes?: { produitId?: string; nom: string; variante?: string; quantite: number; prix?: number; imageUrl?: string }[];
}

export function useSuivi(url: string, delai: number) {
  const [commande, setCommande] = useState<CommandeSuivie | null>(null);
  const [erreur, setErreur] = useState("");
  const [actualisation, setActualisation] = useState(false);
  const [verification, setVerification] = useState<Date | null>(null);
  const relire = useRef<() => void>(() => {});
  const actualiser = useCallback(() => relire.current(), []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let occupe = false;
    let fini = false;
    let prochainEssai = 0;

    async function lire() {
      if (occupe || fini || controller.signal.aborted || document.hidden) return;
      clearTimeout(timer);
      if (Date.now() < prochainEssai) {
        timer = setTimeout(lire, prochainEssai - Date.now());
        return;
      }
      occupe = true;
      setActualisation(true);
      try {
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (res.status === 404 || res.status === 410 || res.status === 400) {
          fini = true;
          setCommande(null);
          setErreur(res.status === 410 ? "Ce lien de livraison a expiré." : "Commande introuvable. Vérifiez vos informations de suivi.");
        } else if (res.status === 429) {
          const attente = Number(res.headers.get("Retry-After"));
          prochainEssai = Date.now() + Math.max(delai, Number.isFinite(attente) ? attente * 1000 : 0);
          setErreur("Trop de demandes. Le suivi réessaiera automatiquement.");
        } else {
          if (!res.ok) throw new Error();
          const { commande: resultat } = await res.json();
          if (controller.signal.aborted) return;
          if (!resultat) throw new Error();
          setCommande(resultat);
          setVerification(new Date());
          setErreur("");
          fini = ["livree", "annulee"].includes(resultat.statut);
        }
      } catch {
        if (!controller.signal.aborted) setErreur("Actualisation indisponible. Vérifiez votre connexion.");
      } finally {
        occupe = false;
        if (!controller.signal.aborted) {
          setActualisation(false);
          if (!fini) timer = setTimeout(lire, Math.max(delai, prochainEssai - Date.now()));
        }
      }
    }
    relire.current = lire;
    void lire();
    document.addEventListener("visibilitychange", lire);
    return () => {
      controller.abort(); clearTimeout(timer);
      document.removeEventListener("visibilitychange", lire);
    };
  }, [url, delai]);

  return { commande, erreur, actualisation, verification, actualiser };
}
