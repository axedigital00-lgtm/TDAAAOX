// Paniers abandonnés (masterprompt §8.5) : acheteurs arrivés au paiement de la vitrine (nom + téléphone
// saisis) sans commander. Statut de récupération selon §7.2 ; relance manuelle sur WhatsApp.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/serveur";
import { dateRelative, formatMontant } from "@/lib/utils";
import { BADGES_PANIER, DELAI_ABANDON_MS, etatPanier } from "@/lib/commandes-provisoires";
import { ListePaniers, type LignePanier } from "./ListePaniers";

const PAR_PAGE = 50;
const VUES = [{ id: "incomplets", label: "Incomplets" }, { id: "recuperes", label: "Récupérés" }, { id: "tous", label: "Tous" }];

export default async function PaniersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "commandes");
  const t = await getT();
  const tenantId = (session.user as any)?.tenantId as string;
  const sp = await searchParams;
  const vue = sp.vue ?? "incomplets";
  const q = sp.q?.trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const where = {
    tenantId,
    updatedAt: { lt: new Date(Date.now() - DELAI_ABANDON_MS) },
    ...(vue === "incomplets" ? { recupereLe: null } : vue === "recuperes" ? { recupereLe: { not: null } } : {}),
    ...(q ? { OR: [{ nom: { contains: q, mode: "insensitive" as const } }, { telephone: { contains: q } }] } : {}),
  };
  const [paniers, total, existe] = await Promise.all([
    prisma.panierAbandonne.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PAR_PAGE, take: PAR_PAGE }),
    prisma.panierAbandonne.count({ where }),
    prisma.panierAbandonne.count({ where: { tenantId } }),
  ]);
  // Consentement : un client qui a refusé les relances n'est pas relancé (bouton désactivé).
  const refus = new Set((await prisma.client.findMany({
    where: { tenantId, telephone: { in: paniers.map((p) => p.telephone) }, relancesRefuseesLe: { not: null } },
    select: { telephone: true },
  })).map((c) => c.telephone));

  const lignes: LignePanier[] = paniers.map((p) => {
    const etat = etatPanier(p);
    const badge = BADGES_PANIER[etat];
    return {
      id: p.id,
      reference: `#${p.id.slice(-8).toUpperCase()}`,
      date: dateRelative(p.createdAt),
      dateIso: p.createdAt.toISOString(),
      client: p.nom || p.telephone,
      telephone: p.telephone,
      region: p.ville || "—",
      statut: { ...badge, label: t(badge.label) },
      total: formatMontant(p.total, p.devise),
      totalBrut: p.total,
      commandeId: p.commandeId,
      relancable: etat !== "recupere" && !refus.has(p.telephone),
      refus: refus.has(p.telephone),
    };
  });

  return (
    <ListePaniers lignes={lignes} vues={VUES.map((v) => ({ id: v.id, label: t(v.label) }))} page={page} total={total} parPage={PAR_PAGE} vide={existe === 0} />
  );
}
