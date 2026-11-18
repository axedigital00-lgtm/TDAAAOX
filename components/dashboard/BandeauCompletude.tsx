// Bandeau de complétude du Tableau de bord (PROMPT MISSION B10) : données réelles (lib/demarrage.ts),
// affichage et « Plus tard » côté client (BandeauCompletudeVue). Badge « Boutique complète » à 100 %.
import { auth } from "@/lib/auth";
import { permissionsSession } from "@/lib/permissions-server";
import { etatCompletude } from "@/lib/demarrage";
import { BandeauCompletudeVue } from "@/components/dashboard/BandeauCompletudeVue";

export async function BandeauCompletude() {
  const session = await auth();
  const tenantId = (session?.user as any)?.tenantId as string | undefined;
  // Les étapes se règlent dans la boutique : réservé à qui peut la modifier.
  if (!tenantId || (await permissionsSession(session)).boutique !== "ecriture") return null;
  const etat = await etatCompletude(tenantId);
  return etat ? <BandeauCompletudeVue etat={etat} /> : null;
}
