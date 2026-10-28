import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Compte connecté de l'espace affilié. Chaque page l'appelle : Next exécute la page en même temps
// que le layout, la redirection du layout ne suffit pas à la protéger.
export async function compteAffilie() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; name?: string | null; role?: string } | undefined;
  if (!user?.id) redirect("/connexion?callbackUrl=/affilie");
  if (user.role === "livreur") redirect("/livreur");
  return { ...user, id: user.id };
}
