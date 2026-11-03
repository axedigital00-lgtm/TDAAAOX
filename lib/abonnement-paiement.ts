// Abonnements : prix des paliers, devise de facturation, lecture des références des anciens
// paiements (historique) et rappels d'échéance. Pas de paiement en ligne pour l'instant.
import { prisma } from "./prisma";
import { rappelEcheanceDu } from "./abonnement-regles";
import { boutiquesDuMemeCompte } from "./abonnement";
import { NOMS_PALIERS, palierAuMoins, type Palier } from "./plans";
import { envoyerRappelEssai } from "./email";
import { pousserMarchands } from "./push";
import { finPromo } from "./promo";

export const PALIER_PRIX: Record<string, number> = { palier1: 6000, palier2: 20000 };
const JOUR = 24 * 3600 * 1000;

/** Devise de facturation : XOF pour une boutique d'Afrique de l'Ouest (même prix, parité fixe 1 XOF = 1 XAF),
 *  sinon XAF. Avant, tout le monde payait en XAF, même au Sénégal ou en Côte d'Ivoire. */
export const deviseAbonnement = (deviseBoutique?: string | null) => (deviseBoutique?.toUpperCase() === "XOF" ? "XOF" : "XAF");

/** Référence marchande SUB-{tenantId}-{plan}-{horodatage} → boutique et palier. */
export function lireRefAbonnement(ref: string): { tenantId: string; plan: string } | null {
  const [prefixe, tenantId, plan] = ref.split("-");
  return prefixe === "SUB" && tenantId && PALIER_PRIX[plan] ? { tenantId, plan } : null;
}

// ─── Rappels d'échéance ───────────────────────────────────────────────────────

/** Tâche quotidienne : rappel 3 jours avant l'échéance du palier payé, puis le jour même (e-mail +
 *  notification), une fois chacun (Tenant.planRappel, remis à null à chaque paiement). */
export async function passeRappelsAbonnement(maintenant = new Date()): Promise<{ envoyes: number }> {
  // Promo de lancement : le renouvellement est fermé (tout est offert), on ne demande pas de payer.
  if (await finPromo(maintenant)) return { envoyes: 0 };
  const boutiques = await prisma.tenant.findMany({
    where: {
      planType: { in: ["palier1", "palier2"] },
      planExpiresAt: { gt: new Date(maintenant.getTime() - 2 * JOUR), lte: new Date(maintenant.getTime() + 3 * JOUR) },
      OR: [{ planRappel: null }, { planRappel: "j3" }],
    },
    select: { id: true, nomBoutique: true, email: true, planType: true, planExpiresAt: true, planRappel: true },
  });
  let envoyes = 0;
  for (const b of boutiques) {
    const rappel = rappelEcheanceDu(b.planExpiresAt!, b.planRappel, maintenant);
    if (!rappel) continue;
    // Conditionnel : deux passages simultanés n'envoient pas deux fois le même rappel.
    const { count } = await prisma.tenant.updateMany({ where: { id: b.id, planRappel: b.planRappel }, data: { planRappel: rappel } });
    if (!count) continue;
    // Une autre boutique du compte couvre ce palier plus longtemps : rien à renouveler ici.
    const compte = await boutiquesDuMemeCompte(b.id, { planType: true, planExpiresAt: true });
    if (compte.some((c) => (c.planType === "palier1" || c.planType === "palier2") && palierAuMoins(c.planType, b.planType as Palier) && c.planExpiresAt && c.planExpiresAt > b.planExpiresAt!)) continue;

    const nom = NOMS_PALIERS[b.planType as Palier];
    const date = b.planExpiresAt!.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    const titre = rappel === "j3" ? `Ton abonnement ${nom} expire le ${date}`
      : b.planExpiresAt! > maintenant ? `Ton abonnement ${nom} expire aujourd'hui` : `Ton abonnement ${nom} a expiré`;
    const message = `À l'échéance, ta boutique repasse en Essentiel.`;
    await Promise.allSettled([
      envoyerRappelEssai({ email: b.email, boutique: b.nomBoutique, titre, message }),
      pousserMarchands([b.id], { titre, message, lien: "/dashboard/abonnement", type: "abonnement" }),
    ]);
    envoyes++;
  }
  return { envoyes };
}
