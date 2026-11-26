// Formulaires Releasit COD AXSO abandonnés : capture (nom + téléphone valides, consentement affiché),
// relances WhatsApp automatiques aux délais choisis, récupération quand la même visite finit par commander.
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normaliserTelephone } from "@/lib/devise-convert";
import { envoyerWhatsApp } from "@/lib/whatsapp";
import { adresse, cheminProduit } from "@/lib/seo-boutique";

export const MESSAGE_DEFAUT = "Bonjour {nom}, vous avez commencé une commande de {produit} chez {boutique}. Elle vous attend ici : {lien} — répondez à ce message si vous avez une question.";
export const ETAPES_DEFAUT = [15, 120, 1440]; // +15 min, +2 h, +24 h

export const schemaRelances = z.object({
  actif: z.boolean(),
  etapes: z.array(z.number().int().min(5).max(4320)).min(1).max(3),
  message: z.string().trim().min(10).max(500),
});
export type Relances = z.infer<typeof schemaRelances>;
export const lireRelances = (brut: unknown): Relances => {
  const r = schemaRelances.safeParse(brut);
  return r.success ? r.data : { actif: false, etapes: ETAPES_DEFAUT, message: MESSAGE_DEFAUT };
};

/** Message de relance, variables remplacées. */
export const messageRelance = (modele: string, v: { nom?: string | null; produit: string; boutique: string; lien: string }) =>
  modele.replace(/\{nom\}/g, (v.nom ?? "").split(/\s+/)[0] || "").replace(/\{produit\}/g, v.produit).replace(/\{boutique\}/g, v.boutique).replace(/\{lien\}/g, v.lien).replace(/\s{2,}/g, " ").trim();

/** Prochaine relance due ? (étape suivante atteinte, dans les 72 h, jamais après une commande). */
export function relanceDue(a: { createdAt: Date; relances: number; recupereeCommandeId: string | null }, etapes: number[], maintenant = new Date()) {
  if (a.recupereeCommandeId || a.relances >= etapes.length) return false;
  const age = (maintenant.getTime() - a.createdAt.getTime()) / 60_000;
  return age >= etapes[a.relances] && age <= 72 * 60;
}

/** Capture (ou mise à jour) d'un formulaire en cours : une fiche par clé de formulaire. */
export async function capturerAbandon(tenantId: string, b: { cle: string; nom?: unknown; telephone?: unknown; pays?: unknown; produitId?: unknown; quantite?: unknown; montant?: unknown }) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { pays: true } });
  const telephone = normaliserTelephone(String(b.telephone ?? ""), String(b.pays ?? tenant?.pays ?? ""));
  if (!telephone) return null;
  const existe = await prisma.abandonReleasit.findUnique({ where: { cle: b.cle }, select: { tenantId: true, recupereeCommandeId: true } });
  if (existe && (existe.tenantId !== tenantId || existe.recupereeCommandeId)) return null;
  // La commande est peut-être déjà passée (le formulaire a fini avant la capture).
  if (await prisma.commandeExpress.findUnique({ where: { cleIdempotence: b.cle }, select: { id: true } })) return null;
  const data = {
    telephone, nom: typeof b.nom === "string" ? b.nom.slice(0, 120) : null,
    produitId: typeof b.produitId === "string" ? b.produitId.slice(0, 40) : null,
    quantite: Math.min(Math.max(Math.floor(Number(b.quantite) || 1), 1), 999),
    montant: Number.isFinite(Number(b.montant)) ? Math.max(0, Number(b.montant)) : null,
  };
  return prisma.abandonReleasit.upsert({ where: { cle: b.cle }, create: { tenantId, cle: b.cle, ...data }, update: data });
}

/** La visite a fini par commander : l'abandon est récupéré (compté si une relance était partie). */
export async function marquerRecuperee(tenantId: string, cle: string, commandeId: string) {
  await prisma.abandonReleasit.updateMany({ where: { tenantId, cle, recupereeCommandeId: null }, data: { recupereeCommandeId: commandeId } });
}

/** Tâche planifiée (toutes les 5 min) : relances WhatsApp dues, boutique par boutique. */
export async function passeAbandons(maintenant = new Date()) {
  const reglages = await prisma.reglagesCommandeExpress.findMany({ where: { actif: true }, select: { tenantId: true, relances: true } });
  let envoyees = 0;
  for (const r of reglages) {
    const cfg = lireRelances(r.relances);
    if (!cfg.actif) continue;
    const depuis = new Date(maintenant.getTime() - 72 * 3_600_000);
    const candidats = await prisma.abandonReleasit.findMany({ where: { tenantId: r.tenantId, recupereeCommandeId: null, relances: { lt: cfg.etapes.length }, createdAt: { gte: depuis } }, take: 50, orderBy: { createdAt: "asc" } });
    const dus = candidats.filter((a) => relanceDue(a, cfg.etapes, maintenant));
    if (!dus.length) continue;
    const tenant = await prisma.tenant.findUnique({ where: { id: r.tenantId }, select: { slug: true, nomBoutique: true, customDomain: true, domaineActifAt: true, sousDomaineAt: true } });
    if (!tenant) continue;
    for (const a of dus) {
      // Commandé entre-temps (autre visite, même numéro) : on ne relance plus.
      const commande = await prisma.commandeExpress.findFirst({ where: { tenantId: r.tenantId, telephone: a.telephone, commandeId: { not: null }, createdAt: { gte: a.createdAt } }, select: { commandeId: true } });
      if (commande?.commandeId) { await marquerRecuperee(r.tenantId, a.cle, commande.commandeId); continue; }
      const produit = a.produitId ? await prisma.produit.findFirst({ where: { id: a.produitId, tenantId: r.tenantId }, select: { id: true, slug: true, nom: true } }) : null;
      const lien = adresse(tenant, produit ? cheminProduit(produit) : "");
      const texte = messageRelance(cfg.message, { nom: a.nom, produit: produit?.nom ?? "votre article", boutique: tenant.nomBoutique, lien });
      const parti = await envoyerWhatsApp(a.telephone, texte, r.tenantId).catch(() => false);
      // L'étape avance même si l'envoi échoue : jamais de rafale de messages au même client.
      await prisma.abandonReleasit.update({ where: { id: a.id }, data: { relances: { increment: 1 }, derniereRelance: maintenant } });
      if (parti) envoyees++;
    }
  }
  return { envoyees };
}
