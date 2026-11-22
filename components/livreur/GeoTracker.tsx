"use client";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { useT } from "@/components/I18nProvider";

interface Props {
  livreurId: string;
  // true quand le livreur a une course "expediee" : seul moment où sa position est partagée
  enLivraison: boolean;
}

const INTERVALLE_FILET_MS = 30_000;     // certains iOS suspendent watchPosition à l'arrêt (feu rouge)
const INTERVALLE_LIVRAISON_MS = 5_000;  // en livraison : au plus un envoi toutes les 5 s

export function GeoTracker({ livreurId, enLivraison }: Props) {
  const t = useT();
  const [etat, setEtat] = useState<"attente" | "partage" | "refuse">("attente");

  useEffect(() => {
    // Hors livraison : aucune lecture GPS, aucun envoi.
    if (!enLivraison || !("geolocation" in navigator)) return;

    let actif = true;
    let dernierEnvoi = 0;
    const envoyer = ({ coords }: GeolocationPosition) => {
      if (!actif) return;
      dernierEnvoi = Date.now();
      setEtat("partage");
      window.dispatchEvent(new CustomEvent("axso:position-livreur", { detail: { lat: coords.latitude, lng: coords.longitude } }));
      fetch(`/api/livreurs/${livreurId}/position`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
      }).catch(() => {});
    };
    const erreur = (e: GeolocationPositionError) => { if (actif && e.code === 1) setEtat("refuse"); };
    const lire = () => navigator.geolocation.getCurrentPosition(envoyer, erreur, { enableHighAccuracy: true, timeout: 10_000 });

    lire();
    const watchId = navigator.geolocation.watchPosition(
      (pos) => { if (Date.now() - dernierEnvoi >= INTERVALLE_LIVRAISON_MS) envoyer(pos); },
      erreur,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    const filet = setInterval(lire, INTERVALLE_FILET_MS);
    return () => { actif = false; navigator.geolocation.clearWatch(watchId); clearInterval(filet); };
  }, [livreurId, enLivraison]);

  if (!enLivraison || etat === "attente") return null;
  return (
    <p role="status" className="flex items-center justify-center gap-2 px-4 py-2 text-[12.5px] font-medium" style={{ background: etat === "partage" ? "rgba(47,191,113,.14)" : "rgba(240,96,93,.16)", color: etat === "partage" ? "#7ee2a8" : "#ffb4b2" }}>
      <MapPin size={14} aria-hidden />
      {etat === "partage" ? t("Position partagée pendant cette livraison") : t("Position non partagée : autorisez la localisation")}
    </p>
  );
}
