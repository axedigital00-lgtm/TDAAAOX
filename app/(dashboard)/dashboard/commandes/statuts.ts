// Libellés et tons des commandes côté marchand : une seule définition pour la liste,
// la fiche et le sélecteur de statut (avant : trois copies, « Expédiée » ici,
// « En livraison » là). Libellés en français, traduits à l'affichage par t().
// Client-safe (aucun import de Prisma).
import type { Ton } from "@/components/ui";
import { MODES_PAIEMENT } from "@/lib/pos/paiements";

export const STATUTS_COMMANDE: Record<string, { label: string; ton: Ton }> = {
  en_attente:        { label: "En attente",        ton: "attention" },
  confirmee:         { label: "Confirmée",         ton: "info" },
  en_preparation:    { label: "En préparation",    ton: "info" },
  expediee:          { label: "En livraison",      ton: "info" },
  tentative_echouee: { label: "Livraison échouée", ton: "erreur" },
  livree:            { label: "Livrée",            ton: "succes" },
  annulee:           { label: "Annulée",           ton: "neutre" },
};

export const statutCommande = (statut: string) => STATUTS_COMMANDE[statut] ?? { label: statut, ton: "neutre" as Ton };

/** Commandes qui attendent une action du marchand : confirmer, préparer/expédier, relivrer. */
export const STATUTS_A_TRAITER = ["en_attente", "confirmee", "en_preparation", "tentative_echouee"];

const METHODES: Record<string, string> = {
  whatsapp_cod: "À la livraison (WhatsApp)",
  direct_cod: "À la livraison",
  notchpay: "Payé en ligne",
  en_attente: "En ligne, non finalisé",
  mixte: "Paiement mixte",
  offert: "Offert",
};

export const libelleMethodePaiement = (m: string) =>
  METHODES[m] ?? (MODES_PAIEMENT as Record<string, { libelle: string }>)[m]?.libelle ?? m;

export const STATUTS_PAIEMENT: Record<string, { label: string; ton: Ton }> = {
  completed: { label: "Payé",                   ton: "succes" },
  pending:   { label: "Non payé",               ton: "attention" },
  failed:    { label: "Paiement échoué",        ton: "erreur" },
  refunded:  { label: "Remboursé",              ton: "neutre" },
  refunding: { label: "Remboursement en cours", ton: "attention" },
};

export const statutPaiement = (s: string) => STATUTS_PAIEMENT[s] ?? { label: s, ton: "neutre" as Ton };
