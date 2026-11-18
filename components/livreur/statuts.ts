// Libellés et couleurs des statuts de course dans l'espace livreur : une seule définition
// pour l'accueil, l'historique et la fiche (avant : trois copies aux libellés différents).
import { PAIEMENT } from "@/lib/commandes";

// Même liste que estCOD (lib/gains-livreur.ts), recopiée : ce fichier sert aussi côté client et
// lib/gains-livreur importe Prisma.
const COD = ["whatsapp_cod", "direct_cod"];

// `aide` : ce qui se passe maintenant et ce que le livreur doit faire (fiche d'une course).
export const STATUTS_LIVREUR: Record<string, { label: string; color: string; aide: string }> = {
  confirmee:         { label: "À récupérer",    color: "#d4d4d4", aide: "Récupérez le colis à la boutique, puis touchez « Démarrer la livraison »." },
  en_preparation:    { label: "En préparation", color: "#a78bfa", aide: "La boutique prépare le colis. Démarrez la livraison quand vous l'avez en main." },
  expediee:          { label: "En livraison",   color: "#F5A623", aide: "Le client suit votre position. À la remise, confirmez la livraison ; sinon signalez un échec." },
  tentative_echouee: { label: "À retenter",     color: "#f87171", aide: "La dernière tentative a échoué. Contactez le client puis redémarrez la livraison." },
  livree:            { label: "Livrée",         color: "#34d399", aide: "Course terminée. Rien d'autre à faire." },
  annulee:           { label: "Annulée",        color: "#ef4444", aide: "La boutique a annulé cette commande : ne la livrez pas." },
};

export const statutLivreur = (statut: string) => STATUTS_LIVREUR[statut] ?? { label: statut, color: "#d4d4d4", aide: "" };

/** Ce que le livreur doit encaisser à la porte : espèces (COD), rien (déjà payé), ou inconnu (on n'affiche rien). */
export function encaissement(c: { methodePaiement: string; paiementStatut: string }): "especes" | "deja_paye" | null {
  if (COD.includes(c.methodePaiement)) return c.paiementStatut === PAIEMENT.PAYE ? "deja_paye" : "especes";
  return c.paiementStatut === PAIEMENT.PAYE ? "deja_paye" : null;
}

type Lieu = { adresseLivraison: string; ville: string; adresseExacte?: string | null; mapsLienClient?: string | null; latitudeClient?: number | null; longitudeClient?: number | null };

/** Adresse la plus précise donnée par le client. */
export const adresseCourse = (c: Lieu) => c.adresseExacte?.trim() || c.adresseLivraison;

/** Itinéraire : point GPS du client, sinon son lien Maps, sinon recherche par adresse. */
export function lienItineraire(c: Lieu) {
  if (c.latitudeClient != null && c.longitudeClient != null) return `https://www.google.com/maps/dir/?api=1&destination=${c.latitudeClient},${c.longitudeClient}`;
  if (c.mapsLienClient?.startsWith("https://")) return c.mapsLienClient;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${adresseCourse(c)}, ${c.ville}`)}`;
}
