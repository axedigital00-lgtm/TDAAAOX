"use client";
import { useT } from "@/components/I18nProvider";
import { MapTracking } from "@/components/storefront/MapTracking";

interface MapLivraisonProps {
  adresse: string; ville: string;
  latitude?: number | null; longitude?: number | null;
  livreurLat?: number | null; livreurLng?: number | null;
}

export function MapLivraison({ adresse, ville, latitude, longitude, livreurLat, livreurLng }: MapLivraisonProps) {
  const t = useT();
  const destination = latitude != null && longitude != null;
  const position = livreurLat != null && livreurLng != null;
  return <section className="rounded-xl overflow-hidden bg-[#171817] border border-white/15">
    <h2 className="px-5 pt-4 pb-2 font-semibold text-white">{t("Suivi de livraison")}</h2>
    <p className="px-5 pb-4 text-sm text-gray-300">{[adresse, ville].filter(Boolean).join(", ")}</p>
    {destination || position ? <MapTracking key={String(latitude) + "/" + String(longitude) + "/" + position} livreurLat={livreurLat} livreurLng={livreurLng}
      clientLat={latitude} clientLng={longitude} livreurNom={t("Vous êtes ici")} /> :
      <p className="px-5 pb-5 text-sm text-gray-300">{t("La carte s’affichera dès qu’une position sera disponible.")}</p>}
  </section>;
}
