// Vérification des documents : seule une relecture réussie d'un document valide mène à « vérifié ».
import type { StatutVerification } from "./types";

const TRANSITIONS: Record<StatutVerification, StatutVerification[]> = {
  en_attente: ["en_revue"],
  en_revue: ["verifie", "rejete"],
  verifie: ["expire", "suspendu", "en_revue"],
  rejete: ["en_attente"],
  expire: ["en_attente", "en_revue"],
  suspendu: ["en_revue"],
};

export const transitionPermise = (de: StatutVerification, vers: StatutVerification) => TRANSITIONS[de].includes(vers);

export type DocumentDossier = { type: string; statut: StatutVerification; expireLe?: Date | null };

export const documentValide = (d: DocumentDossier, maintenant: Date) =>
  d.statut === "verifie" && (!d.expireLe || d.expireLe > maintenant);

export function documentsManquants(obligatoires: string[], documents: DocumentDossier[], maintenant: Date) {
  return obligatoires.filter((t) => !documents.some((d) => d.type === t && documentValide(d, maintenant)));
}

/** Statut global : jamais « vérifié » s'il manque une pièce obligatoire valide. */
export function statutDossier(obligatoires: string[], documents: DocumentDossier[], maintenant: Date): StatutVerification {
  if (documents.some((d) => d.statut === "suspendu")) return "suspendu";
  if (!obligatoires.length) return "en_attente";
  if (!documentsManquants(obligatoires, documents, maintenant).length) return "verifie";
  const requis = documents.filter((d) => obligatoires.includes(d.type));
  if (requis.some((d) => d.statut === "verifie" && d.expireLe && d.expireLe <= maintenant) || requis.some((d) => d.statut === "expire")) return "expire";
  if (requis.some((d) => d.statut === "rejete")) return "rejete";
  if (requis.some((d) => d.statut === "en_revue")) return "en_revue";
  return "en_attente";
}

/** Documents vérifiés qui expirent dans la fenêtre d'alerte. */
export function documentsBientotExpires<T extends DocumentDossier>(documents: T[], maintenant: Date, jours = 30) {
  const limite = maintenant.getTime() + jours * 86_400_000;
  return documents.filter((d) => documentValide(d, maintenant) && d.expireLe && d.expireLe.getTime() <= limite);
}
