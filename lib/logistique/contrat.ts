// Contrat de versement généré par AXSO pour chaque transporteur. Le texte signé est figé et horodaté.
import { createHash } from "crypto";

export const VERSION_CONDITIONS = "2026-11";
export type IdentiteAxso = { raisonSociale: string; siege: string; registre: string; droit: string };
export type PartieContrat = { type: string; nom: string; raisonSociale?: string | null; registre?: string | null; identifiantFiscal?: string | null; adresseLegale?: string | null; telephone: string; pays: string };

export function identiteAxso(env: Record<string, string | undefined> = process.env): IdentiteAxso | null {
  const raisonSociale = env.AXSO_RAISON_SOCIALE?.trim(), siege = env.AXSO_SIEGE?.trim(), registre = env.AXSO_REGISTRE?.trim(), droit = env.AXSO_DROIT_APPLICABLE?.trim();
  return raisonSociale && siege && registre && droit ? { raisonSociale, siege, registre, droit } : null;
}

const CORRESPONDANTS: Record<string, Record<string, string>> = {
  CM: { MTN: "MTN_MOMO_CMR", ORANGE: "ORANGE_CMR" }, CI: { MTN: "MTN_MOMO_CIV", ORANGE: "ORANGE_CIV" },
  SN: { ORANGE: "ORANGE_SEN", FREE: "FREE_SEN" }, BJ: { MTN: "MTN_MOMO_BEN", MOOV: "MOOV_BEN" },
};
const INDICATIFS: Record<string, string> = { CM: "237", CI: "225", SN: "221", BJ: "229" };

/** Lit « MTN 690000000 » : opérateur et numéro international. Null si le compte ne peut pas recevoir de versement. */
export function lireCompte(texte: string | null | undefined, pays: string) {
  const t = (texte ?? "").toUpperCase(), operateur = ["MTN", "ORANGE", "MOOV", "FREE"].find((o) => t.includes(o));
  const chiffres = t.replace(/\D/g, ""), indicatif = INDICATIFS[pays];
  if (!operateur || !indicatif || chiffres.length < 8) return null;
  const correspondant = CORRESPONDANTS[pays]?.[operateur];
  if (!correspondant) return null;
  return { correspondant, numero: chiffres.startsWith(indicatif) ? chiffres : indicatif + chiffres };
}

export function genererContrat(f: PartieContrat, axso: IdentiteAxso, tauxCommission: number) {
  const pct = `${Math.round(tauxCommission * 1000) / 10} %`;
  const partie = f.type === "societe"
    ? `${f.raisonSociale || f.nom}, société immatriculée sous le n° ${f.registre || "non renseigné"}, identifiant fiscal ${f.identifiantFiscal || "non renseigné"}, dont le siège est situé ${f.adresseLegale || "à l'adresse déclarée sur AXSO"}`
    : `${f.nom}, livreur indépendant exerçant en son nom propre`;
  const texte = `CONTRAT DE PRESTATION ET DE VERSEMENT — conditions ${VERSION_CONDITIONS}

ENTRE
${axso.raisonSociale}, ${axso.registre}, dont le siège est situé ${axso.siege} (« AXSO »),
ET
${partie}, joignable au ${f.telephone}, pays ${f.pays} (« le Transporteur »).

Article 1 — Objet
Le présent contrat fixe les conditions dans lesquelles le Transporteur reçoit des courses par le réseau AXSO et perçoit le versement de ses prestations.

Article 2 — Indépendance
Le Transporteur agit en professionnel indépendant. Le contrat ne crée ni lien de subordination, ni contrat de travail, ni société entre les parties. Le Transporteur reste libre d'accepter ou de refuser une course.

Article 3 — Obligations du Transporteur
Le Transporteur détient les autorisations, assurances et documents exigés pour son activité et les maintient valides. Il exécute les courses acceptées avec soin, enregistre les preuves de livraison demandées et signale tout incident sans délai.

Article 4 — Prix et commission
Le prix d'une course résulte du tarif publié par le Transporteur au moment du devis. AXSO retient une commission de ${pct} sur ce prix. Le montant net est indiqué au Transporteur avant l'acceptation de la course.

Article 5 — Versements
Les sommes dues pour les courses livrées avec preuve sont regroupées en lots de règlement. Si le Transporteur active les versements automatiques, AXSO les envoie sur le compte Mobile Money qu'il a déclaré. Le Transporteur est responsable de l'exactitude de ce compte.

Article 6 — Litiges sur une course
Une course en litige est exclue du versement jusqu'à sa résolution. Le Transporteur peut contester une décision depuis son portail. Toute décision est motivée et journalisée.

Article 7 — Données personnelles
Le Transporteur utilise les données des clients uniquement pour exécuter la course. Il ne les conserve pas au-delà et ne les communique à aucun tiers. La position n'est partagée que pendant la course.

Article 8 — Suspension et résiliation
AXSO peut suspendre l'accès en cas de document expiré, de fraude ou de manquement grave, en indiquant le motif. Chaque partie peut mettre fin au contrat à tout moment. Les sommes dues pour les courses déjà livrées restent versées.

Article 9 — Responsabilité
Chaque partie répond des dommages causés par sa faute. Le Transporteur répond des colis qu'il a pris en charge, jusqu'à leur remise, dans les limites prévues par la loi applicable.

Article 10 — Droit applicable
Le contrat est soumis à : ${axso.droit}. Les parties cherchent une solution amiable avant toute action.

Article 11 — Signature électronique
Le Transporteur accepte le contrat en saisissant son nom et en validant depuis son compte AXSO. La date, le compte signataire et l'empreinte du texte sont conservés comme preuve.`;
  return { texte, empreinte: createHash("sha256").update(texte).digest("hex"), tauxCommission, conditions: VERSION_CONDITIONS };
}
