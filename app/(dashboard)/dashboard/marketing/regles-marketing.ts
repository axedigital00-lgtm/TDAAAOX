// Règles pures des pages Croissance (testées dans tests/adm-marketing.test.ts).

/** Action proposée sur un affilié selon son statut : approuver, suspendre ou réactiver. */
export function actionAffilie(statut: string): { statut: "actif" | "suspendu"; label: string; critique: boolean } | null {
  if (statut === "en_attente") return { statut: "actif", label: "Approuver", critique: false };
  if (statut === "actif") return { statut: "suspendu", label: "Suspendre", critique: true };
  if (statut === "suspendu") return { statut: "actif", label: "Réactiver", critique: false };
  return null;
}

/** Ratio en pourcentage (« 2.50 % »), « — » si le dénominateur est nul. */
export function pourcent(n: number, d: number, dec = 2) {
  return d > 0 ? `${((n / d) * 100).toFixed(dec)} %` : "—";
}

/** Filtre « tous » ou valeur exacte, sur plusieurs champs à la fois. */
export function filtrer<T extends object>(lignes: T[], filtres: Partial<Record<keyof T, string>>) {
  return lignes.filter((l) => Object.entries(filtres).every(([k, v]) => !v || v === "tous" || l[k as keyof T] === v));
}
