// Promo de lancement : tant que le compteur tourne, toute boutique profite de l'Illimité
// (lib/abonnement.ts::planActif) et les packs payants sont fermés. Date de fin réglée par
// l'admin (Admin › Réglages, clé « promo » de ReglageAdmin) ; à la fin, tout redevient payant.
// Jamais réglée : la promo démarre à la première lecture (après le déploiement) pour 7 jours pleins.
import { prisma } from "./prisma";
import { SCHEMAS } from "./command-center/reglages";

export const DUREE_PROMO_JOURS = 7;

/** Fin de la promo si elle est encore en cours, sinon null. */
export function promoEnCours(finLe: string | null, maintenant = new Date()): Date | null {
  const fin = finLe ? new Date(finLe) : null;
  return fin && fin > maintenant ? fin : null;
}

// ponytail: cache par instance de 30 s (planActif est appelé partout) ; un changement admin met ≤ 30 s à s'appliquer.
let cache: { finLe: string | null; a: number } | null = null;

/** Date de fin enregistrée (null = promo arrêtée), créée à 7 jours la première fois. */
export async function finLePromo(): Promise<string | null> {
  if (cache && Date.now() - cache.a < 30_000) return cache.finLe;
  let ligne = await prisma.reglageAdmin.findUnique({ where: { cle: "promo" } }).catch(() => null);
  if (!ligne) {
    const finLe = new Date(Date.now() + DUREE_PROMO_JOURS * 86_400_000).toISOString();
    // skipDuplicates : deux premières visites simultanées gardent la même date (la première écrite).
    await prisma.reglageAdmin.createMany({ data: [{ cle: "promo", valeur: { finLe }, majPar: "lancement automatique" }], skipDuplicates: true }).catch(() => {});
    ligne = await prisma.reglageAdmin.findUnique({ where: { cle: "promo" } }).catch(() => null);
  }
  const lu = ligne ? SCHEMAS.promo.safeParse(ligne.valeur) : null;
  const finLe = lu?.success ? lu.data.finLe : null;
  cache = { finLe, a: Date.now() };
  return finLe;
}

export async function finPromo(maintenant = new Date()): Promise<Date | null> {
  return promoEnCours(await finLePromo(), maintenant);
}

/** Après un enregistrement admin : l'instance qui l'a fait applique tout de suite. */
export function oublierPromo() {
  cache = null;
}
