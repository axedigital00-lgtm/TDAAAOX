import { redirect } from "next/navigation";

// Anciens liens de portail (accès par lien secret, supprimé) : l'espace affilié demande maintenant une connexion.
export default function AncienPortail() {
  redirect("/affilie");
}
