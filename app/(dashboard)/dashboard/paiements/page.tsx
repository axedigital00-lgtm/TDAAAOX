// Ancienne page « Paiements » : elle doublonnait le wallet (avec un « Solde disponible » faux, séquestre
// compris). Un seul point d'entrée pour l'argent du marchand : « Mon argent » (/dashboard/wallet), onglet
// « Paiements reçus » (paiements des commandes + commissions).
import { redirect } from "next/navigation";

export default function PaiementsPage() {
  redirect("/dashboard/wallet?onglet=paiements");
}
