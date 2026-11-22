// Règles de confidentialité de la géolocalisation : pures, partagées par toutes les routes de suivi.
// Une position n'existe que pendant une course en route, et un lien client finit par expirer.
export const STATUT_EN_ROUTE = "expediee";
export const DUREE_LIEN_SUIVI_JOURS = 30;
const TERMINES = new Set(["livree", "annulee", "remboursee"]);

/** Coordonnées valides, ou null. 0,0 est le signe d'un GPS sans signal, pas une vraie position. */
export function lirePosition(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
}

export const positionPartageable = (statut: string) => statut === STATUT_EN_ROUTE;

/** Vrai quand la commande est terminée depuis plus longtemps que la durée du lien. */
export function lienSuiviExpire(c: { statut: string; livreeAt?: Date | string | null; updatedAt?: Date | string | null }, maintenant: Date) {
  if (!TERMINES.has(c.statut)) return false;
  const fin = c.livreeAt ?? c.updatedAt;
  if (!fin) return false;
  return maintenant.getTime() - new Date(fin).getTime() > DUREE_LIEN_SUIVI_JOURS * 86_400_000;
}

const PERSONNEL = ["clientNom", "adresseExacte", "adresseLivraison", "ville", "pays", "latitudeClient", "longitudeClient", "mapsLienClient", "livreurNom", "livreurTelephone", "livreur", "codeLivraison", "lignes", "montantTotal"] as const;

/** Vue d'un lien client : jamais de position hors trajet ; lien expiré = plus aucune donnée personnelle. */
export function vueSuiviClient<T extends { statut: string; livreurPosition?: unknown; livreeAt?: Date | string | null; updatedAt?: Date | string | null }>(c: T, maintenant: Date): T & { lienExpire: boolean } {
  const vue: Record<string, unknown> = { ...c, livreurPosition: positionPartageable(c.statut) ? c.livreurPosition ?? null : null };
  const lienExpire = lienSuiviExpire(c, maintenant);
  if (lienExpire) for (const k of PERSONNEL) if (k in vue) vue[k] = k === "lignes" ? [] : null;
  return { ...vue, lienExpire } as T & { lienExpire: boolean };
}

/** Fiche d'un livreur indépendant vue par un marchand : contact et position seulement pendant une course pour lui. */
export function vueLivreurPlateforme<T extends { id: string; telephone?: string | null; latitude?: number | null; longitude?: number | null; positionAt?: Date | string | null }>(
  l: T, coursesDuMarchand: Set<string>, enRoutePourLeMarchand: Set<string>,
) {
  const position = enRoutePourLeMarchand.has(l.id);
  return {
    ...l,
    telephone: coursesDuMarchand.has(l.id) ? l.telephone ?? null : null,
    latitude: position ? l.latitude ?? null : null,
    longitude: position ? l.longitude ?? null : null,
    positionAt: position ? l.positionAt ?? null : null,
  };
}
