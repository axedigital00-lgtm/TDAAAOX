// Workflows du marchand : QUAND un événement du bus, SI ses conditions, ALORS des actions bornées.
// Appelé par lib/controle-ia/evenements.ts ; une action en échec n'empêche pas les suivantes.
import { prisma } from "@/lib/prisma";
import { envoyerEmailTexte } from "@/lib/email";
import { notifierMarchand } from "@/lib/notifications-marchand";
import { conditionsVraies, type Condition } from "@/lib/controle-ia/automatisations";
import { remplirModele, type ActionWorkflow } from "./regles";

async function donneesEvenement(tenantId: string, donnees: Record<string, unknown>) {
  if (typeof donnees.commandeId !== "string") return donnees;
  const c = await prisma.commande.findFirst({
    where: { id: donnees.commandeId, tenantId },
    select: { numero: true, montantTotal: true, ville: true, pays: true, clientNom: true, clientEmail: true, clientId: true, client: { select: { totalCommandes: true, relancesRefuseesLe: true } } },
  });
  if (!c) return donnees;
  const commandesClient = c.clientId ? await prisma.commande.count({ where: { tenantId, clientId: c.clientId, statut: { not: "annulee" } } }) : c.client?.totalCommandes ?? 0;
  return { ...donnees, numero: c.numero, total: c.montantTotal, ville: c.ville, pays: c.pays, client: c.clientNom, emailClient: c.clientEmail, clientId: c.clientId, commandesClient, desinscrit: !!c.client?.relancesRefuseesLe };
}

async function executer(a: ActionWorkflow, tenantId: string, d: Record<string, unknown>, boutique: { nomBoutique: string; email: string | null }) {
  if (a.type === "notifier") {
    await notifierMarchand({ tenantId, type: "automatisation", titre: remplirModele(a.titre, d).slice(0, 160), message: remplirModele(a.message, d).slice(0, 500), lien: typeof d.commandeId === "string" ? `/dashboard/commandes/${d.commandeId}` : "/dashboard/automation/workflows" });
    return "notification envoyée";
  }
  if (a.type === "email_client") {
    if (typeof d.emailClient !== "string" || !d.emailClient) return "e-mail ignoré : client sans adresse";
    if (d.desinscrit) return "e-mail ignoré : client désinscrit";
    const ok = await envoyerEmailTexte({ a: d.emailClient, repondreA: boutique.email || "noreply@axsoafrica.com", boutique: boutique.nomBoutique, sujet: remplirModele(a.sujet, d).slice(0, 160), texte: remplirModele(a.message, d) });
    if (!ok) throw new Error("envoi de l'e-mail impossible");
    return "e-mail envoyé";
  }
  if (a.type === "segment_client") {
    if (typeof d.clientId !== "string") return "segment ignoré : commande sans client";
    await prisma.client.updateMany({ where: { id: d.clientId, tenantId }, data: { segment: a.segment } });
    return `client classé « ${a.segment} »`;
  }
  if (typeof d.produitId !== "string") return "masquage ignoré : aucun produit";
  await prisma.produit.updateMany({ where: { id: d.produitId, tenantId }, data: { visibleListage: false } });
  return "produit masqué du catalogue";
}

export async function declencherWorkflows(tenantId: string, type: string, brut: Record<string, unknown>) {
  const workflows = await prisma.workflowBoutique.findMany({ where: { tenantId, declencheur: type, actif: true } });
  if (!workflows.length) return;
  const [donnees, boutique] = await Promise.all([
    donneesEvenement(tenantId, brut),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { nomBoutique: true, email: true } }),
  ]);
  if (!boutique) return;
  for (const w of workflows) {
    if (!conditionsVraies(w.conditions as unknown as Condition[], { evenement: donnees, etapes: {} })) continue;
    const journal: string[] = [];
    for (const a of w.actions as unknown as ActionWorkflow[]) {
      try { journal.push(await executer(a, tenantId, donnees, boutique)); }
      catch (e) { journal.push(`échec : ${String((e as Error)?.message).slice(0, 100)}`); }
    }
    await prisma.workflowBoutique.update({ where: { id: w.id }, data: { executions: { increment: 1 }, derniereExecution: new Date(), dernierResultat: journal.join(" · ").slice(0, 500) } });
  }
}
