"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Radio } from "lucide-react";
import { useT } from "@/components/I18nProvider";

const LiveFleetMapInner = dynamic(
  () => import("./LiveFleetMapInner").then((m) => m.LiveFleetMapInner),
  { ssr: false }
);

interface Livreur {
  id: string;
  nom: string;
  vehicule: string;
  disponible: boolean;
  latitude: number | null;
  longitude: number | null;
  positionAt: string | null;
}

export function LiveFleetMap() {
  const t = useT();
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(true);

  const [erreur, setErreur] = useState(false);
  const [verification, setVerification] = useState<Date | null>(null);

  useEffect(() => {
    let annule = false;
    let enCours = false;
    function charger() {
      if (enCours || document.hidden) return;
      enCours = true;
      fetch("/api/livreurs")
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((d) => { if (!annule) { setLivreurs(d.livreurs ?? []); setVerification(new Date()); setErreur(false); } })
        .catch(() => { if (!annule) setErreur(true); })
        .finally(() => { enCours = false; if (!annule) setLoading(false); });
    }
    charger();
    const interval = setInterval(charger, 20000);
    document.addEventListener("visibilitychange", charger);
    return () => { document.removeEventListener("visibilitychange", charger); annule = true; clearInterval(interval); };
  }, []);

  const positionnes = livreurs.filter((l) => l.latitude != null && l.longitude != null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[360px] bg-gray-50 rounded-2xl border border-gray-100">
        <div className="w-6 h-6 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Radio size={16} />
          {positionnes.length} livreur{positionnes.length !== 1 ? "s" : ""}{" "}{t("en position sur")}{" "}{livreurs.length}
        </div>
        {verification && <span className="text-xs text-gray-600">{t("Dernière vérification")} · {verification.toLocaleTimeString(t.loc)}</span>}
      </div>
      {erreur && <p role="status" className="text-sm text-amber-800">{t("Actualisation indisponible. Vérifiez votre connexion.")}</p>}
      {positionnes.length === 0 ? (
        <div className="grid justify-items-center content-center gap-3 min-h-52 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
          <MapPin size={24} className="text-gray-600" />
          <strong>{t(erreur ? "Position indisponible" : "Aucune position disponible")}</strong>
          <p className="max-w-sm text-sm text-gray-600">{t("La carte s’affichera dès qu’une position sera disponible.")}</p>
        </div>
      ) : (
        <LiveFleetMapInner livreurs={livreurs} />
      )}
    </div>
  );
}
