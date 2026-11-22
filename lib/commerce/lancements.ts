// Lancements planifiés : une version figée du brouillon passe en ligne à l'heure dite, puis la
// boutique revient à l'état d'avant à la fin. Le brouillon en cours du marchand n'est jamais touché,
// et un retour n'écrase jamais des retouches faites pendant le lancement.
import { prisma } from "@/lib/prisma";
import { publier } from "@/lib/controle-ia/evenements";
import { notifierMarchand } from "@/lib/notifications-marchand";
import { empreinte, lireBrouillon, mettreEnLigne } from "@/lib/builder/moteur";
import { actionLancement } from "./regles";

export async function creerLancement(tenantId: string, userId: string, d: { nom: string; debut: Date; fin?: Date | null }) {
  const b = await lireBrouillon(tenantId);
  if (!b.existe) return { erreur: "Préparez d'abord vos changements dans le brouillon du Constructeur" };
  if (d.debut.getTime() < Date.now() - 60_000) return { erreur: "La date de début est déjà passée" };
  const chevauche = await prisma.lancementBoutique.findFirst({
    where: { tenantId, statut: { in: ["planifie", "en_ligne"] }, debut: d.fin ? { lt: d.fin } : undefined, OR: [{ fin: null }, { fin: { gt: d.debut } }] },
    select: { nom: true },
  });
  if (chevauche) return { erreur: `Ce créneau chevauche le lancement « ${chevauche.nom} »` };
  const lancement = await prisma.lancementBoutique.create({ data: { tenantId, nom: d.nom, debut: d.debut, fin: d.fin ?? null, config: b.config as any, auteur: userId } });
  return { lancement };
}

const prevenir = (tenantId: string, titre: string, message: string) =>
  notifierMarchand({ tenantId, type: "lancement", titre, message, lien: "/dashboard/boutique/lancements" }).catch(() => {});

async function mettreLeLancementEnLigne(l: { id: string; tenantId: string; nom: string; config: unknown; auteur: string }) {
  await mettreEnLigne(l.tenantId, l.config as Record<string, any>, `Lancement « ${l.nom} »`, { userId: l.auteur }, async (tx, r) => {
    const { count } = await tx.lancementBoutique.updateMany({ where: { id: l.id, statut: "planifie" }, data: { statut: "en_ligne", versionAvant: r.versionAvant, empreinte: r.empreinte } });
    if (!count) throw new Error("deja_traite");
  });
  publier(l.tenantId, "publish.completed", { lancement: l.nom });
  await prevenir(l.tenantId, `Lancement en ligne : ${l.nom}`, "Votre boutique affiche maintenant cette version.");
}

async function retablir(l: { id: string; tenantId: string; nom: string; auteur: string; versionAvant: number | null; empreinte: string | null }) {
  const [tenant, version] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: l.tenantId }, select: { themeConfig: true } }),
    l.versionAvant == null ? null : prisma.versionBoutique.findUnique({ where: { tenantId_numero: { tenantId: l.tenantId, numero: l.versionAvant } } }),
  ]);
  if (!version) {
    await prisma.lancementBoutique.updateMany({ where: { id: l.id, statut: "en_ligne" }, data: { statut: "echec", erreur: "Version d'origine introuvable" } });
    return prevenir(l.tenantId, `Retour impossible : ${l.nom}`, "La version d'origine n'existe plus. Choisissez une version dans l'historique.");
  }
  if (empreinte(tenant?.themeConfig) !== l.empreinte) {
    await prisma.lancementBoutique.updateMany({ where: { id: l.id, statut: "en_ligne" }, data: { statut: "conflit", erreur: "Boutique modifiée pendant le lancement" } });
    return prevenir(l.tenantId, `Retour non appliqué : ${l.nom}`, "La boutique a été modifiée pendant le lancement : vos retouches sont conservées.");
  }
  await mettreEnLigne(l.tenantId, version.config as Record<string, any>, `Fin du lancement « ${l.nom} »`, { userId: l.auteur }, async (tx) => {
    const { count } = await tx.lancementBoutique.updateMany({ where: { id: l.id, statut: "en_ligne" }, data: { statut: "termine" } });
    if (!count) throw new Error("deja_traite");
  });
  publier(l.tenantId, "rollback.completed", { lancement: l.nom });
  await prevenir(l.tenantId, `Lancement terminé : ${l.nom}`, "La boutique est revenue à sa version d'avant.");
}

/** Passage planifié (cron toutes les 5 minutes sur Cloudflare). Un passage en retard n'est jamais perdu. */
export async function passeLancements(maintenant = new Date()) {
  const dus = await prisma.lancementBoutique.findMany({
    where: { OR: [{ statut: "planifie", debut: { lte: maintenant } }, { statut: "en_ligne", fin: { lte: maintenant } }] },
    orderBy: { debut: "asc" }, take: 25,
  });
  let publies = 0, retablis = 0, echecs = 0;
  for (const l of dus) {
    const action = actionLancement(l, maintenant);
    try {
      if (action === "publier") { await mettreLeLancementEnLigne(l); publies++; }
      else if (action === "retablir") { await retablir(l); retablis++; }
      else if (l.statut === "planifie") {
        await prisma.lancementBoutique.updateMany({ where: { id: l.id, statut: "planifie" }, data: { statut: "echec", erreur: "Fenêtre passée sans publication" } });
        await prevenir(l.tenantId, `Lancement non publié : ${l.nom}`, "Sa période était déjà terminée au moment du passage.");
      }
    } catch (e) {
      if ((e as Error)?.message === "deja_traite") continue;
      echecs++;
      await prisma.lancementBoutique.updateMany({ where: { id: l.id, statut: l.statut }, data: { statut: "echec", erreur: String((e as Error)?.message).slice(0, 200) } });
      await prevenir(l.tenantId, `Échec du lancement : ${l.nom}`, "La boutique n'a pas changé. Vérifiez le lancement.");
    }
  }
  return { publies, retablis, echecs };
}
