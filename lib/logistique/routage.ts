// Itinéraires routiers par un serveur OSRM auto-hébergé (open source, données OpenStreetMap).
// Sans ROUTAGE_URL, ou si le serveur ne répond pas, AXSO garde la distance à vol d'oiseau.
import type { Point } from "./suivi";

export type Itineraire = { distanceM: number; dureeS: number; trace: [number, number][] };
const DELAI_MS = 2500, DUREE_CACHE_MS = 120_000, TAILLE_CACHE = 500;
const cache = new Map<string, { expire: number; valeur: Itineraire }>();

export const cleItineraire = (points: Point[]) => points.map((p) => `${p.lng.toFixed(4)},${p.lat.toFixed(4)}`).join(";");

export function lireReponseOsrm(d: unknown): Itineraire | null {
  const r = (d as { code?: string; routes?: { distance?: number; duration?: number; geometry?: { coordinates?: [number, number][] } }[] })?.code === "Ok" ? (d as any).routes?.[0] : null;
  if (!r || !Number.isFinite(r.distance) || !Number.isFinite(r.duration)) return null;
  return { distanceM: Math.round(r.distance), dureeS: Math.round(r.duration), trace: (r.geometry?.coordinates ?? []).map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]) };
}

export async function itineraire(points: Point[], maintenant = Date.now()): Promise<Itineraire | null> {
  const base = process.env.ROUTAGE_URL?.replace(/\/$/, "");
  if (!base || points.length < 2 || points.length > 25) return null;
  const cle = cleItineraire(points), connu = cache.get(cle);
  if (connu && connu.expire > maintenant) return connu.valeur;
  try {
    const r = await fetch(`${base}/route/v1/driving/${cle}?overview=simplified&geometries=geojson&steps=false`, { signal: AbortSignal.timeout(DELAI_MS) });
    if (!r.ok) return null;
    const valeur = lireReponseOsrm(await r.json());
    if (valeur) {
      if (cache.size >= TAILLE_CACHE) cache.delete(cache.keys().next().value!);
      cache.set(cle, { expire: maintenant + DUREE_CACHE_MS, valeur });
    }
    return valeur;
  } catch { return null; }
}
