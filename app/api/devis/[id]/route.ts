// Un devis du marchand : lecture, modification et actions (envoyer, convertir, annuler, encaisser).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { envoyerEmailTexte } from "@/lib/email";
import { lienBoutique } from "@/lib/origine-site";
import { introuvable, invalide, nonAutorise, reponseErreur, sessionBoutique } from "@/lib/commerce/api";
import { convertirDevis, encaisserATerme } from "@/lib/commerce/devis";
import { devisModifiable, devisSchema, totauxDevis } from "@/lib/commerce/regles";

type Ctx = { params: Promise<{ id: string }> };

async function charger(id: string, tenantId: string) {
  return prisma.devis.findFirst({ where: { id, tenantId } });
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const devis = await charger((await params).id, s.tenantId);
  if (!devis) return introuvable();
  const tenant = await prisma.tenant.findUnique({ where: { id: s.tenantId }, select: { slug: true } });
  const commande = devis.commandeId ? await prisma.commande.findUnique({ where: { id: devis.commandeId }, select: { id: true, numero: true, statut: true, paiementStatut: true, methodePaiement: true, echeancePaiement: true } }) : null;
  return NextResponse.json({ devis, commande, lien: await lienBoutique(tenant!.slug, `/devis/${devis.token}`) });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const devis = await charger((await params).id, s.tenantId);
  if (!devis) return introuvable();
  if (!devisModifiable(devis.statut)) return NextResponse.json({ error: "Ce devis n'est plus modifiable" }, { status: 409 });
  const r = devisSchema.safeParse(await req.json().catch(() => null));
  if (!r.success) return invalide(r.error);
  const d = r.data;
  if (d.entrepriseId && !(await prisma.compteEntreprise.findFirst({ where: { id: d.entrepriseId, tenantId: s.tenantId }, select: { id: true } }))) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
  const ids = [...new Set(d.lignes.map((l) => l.produitId))];
  if ((await prisma.produit.count({ where: { id: { in: ids }, tenantId: s.tenantId, type: "physique" } })) !== ids.length) return NextResponse.json({ error: "Un produit n'appartient pas à cette boutique" }, { status: 400 });
  const t = totauxDevis(d.lignes, d.remise, d.livraison);
  const { count } = await prisma.devis.updateMany({ where: { id: devis.id, statut: devis.statut, commandeId: null }, data: { ...d, remise: t.reduction, livraison: t.livraison, total: t.total, lignes: d.lignes } });
  if (!count) return NextResponse.json({ error: "Ce devis vient de changer : rechargez la page" }, { status: 409 });
  return NextResponse.json({ ok: true });
}

const action = z.object({ action: z.enum(["envoyer", "convertir", "annuler", "encaisser"]) });

export async function POST(req: NextRequest, { params }: Ctx) {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const devis = await charger((await params).id, s.tenantId);
  if (!devis) return introuvable();
  const r = action.safeParse(await req.json().catch(() => null));
  if (!r.success) return invalide(r.error);
  try {
    if (r.data.action === "convertir") {
      const c = await convertirDevis(devis.id, s.tenantId);
      return NextResponse.json({ commandeId: c.id, numero: c.numero });
    }
    if (r.data.action === "encaisser") {
      if (!devis.commandeId) return NextResponse.json({ error: "Ce devis n'a pas de commande" }, { status: 409 });
      await encaisserATerme(devis.commandeId, s.tenantId);
      return NextResponse.json({ ok: true });
    }
    if (r.data.action === "annuler") {
      const { count } = await prisma.devis.updateMany({ where: { id: devis.id, statut: { in: ["brouillon", "envoye", "soumis"] }, commandeId: null }, data: { statut: "annule" } });
      return count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Ce devis ne peut plus être annulé" }, { status: 409 });
    }
    const { count } = await prisma.devis.updateMany({ where: { id: devis.id, statut: { in: ["brouillon", "envoye", "soumis"] }, commandeId: null }, data: { statut: "envoye" } });
    if (!count) return NextResponse.json({ error: "Ce devis ne peut plus être envoyé" }, { status: 409 });
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: s.tenantId }, select: { slug: true, nomBoutique: true, email: true } });
    const lien = await lienBoutique(tenant.slug, `/devis/${devis.token}`);
    const emailEnvoye = devis.clientEmail
      ? await envoyerEmailTexte({ a: devis.clientEmail, repondreA: tenant.email || "noreply@axsoafrica.com", boutique: tenant.nomBoutique, sujet: `Votre devis ${devis.numero}`, texte: `Bonjour ${devis.clientNom},\n\nVoici votre devis ${tenant.nomBoutique}. Consultez-le et acceptez-le ici :\n${lien}\n\nMerci.` }).catch(() => false)
      : false;
    const whatsapp = `https://wa.me/${devis.clientTelephone.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${devis.clientNom}, voici votre devis ${tenant.nomBoutique} : ${lien}`)}`;
    return NextResponse.json({ lien, emailEnvoye, whatsapp });
  } catch (e) { return reponseErreur(e); }
}
