// Étapes d'activation d'un transporteur, de la création du compte à la première course.
export const DOCUMENTS_OBLIGATOIRES: Record<string, string[]> = { societe: ["registre_commerce", "identifiant_fiscal"], livreur: ["piece_identite"] };

export const TAUX_COMMISSION_DEFAUT = 0.1;

/** Exemple affiché au transporteur : prix d'une course et montant net après commission. */
export function apercuGain(t: { base: number; parKm: number; enlevement: number }, km = 5) {
  const prix = Math.round(t.base + t.enlevement + t.parKm * km);
  return { km, prix, net: prix - Math.round(prix * TAUX_COMMISSION_DEFAUT) };
}

type Dossier = { type: string; statutLegal: string; disponible: boolean; documents: { type: string; statut: string }[] };

/** Documents obligatoires à déposer : un document rejeté ou expiré est à renvoyer. */
export const documentsManquants = (f: Pick<Dossier, "type" | "documents">) =>
  (DOCUMENTS_OBLIGATOIRES[f.type] ?? []).filter((t) => !f.documents.some((d) => d.type === t && ["en_revue", "verifie"].includes(d.statut)));

/** Vrai au dépôt qui complète le dossier : une seule alerte, et de nouveau après un document rejeté puis renvoyé. */
export const dossierVientDEtreComplet = (type: string, avant: { type: string; statut: string }[], apres: { type: string; statut: string }[]) =>
  documentsManquants({ type, documents: avant }).length > 0 && documentsManquants({ type, documents: apres }).length === 0;

export function etapesTransporteur(f: Dossier) {
  const etapes = [
    { id: "compte", libelle: "Compte créé", fait: true },
    { id: "profil", libelle: "Profil complété", fait: true },
    { id: "documents", libelle: "Documents envoyés", fait: documentsManquants(f).length === 0 },
    { id: "validation", libelle: "Dossier validé par AXSO", fait: f.statutLegal === "verifie" },
    { id: "disponible", libelle: "Disponible pour des courses", fait: f.disponible },
  ];
  return { etapes, prochaine: etapes.find((e) => !e.fait)?.id ?? null };
}
