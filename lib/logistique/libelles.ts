// Libellés partagés par les écrans logistiques.
export const STATUTS_COURSE: Record<string, { l: string; tone: "info" | "success" | "warning" | "critical" | "neutral" }> = {
  attente_fournisseur: { l: "À assigner", tone: "warning" }, fournisseur_assigne: { l: "Assignée", tone: "info" }, attente_acceptation: { l: "En attente d'acceptation", tone: "info" },
  acceptee: { l: "Acceptée", tone: "info" }, enlevement_planifie: { l: "Enlèvement planifié", tone: "info" }, enlevee: { l: "Colis enlevé", tone: "info" }, en_transit: { l: "En route", tone: "info" },
  proche_destination: { l: "Proche de la destination", tone: "info" }, livree: { l: "Livrée", tone: "success" }, echec: { l: "Échec", tone: "critical" }, retournee: { l: "Retournée", tone: "warning" }, annulee: { l: "Annulée", tone: "neutral" }, litige: { l: "Litige", tone: "critical" },
};
export const NIVEAUX: Record<string, string> = { elite: "AXSO Elite", premium: "AXSO Premium", verifie: "AXSO Verified", standard: "AXSO Standard" };
export const BADGES: Record<string, string> = { legal: "Légalement vérifié", assurance: "Assurance vérifiée", identite: "Identité vérifiée", haute_performance: "Haute performance", fiabilite: "Très fiable", rapide: "Livraison rapide", satisfaction: "Clients très satisfaits" };
export const VERIFICATION: Record<string, string> = { en_attente: "En attente", en_revue: "En revue", verifie: "Vérifié", rejete: "Rejeté", expire: "Expiré", suspendu: "Suspendu" };
export const DOCUMENTS: Record<string, string> = { registre_commerce: "Registre de commerce", identifiant_fiscal: "Identifiant fiscal", autorisation: "Autorisation d'exploitation", assurance: "Assurance", piece_identite: "Pièce d'identité", permis: "Permis de conduire" };
export const VEHICULES: Record<string, string> = { moto: "Moto", velo: "Vélo", voiture: "Voiture", fourgon: "Fourgon", camion: "Camion", a_pied: "À pied", autre: "Autre" };
export const EVENEMENTS: Record<string, string> = {
  "delivery.requested": "Livraison demandée", "assignment.created": "Fournisseur sollicité", "assignment.accepted": "Course acceptée", "assignment.rejected": "Course refusée", "assignment.timeout": "Pas de réponse à temps", "assignment.cancelled": "Assignation retirée",
  "delivery.enlevement_planifie": "Enlèvement planifié", "delivery.enlevee": "Colis enlevé", "delivery.en_transit": "En route", "delivery.proche_destination": "Proche de la destination", "delivery.completed": "Livrée avec preuve", "delivery.echec": "Échec de livraison", "delivery.retournee": "Colis retourné", "delivery.annulee": "Course annulée",
  "incident.incident": "Incident signalé", "incident.litige": "Litige ouvert", "incident.contestation": "Contestation déposée",
};
export const formatEta = (e: { debut: number; fin: number } | null | undefined, loc = "fr-FR") => {
  if (!e) return "Estimation indisponible";
  const h = (t: number) => new Date(t).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
  return `${h(e.debut)} – ${h(e.fin)}`;
};
