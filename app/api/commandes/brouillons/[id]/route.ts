import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailReel } from "@/lib/email";
import { formatMontant } from "@/lib/utils";
import { RuptureStock } from "@/lib/stock";
import { enregistrerCommandeCod, lignesCod, notifierCommandeCod } from "@/lib/commande-cod";
import { lienWhatsapp, messageBrouillon, totauxBrouillon, type LigneBrouillon } from "@/lib/commandes-provisoires";
import { donneesBrouillon, marchandCommandes, schemaBrouillon } from "../schema";

type Ctx = { params: Promise<{ id: string }> };
const erreur = (error: string, status: number) => NextResponse.json({ error }, { status });

async function charger(ctx: Ctx) {
  const m = await marchandCommandes();
  if ("error" in m) return { reponse: erreur(m.error, m.status) };
  const { id } = await ctx.params;
  const b = await prisma.commandeProvisoire.findFirst({ where: { id, tenantId: m.tenantId } });
  if (!b) return { reponse: erreur("Commande provisoire introuvable", 404) };
  return { b, tenantId: m.tenantId };
}

// Modifier une commande provisoire (tant qu'elle n'est pas convertie).
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const r = await charger(ctx);
  if (!r.b) return r.reponse;
  if (r.b.commandeId || r.b.convertieLe) return erreur("Cette commande provisoire est déjà convertie", 409);
  const saisie = schemaBrouillon.safeParse(await req.json().catch(() => null));
  if (!saisie.success) return erreur("Vérifiez le client et les articles saisis", 400);
  if (saisie.data.clientId && !(await prisma.client.findFirst({ where: { id: saisie.data.clientId, tenantId: r.tenantId }, select: { id: true } }))) {
    return erreur("Client introuvable", 404);
  }
  await prisma.commandeProvisoire.update({ where: { id: r.b.id }, data: donneesBrouillon(saisie.data) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const r = await charger(ctx);
  if (!r.b) return r.reponse;
  if (r.b.commandeId) return erreur("Une commande provisoire convertie ne se supprime pas", 409);
  await prisma.commandeProvisoire.delete({ where: { id: r.b.id } });
  return NextResponse.json({ ok: true });
}

// action « facture » : récapitulatif WhatsApp au client ; « convertir » : vraie commande (même chemin que la vitrine).
export async function POST(req: NextRequest, ctx: Ctx) {
  const r = await charger(ctx);
  if (!r.b) return r.reponse;
  const b = r.b;
  const { action } = await req.json().catch(() => ({}));
  if (b.commandeId || b.convertieLe) return erreur("Cette commande provisoire est déjà convertie", 409);

  const demandees = (Array.isArray(b.lignes) ? b.lignes : []) as LigneBrouillon[];
  if (!demandees.length) return erreur("Ajoutez au moins un article", 400);
  const lus = await lignesCod(r.tenantId, demandees);
  if (!lus.ok) return erreur(lus.error, 400);
  const items = lus.items;
  const tot = totauxBrouillon(items, b.remise, b.livraison);
  const tenant = await prisma.tenant.findUnique({ where: { id: r.tenantId } });
  if (!tenant) return erreur("Boutique introuvable", 404);

  if (action === "facture") {
    const url = lienWhatsapp(b.clientTelephone, messageBrouillon({
      boutique: tenant.nomBoutique, client: b.clientNom, devise: tenant.devise,
      lignes: items, remise: tot.remise, livraison: tot.livraison, total: tot.total, note: b.note,
    }));
    if (!url) return erreur("Numéro du client invalide", 400);
    await prisma.commandeProvisoire.update({ where: { id: b.id }, data: { factureEnvoyeeLe: new Date() } });
    return NextResponse.json({ whatsappUrl: url });
  }
  if (action !== "convertir") return erreur("Action inconnue", 400);

  // Réservation : deux clics simultanés ne créent pas deux commandes.
  const { count } = await prisma.commandeProvisoire.updateMany({ where: { id: b.id, convertieLe: null, commandeId: null }, data: { convertieLe: new Date() } });
  if (!count) return erreur("Cette commande provisoire est déjà convertie", 409);
  try {
    let client = b.clientId ? await prisma.client.findFirst({ where: { id: b.clientId, tenantId: r.tenantId } }) : null;
    client ??= await prisma.client.findFirst({ where: { tenantId: r.tenantId, telephone: b.clientTelephone } });
    client ??= await prisma.client.create({
      data: { tenantId: r.tenantId, nom: b.clientNom, email: b.clientEmail, telephone: b.clientTelephone, ville: b.ville, pays: b.pays },
    });
    const email = b.clientEmail || (emailReel(client.email) ? client.email : null);
    const { commande, montantTotal, factureUrl, trackingUrl } = await enregistrerCommandeCod({
      tenant, clientId: client.id,
      client: { nom: b.clientNom, telephone: b.clientTelephone, email, pays: b.pays },
      items, sousTotal: tot.sousTotal, reduction: tot.remise, promo: null, montantLivraison: tot.livraison,
      methodePaiement: "direct_cod",
      adresseLivraison: b.adresse || "À préciser", ville: b.ville || "—", adresseExacte: b.adresse, noteClient: b.note,
    });
    await prisma.commandeProvisoire.update({ where: { id: b.id }, data: { commandeId: commande.id } });
    await notifierCommandeCod({ tenant, commande, items, montantTotal, client: { nom: b.clientNom, email }, type: "nouvelle_commande" });
    const confirmation = [
      `✅ *Commande confirmée — ${tenant.nomBoutique}*`, ``,
      `Bonjour ${b.clientNom} ! Votre commande *#${commande.numero}* est enregistrée.`,
      `💰 Total : *${formatMontant(montantTotal, tenant.devise)}* — paiement à la livraison`, ``,
      `📄 Facture : ${factureUrl}`, `🚚 Suivi : ${trackingUrl}`,
    ].join("\n");
    return NextResponse.json({ commandeId: commande.id, numero: commande.numero, whatsappClientUrl: lienWhatsapp(b.clientTelephone, confirmation) });
  } catch (err) {
    await prisma.commandeProvisoire.update({ where: { id: b.id }, data: { convertieLe: null } }).catch(() => {});
    if (err instanceof RuptureStock) return erreur(err.message, err.status);
    console.error("[brouillons/convertir]", err);
    return erreur("Erreur serveur", 500);
  }
}
