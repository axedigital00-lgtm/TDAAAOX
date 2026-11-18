// Relances de complétude J+1 / J+3 / J+7 après la publication (B10) : notification dans le dashboard,
// push sur les appareils abonnés (via notifierMarchand) et e-mail, avec un lien direct vers la
// première étape « Pour bien vendre » manquante. Arrêt dès 100 %. Passe dans /api/cron/automatisations.
// Indépendant de lib/relances.ts (relances des clients, inchangées).
import { prisma } from "@/lib/prisma";
import { chargerDemarrage, marquerDemarrage } from "@/lib/demarrage";
import { lireSuivi, relanceDue } from "@/lib/demarrage-regles";
import { messageRelance } from "@/lib/demarrage-messages";
import { notifierMarchand } from "@/lib/notifications-marchand";
import { envoyerRelanceDemarrage } from "@/lib/email";
import { origineAxso } from "@/lib/origine-site";

export async function passeRelancesDemarrage(maintenant = new Date()): Promise<{ envoyees: number }> {
  // ponytail: lit le suivi de toutes les boutiques publiées puis filtre en mémoire ; passer à un filtre
  // JSON Prisma (demarrage.publieeLe) si le nombre de boutiques actives devient grand.
  const boutiques = await prisma.tenant.findMany({
    where: { statut: "active" },
    select: { id: true, nomBoutique: true, email: true, demarrage: true },
  });
  const origine = await origineAxso();
  let envoyees = 0;
  for (const b of boutiques) {
    const suivi = lireSuivi(b.demarrage);
    if (!suivi.publieeLe || suivi.relances?.j7) continue;
    const d = await chargerDemarrage(b.id, maintenant);
    if (!d) continue;
    const k = relanceDue(d.donnees.suivi, d.completude.pourcent, maintenant);
    if (!k) continue;
    const msg = messageRelance(k, d.completude.manquantes, d.completude.pourcent);
    // Marqué avant l'envoi : une relance n'est jamais envoyée deux fois, même si un envoi échoue.
    await marquerDemarrage(b.id, { relances: { ...d.donnees.suivi.relances, [k]: maintenant.toISOString() } });
    if (!msg) continue;
    await Promise.allSettled([
      notifierMarchand({ tenantId: b.id, type: "demarrage", titre: msg.titre, message: msg.message, lien: msg.lien }),
      envoyerRelanceDemarrage({ email: b.email, boutique: b.nomBoutique, titre: msg.titre, message: msg.message, lien: `${origine}${msg.lien}` }),
    ]);
    envoyees++;
  }
  return { envoyees };
}
