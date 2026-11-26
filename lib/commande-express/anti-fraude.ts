// Anti-fraude Releasit COD AXSO, côté base : liste noire, limite par jour et historique du numéro.
// Tout est scopé par tenantId : la liste noire et l'historique d'une boutique ne touchent jamais une autre.
import { prisma } from "@/lib/prisma";
import { scoreRisque, type Indices } from "./risque";

const JOUR = 86_400_000;

export type Refus = { code: "liste_noire" | "limite"; message: string };

/** Refus avant création : numéro ou connexion en liste noire, ou limite de commandes sur 24 h dépassée. */
export async function controlerCommande(p: { tenantId: string; telephone: string | null; ipHash: string; limiteParJour: number }): Promise<Refus | null> {
  const valeurs = [{ type: "ip", valeur: p.ipHash }, ...(p.telephone ? [{ type: "telephone", valeur: p.telephone }] : [])];
  const bloque = await prisma.listeNoireCommande.findFirst({ where: { tenantId: p.tenantId, OR: valeurs }, select: { id: true } });
  // Message neutre : on ne dit pas à un fraudeur qu'il est repéré.
  if (bloque) return { code: "liste_noire", message: "Cette boutique ne peut pas prendre votre commande en ligne. Contactez-la directement." };
  if (p.limiteParJour > 0) {
    const depuis = new Date(Date.now() - JOUR);
    const [parTel, parIp] = await Promise.all([
      p.telephone ? prisma.commandeExpress.count({ where: { tenantId: p.tenantId, telephone: p.telephone, commandeId: { not: null }, createdAt: { gte: depuis } } }) : 0,
      prisma.commandeExpress.count({ where: { tenantId: p.tenantId, ipHash: p.ipHash, commandeId: { not: null }, createdAt: { gte: depuis } } }),
    ]);
    if (parTel >= p.limiteParJour || parIp >= p.limiteParJour) {
      return { code: "limite", message: "Vous avez déjà passé plusieurs commandes aujourd'hui. La boutique va vous contacter ; vous pourrez commander à nouveau demain." };
    }
  }
  return null;
}

/** Score de risque d'une commande qui vient d'être créée (sa propre fiche est exclue de l'historique). */
export async function evaluerCommande(p: { tenantId: string; ficheId: string; telephone: string | null; ipHash: string; nom: string; quantite: number; dureeMs: number | null; jetonValide: boolean }) {
  const depuis = new Date(Date.now() - JOUR);
  const passees = p.telephone
    ? await prisma.commandeExpress.findMany({ where: { tenantId: p.tenantId, telephone: p.telephone, id: { not: p.ficheId }, commandeId: { not: null } }, select: { commandeId: true, statutConfirmation: true, createdAt: true }, take: 50, orderBy: { createdAt: "desc" } })
    : [];
  const statuts = passees.length
    ? await prisma.commande.findMany({ where: { tenantId: p.tenantId, id: { in: passees.map((x) => x.commandeId!) } }, select: { id: true, statut: true } })
    : [];
  const statutDe = new Map(statuts.map((s) => [s.id, s.statut]));
  const memeIp24h = await prisma.commandeExpress.count({ where: { tenantId: p.tenantId, ipHash: p.ipHash, id: { not: p.ficheId }, commandeId: { not: null }, createdAt: { gte: depuis } } });
  const indices: Indices = {
    telephoneValide: !!p.telephone, nom: p.nom, quantite: p.quantite, dureeMs: p.dureeMs, jetonValide: p.jetonValide, memeIp24h,
    historique: {
      livrees: passees.filter((x) => statutDe.get(x.commandeId!) === "livree").length,
      refusees: passees.filter((x) => statutDe.get(x.commandeId!) === "tentative_echouee" || (x.statutConfirmation === "annulee" && statutDe.get(x.commandeId!) === "annulee")).length,
      fauxNumero: passees.filter((x) => x.statutConfirmation === "faux_numero").length,
      dernieres24h: passees.filter((x) => x.createdAt >= depuis).length,
    },
  };
  return scoreRisque(indices);
}
