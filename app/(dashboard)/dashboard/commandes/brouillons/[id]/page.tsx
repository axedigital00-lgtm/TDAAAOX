// Fiche commande provisoire (masterprompt §8.4) : création (/brouillons/nouveau) et édition.
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { etatBrouillon } from "@/lib/commandes-provisoires";
import { lignesDe } from "../donnees";
import { FicheBrouillon, type BrouillonInitial } from "./FicheBrouillon";

export default async function BrouillonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "commandes");
  const tenantId = (session.user as any)?.tenantId as string;
  const { id } = await params;
  const nouveau = id === "nouveau";

  const [b, tenant, produits, clients] = await Promise.all([
    nouveau ? null : prisma.commandeProvisoire.findFirst({ where: { id, tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true, pays: true } }),
    // ponytail: catalogue et clients chargés en entier (500 max) et filtrés dans le navigateur ; recherche serveur au-delà.
    prisma.produit.findMany({
      where: { tenantId, actif: true, type: "physique" },
      orderBy: { nom: "asc" }, take: 500,
      select: { id: true, nom: true, prix: true, images: true, stock: true, variantes: { where: { actif: true }, select: { nom: true, valeur: true, prix: true } } },
    }),
    prisma.client.findMany({
      where: { tenantId }, orderBy: { createdAt: "desc" }, take: 500,
      select: { id: true, nom: true, telephone: true, email: true, adresse: true, ville: true, pays: true },
    }),
  ]);
  if (!nouveau && !b) notFound();

  const initial: BrouillonInitial | null = b && {
    id: b.id, numero: b.numero, etat: etatBrouillon(b), commandeId: b.commandeId,
    clientId: b.clientId,
    client: { nom: b.clientNom, telephone: b.clientTelephone, email: b.clientEmail ?? "", adresse: b.adresse ?? "", ville: b.ville ?? "", pays: b.pays ?? "" },
    lignes: lignesDe(b.lignes), remise: b.remise, livraison: b.livraison, note: b.note ?? "",
  };

  return (
    <FicheBrouillon
      initial={initial}
      devise={tenant?.devise ?? "XAF"}
      paysBoutique={tenant?.pays ?? ""}
      produits={produits.map((p) => ({ id: p.id, nom: p.nom, prix: p.prix, image: p.images[0] ?? null, stock: p.stock, variantes: p.variantes.map((v) => ({ cle: `${v.nom}: ${v.valeur}`, prix: v.prix })) }))}
      clients={clients.map((c) => ({ id: c.id, nom: c.nom, telephone: c.telephone ?? "", email: c.email ?? "", adresse: c.adresse ?? "", ville: c.ville ?? "", pays: c.pays ?? "" }))}
    />
  );
}
