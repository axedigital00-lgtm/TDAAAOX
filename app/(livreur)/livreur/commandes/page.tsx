import { auth } from "@/lib/auth";
import { STATUTS_COURSE_ACTIVE } from "@/lib/commandes";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MapPin, ChevronRight, Package, Banknote } from "lucide-react";
import { formatDate, formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { statutLivreur } from "@/components/livreur/statuts";
import { estCOD } from "@/lib/gains-livreur";

export default async function HistoriquePage() {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");

  const livreur = await prisma.livreur.findFirst({
    where: { userId: (session.user as any)?.id },
  });
  if (!livreur) redirect("/connexion");

  // Compteurs sur toutes les courses (avant : calculés sur les 50 affichées seulement).
  const [commandes, parStatut] = await Promise.all([
    prisma.commande.findMany({
      where: { livreurId: livreur.id },
      include: { lignes: { take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.commande.groupBy({ by: ["statut"], where: { livreurId: livreur.id }, _count: true }),
  ]);
  const compte = (f: (s: string) => boolean) => parStatut.filter((g) => f(g.statut)).reduce((n, g) => n + g._count, 0);
  const stats = {
    total: compte(() => true),
    livrees: compte((s) => s === "livree"),
    enCours: compte((s) => STATUTS_COURSE_ACTIVE.includes(s)),
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white font-playfair">{t("Mes livraisons")}</h1>
        <p className="text-gray-400 text-sm mt-1">{t("Toutes les courses qui vous ont été attribuées, de la plus récente à la plus ancienne.")}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-[#141414] to-[#0d0d0d] border border-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-white">{stats.total}</p>
          <p className="text-gray-400 text-xs">{t("Au total")}</p>
        </div>
        <div className="bg-gradient-to-br from-[#141414] to-[#0d0d0d] border border-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#F5A623]">{stats.enCours}</p>
          <p className="text-gray-400 text-xs">{t("En cours")}</p>
        </div>
        <div className="bg-gradient-to-br from-[#141414] to-[#0d0d0d] border border-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-green-400">{stats.livrees}</p>
          <p className="text-gray-400 text-xs">{t("Livrées")}</p>
        </div>
      </div>

      <div className="space-y-2">
        {commandes.length === 0 ? (
          <div className="bg-gradient-to-br from-[#141414] to-[#0d0d0d] border border-white/5 rounded-3xl p-8 text-center">
            <Package size={28} className="text-[#F5A623] mx-auto mb-3" aria-hidden />
            <p className="text-white font-semibold">{t("Aucune livraison pour le moment")}</p>
            <p className="text-gray-400 text-sm mt-2">{t("Les courses que les boutiques vous attribuent apparaîtront ici.")}</p>
          </div>
        ) : commandes.map((cmd) => {
          const st = statutLivreur(cmd.statut);
          // Espèces encaissées pas encore remises à la boutique : visible dans la liste.
          const especesARemettre = cmd.statut === "livree" && estCOD(cmd.methodePaiement) && !cmd.codRemis;
          return (
            <Link
              key={cmd.id}
              href={`/livreur/commande/${cmd.id}`}
              className="flex items-center gap-3 bg-gradient-to-br from-[#141414] to-[#0d0d0d] border border-white/5 rounded-2xl p-4 hover:border-[#F5A623]/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/5" style={{ color: st.color }}>
                    {t(st.label)}
                  </span>
                  <span className="text-gray-500 text-xs font-mono">#{cmd.numero}</span>
                </div>
                <p className="text-white text-sm font-medium truncate">{t(cmd.clientNom)}</p>
                <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                  <MapPin size={10} aria-hidden />
                  {t(cmd.ville)}
                </p>
                {especesARemettre && (
                  <p className="text-[#F5A623] text-xs flex items-center gap-1 mt-1"><Banknote size={11} aria-hidden />{t("Espèces pas encore remises à la boutique")}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <p className="text-white text-sm font-bold">{formatMontant(cmd.montantTotal, cmd.devise)}</p>
                <p className="text-gray-500 text-xs">{formatDate(cmd.livreeAt ?? cmd.updatedAt)}</p>
              </div>
              <ChevronRight size={14} className="text-gray-500 flex-shrink-0" aria-hidden />
            </Link>
          );
        })}
        {stats.total > commandes.length && (
          <p className="text-center text-gray-500 text-xs pt-2">{t("Les {0} courses les plus récentes sont affichées.", commandes.length)}</p>
        )}
      </div>
    </div>
  );
}
