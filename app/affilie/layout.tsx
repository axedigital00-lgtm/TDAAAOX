import { compteAffilie } from "./session";
import { lierAffiliationsAuCompte } from "@/lib/affiliation";
import { EspaceAffilieShell } from "@/components/affilie/EspaceAffilieShell";

// Espace affilié : tout compte Axso connecté (affilié, ou marchand qui recommande d'autres boutiques).
export default async function AffilieLayout({ children }: { children: React.ReactNode }) {
  const user = await compteAffilie();
  // Partenariats créés avant les comptes affiliés (même e-mail) : rattachés à la première visite.
  if (user.email) await lierAffiliationsAuCompte(user.id, user.email);
  return <EspaceAffilieShell nom={user.name || user.email || ""}>{children}</EspaceAffilieShell>;
}
