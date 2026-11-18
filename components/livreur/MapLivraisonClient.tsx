"use client";
import dynamic from "next/dynamic";

const MapLivraison = dynamic(
  () => import("@/components/livreur/MapLivraison").then(m => m.MapLivraison),
  { ssr: false }
);

interface Props {
  adresse: string;
  ville: string;
  latitude?: number | null;
  longitude?: number | null;
  livreurLat?: number | null;
  livreurLng?: number | null;
}

export function MapLivraisonClient({ adresse, ville, latitude, longitude, livreurLat, livreurLng }: Props) {
  return (
    <MapLivraison
      adresse={adresse}
      ville={ville}
      latitude={latitude}
      longitude={longitude}
      livreurLat={livreurLat ?? undefined}
      livreurLng={livreurLng ?? undefined}
    />
  );
}
