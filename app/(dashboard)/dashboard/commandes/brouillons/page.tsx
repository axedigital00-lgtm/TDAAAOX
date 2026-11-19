// Commandes provisoires (masterprompt §8.4) : liste, ou état vide avec « Créer une commande provisoire ».
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/serveur";
import { dateRelative, formatMontant } from "@/lib/utils";
import { BADGES_BROUILLON, etatBrouillon, totauxBrouillon } from "@/lib/commandes-provisoires";
import { lignesDe, prixLigne, produitsDesLignes } from "./donnees";
import { ListeBrouillons, type LigneListeBrouillon } from "./ListeBrouillons";

const PAR_PAGE = 50;
const VUES = [
  { id: "toutes", label: "Toutes" },
  { id: "ouverte", label: "Ouvertes" },
  { id: "facture", label: "Facture envoyée" },
  { id: "terminee", label: "Terminées" },
];

export default async function BrouillonsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "commandes");
  const t = await getT();
  const tenantId = (session.user as any)?.tenantId as string;
  const sp = await searchParams;
  const vue = sp.vue ?? "toutes";
  const q = sp.q?.trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const where = {
    tenantId,
    ...(vue === "ouverte" ? { commandeId: null, factureEnvoyeeLe: null } : vue === "facture" ? { commandeId: null, factureEnvoyeeLe: { not: null } } : vue === "terminee" ? { commandeId: { not: null } } : {}),
    ...(q ? { OR: [{ clientNom: { contains: q, mode: "insensitive" as const } }, { clientTelephone: { contains: q } }] } : {}),
  };
  const [tenant, brouillons, total, existe] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true } }),
    prisma.commandeProvisoire.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAR_PAGE, take: PAR_PAGE }),
    prisma.commandeProvisoire.count({ where }),
    prisma.commandeProvisoire.count({ where: { tenantId } }),
  ]);
  const devise = tenant?.devise ?? "XAF";
  const produits = await produitsDesLignes(tenantId, brouillons.flatMap((b) => lignesDe(b.lignes)));

  const lignes: LigneListeBrouillon[] = brouillons.map((b) => {
    const lp = lignesDe(b.lignes).map((l) => ({ prix: prixLigne(produits.get(l.produitId), l.variante), quantite: l.quantite }));
    const badge = BADGES_BROUILLON[etatBrouillon(b)];
    return {
      id: b.id,
      reference: `#D${b.numero}`,
      date: dateRelative(b.createdAt),
      client: b.clientNom,
      statut: { ...badge, label: t(badge.label) },
      total: formatMontant(totauxBrouillon(lp, b.remise, b.livraison).total, devise),
    };
  });

  return (
    <ListeBrouillons
      lignes={lignes}
      vues={VUES.map((v) => ({ id: v.id, label: t(v.label) }))}
      page={page} total={total} parPage={PAR_PAGE}
      vide={existe === 0}
    />
  );
}
