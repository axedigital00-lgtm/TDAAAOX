// Lignes « À traiter » (pur, testé par tests/adm-accueil.test.ts) : Tableau de bord et chips de l'Accueil.
import type { compterATraiter } from "./donnees";

export type CompteursATraiter = Awaited<ReturnType<typeof compterATraiter>>;

/** Lignes « À traiter » visibles selon les droits du membre (une liste qu'il ne voit pas n'apparaît pas). */
export function lignesATraiter(c: CompteursATraiter, voit: (m: "commandes" | "produits" | "clients") => boolean) {
  return [
    ...(voit("commandes") ? [
      { cle: "confirmer", nombre: c.aConfirmer, label: "commande(s) à confirmer", chip: "Confirmer les commandes", href: "/dashboard/commandes?statut=en_attente", action: "Confirmer" },
      { cle: "expedier", nombre: c.aExpedier, label: "commande(s) à expédier", chip: "Expédier les commandes", href: "/dashboard/commandes?statut=confirmee,en_preparation", action: "Expédier" },
      { cle: "retours", nombre: c.retours, label: "retour(s) en attente", chip: "Traiter les retours", href: "/dashboard/logistique?tab=retours&filtre=a_traiter", action: "Traiter" },
    ] : []),
    ...(voit("produits") ? [
      { cle: "ruptures", nombre: c.ruptures, label: "produit(s) en rupture de stock", chip: "Réapprovisionner les ruptures", href: "/dashboard/produits?filtre=epuise", action: "Réapprovisionner" },
      { cle: "faible", nombre: c.stockFaible, label: "produit(s) en stock faible (5 ou moins)", chip: "Vérifier les stocks faibles", href: "/dashboard/produits?filtre=faible", action: "Voir" },
    ] : []),
    ...(voit("clients") ? [
      { cle: "messages", nombre: c.messages, label: "message(s) WhatsApp non lu(s)", chip: "Répondre aux messages", href: "/dashboard/whatsapp?filtre=non_lus", action: "Répondre" },
    ] : []),
  ];
}
