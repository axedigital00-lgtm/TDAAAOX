// Coûts IA réels : chaque appel est enregistré ; budget mensuel avec alerte et coupure.
import { prisma } from "@/lib/prisma";
import { pousserAdmins } from "@/lib/push";
import { moisDe } from "./coins-regles";

export const reglagesIa = async () => (await prisma.reglageIa.findUnique({ where: { id: "global" } })) ?? { id: "global", budgetMensuelUsd: null as number | null, alertePct: 80, plafondDur: true, tauxXaf: 600, actionsActives: true, alerteMois: null as string | null };

export async function depenseDuMois(maintenant = new Date()) {
  const debut = new Date(`${moisDe(maintenant)}-01T00:00:00Z`);
  return Number((await prisma.depenseIa.aggregate({ where: { createdAt: { gte: debut } }, _sum: { coutUsd: true } }))._sum.coutUsd ?? 0);
}

/** Refuse une action si l'IA est coupée ou si le plafond dur du budget est atteint. */
export async function verifierBudget() {
  const r = await reglagesIa();
  if (!r.actionsActives) return { ok: false as const, motif: "Les actions IA premium sont momentanément suspendues." };
  if (r.budgetMensuelUsd != null && r.plafondDur && (await depenseDuMois()) >= r.budgetMensuelUsd) return { ok: false as const, motif: "Les actions IA premium reprennent bientôt : budget du mois atteint." };
  return { ok: true as const };
}

export async function enregistrerDepense(d: { tenantId?: string | null; action: string; fournisseur: string; modele: string; entree?: number; sortie?: number; images?: number; coutUsd: number; coins?: number; statut?: string }) {
  await prisma.depenseIa.create({ data: { tenantId: d.tenantId ?? null, action: d.action, fournisseur: d.fournisseur, modele: d.modele, entree: d.entree ?? 0, sortie: d.sortie ?? 0, images: d.images ?? 0, coutUsd: d.coutUsd, coins: d.coins ?? 0, statut: d.statut ?? "ok" } });
  // Une alerte par mois quand le seuil est franchi.
  const r = await reglagesIa();
  if (r.budgetMensuelUsd == null) return;
  const mois = moisDe(new Date()), total = await depenseDuMois();
  if (total < (r.budgetMensuelUsd * r.alertePct) / 100 || r.alerteMois === mois) return;
  const { count } = await prisma.reglageIa.updateMany({ where: { id: "global", OR: [{ alerteMois: null }, { alerteMois: { not: mois } }] }, data: { alerteMois: mois } });
  if (count) await pousserAdmins({ titre: "⚠️ Budget IA", message: `${Math.round((total / r.budgetMensuelUsd) * 100)} % du budget du mois utilisé (${total.toFixed(2)} $ / ${r.budgetMensuelUsd} $)`, lien: "/admin/ia/coins", type: "budget_ia" }).catch(() => {});
}
