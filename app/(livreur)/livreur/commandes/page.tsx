import { auth } from "@/lib/auth";
import { STATUTS_COURSE_ACTIVE } from "@/lib/commandes";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MapPin, ChevronRight } from "lucide-react";
import { formatDate, formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  confirmee:      { label: "À récupérer", color: "#3f3f3d", bg: "#3f3f3d15" },
  en_preparation: { label: "En préparation", color: "#5b45c9", bg: "#5b45c915" },
  expediee:       { label: "En livraison", color: "#8f6500", bg: "#EDA90015" },
  tentative_echouee: { label: "À retenter", color: "#b3261e", bg: "#b3261e15" },
  livree:         { label: "Livré", color: "#0d6b3b", bg: "#0d6b3b15" },
  annulee:        { label: "Annulé", color: "#b3261e", bg: "#b3261e15" },
};

export default async function HistoriquePage() {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");

  const livreur = await prisma.livreur.findFirst({
    where: { userId: (session.user as any)?.id },
  });
  if (!livreur) redirect("/connexion");

  const commandes = await prisma.commande.findMany({
    where: { livreurId: livreur.id },
    include: { lignes: { take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const stats = {
    total: commandes.length,
    livrees: commandes.filter((c) => c.statut === "livree").length,
    enCours: commandes.filter((c) => STATUTS_COURSE_ACTIVE.includes(c.statut)).length,
  };

  return (
    <div className="space-y-5">
      <div>
        <Link href="/livreur" className="text-gray-400 text-sm hover:text-white">{t("← Retour")}</Link>
        <h1 className="text-2xl font-semibold tracking-tight text-white mt-2">{t("Mes livraisons")}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#171817] border border-white/15 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-white">{stats.total}</p>
          <p className="text-gray-300 text-xs">{t("Total")}</p>
        </div>
        <div className="bg-[#171817] border border-white/15 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#EDA900]">{t(stats.enCours)}</p>
          <p className="text-gray-300 text-xs">{t("En cours")}</p>
        </div>
        <div className="bg-[#171817] border border-white/15 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-green-400">{t(stats.livrees)}</p>
          <p className="text-gray-300 text-xs">{t("Livrées")}</p>
        </div>
      </div>

      <div className="space-y-2">
        {commandes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t("Aucune livraison assignée")}</div>
        ) : commandes.map((cmd) => {
          const st = STATUT_CONFIG[cmd.statut] || STATUT_CONFIG.confirmee;
          return (
            <Link
              key={cmd.id}
              href={`/livreur/commande/${cmd.id}`}
              className="flex items-center gap-4 bg-[#171817] border border-white/15 rounded-2xl p-4 hover:border-[#EDA900]/20 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: st.color, backgroundColor: st.bg }}>
                    {t(st.label)}
                  </span>
                  <span className="text-gray-300 text-xs font-mono">{cmd.numero}</span>
                </div>
                <p className="text-white text-sm font-medium">{t(cmd.clientNom)}</p>
                <p className="text-gray-300 text-xs flex items-center gap-1 mt-0.5">
                  <MapPin size={10} />
                  {t(cmd.ville)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <p className="text-[#EDA900] text-sm font-bold">{formatMontant(cmd.montantTotal, cmd.devise)}</p>
                <p className="text-gray-300 text-xs">{formatDate(cmd.updatedAt)}</p>
              </div>
              <ChevronRight size={14} className="text-gray-500 flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
