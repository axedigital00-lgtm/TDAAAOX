// Gains et retraits : soldes par devise, retrait Mobile Money (validé par Axso), détail des commissions.
import { compteAffilie } from "@/app/affilie/session";
import { prisma } from "@/lib/prisma";
import { commissionsDuCompte, soldesParDevise } from "@/lib/affiliation";
import { minimumRetrait } from "@/lib/wallet-regles";
import { tauxDuJour } from "@/lib/taux-change";
import { formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { Retirer } from "@/components/affilie/Actions";
import { Wallet, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";
const carte = "bg-white border border-gray-100 rounded-2xl p-4 md:p-5";

const ETAT: Record<string, { label: string; cls: string }> = {
  en_attente: { label: "En attente", cls: "bg-amber-50 text-amber-700" },
  disponible: { label: "Disponible", cls: "bg-emerald-50 text-emerald-700" },
  versee: { label: "Versée", cls: "bg-gray-100 text-gray-600" },
  annulee: { label: "Annulée", cls: "bg-red-50 text-red-600" },
};
const RETRAIT: Record<string, { label: string; cls: string }> = {
  en_attente: { label: "En cours d'envoi", cls: "bg-amber-50 text-amber-700" },
  complete: { label: "Envoyé", cls: "bg-emerald-50 text-emerald-700" },
  echoue: { label: "Non abouti · remis en disponible", cls: "bg-red-50 text-red-600" },
};

export default async function GainsAffilie() {
  const t = await getT();
  const compte = await compteAffilie();
  const userId = compte.id;
  const [commissions, retraits, taux] = await Promise.all([
    commissionsDuCompte(userId),
    prisma.retraitAffilie.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    tauxDuJour(),
  ]);
  const soldes = Object.entries(soldesParDevise(commissions));
  const date = (d: Date) => d.toLocaleDateString(t.loc, { day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <h1 className="text-[20px] md:text-[24px] font-bold mb-4">{t("Gains et retraits")}</h1>

      <div className="rounded-2xl p-5 md:p-6 mb-4 text-white space-y-5" style={{ background: "linear-gradient(135deg,#111111 0%,#1d1d1d 100%)" }}>
        {soldes.length === 0 && <p className="text-[13px] text-white/70 flex items-center gap-2"><Wallet size={15} className="text-[#F5A623]" />{t("Aucun gain pour l'instant.")}</p>}
        {soldes.map(([d, s]) => (
          <div key={d} className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[12px] text-white/60">{t("Disponible")}</p>
                <p className="text-[28px] md:text-[34px] font-black text-[#F5A623] leading-tight">{formatMontant(s.disponible, d)}</p>
              </div>
              <p className="text-[12px] text-white/60">{t("En attente")} : <span className="font-bold text-white">{formatMontant(s.enAttente, d)}</span></p>
            </div>
            <Retirer devise={d} disponible={s.disponible} minimum={minimumRetrait(d, taux)} telephone={retraits[0]?.destinataire ?? ""} />
          </div>
        ))}
        <p className="text-[11.5px] text-white/50 leading-relaxed">
          {t("Une commission devient disponible 48 h après la livraison de la commande (tout de suite pour un produit numérique). Axso envoie le retrait sur votre Mobile Money et vous prévient par e-mail.")}
        </p>
      </div>

      {retraits.length > 0 && (
        <div className={`${carte} mb-4`}>
          <h2 className="text-[13px] font-bold mb-3">{t("Retraits")}</h2>
          <div className="divide-y divide-gray-100">
            {retraits.map((r) => {
              const s = RETRAIT[r.statut] ?? { label: r.statut, cls: "bg-gray-100 text-gray-600" };
              return (
                <div key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold">{formatMontant(r.montant, r.devise)}</p>
                    <p className="text-[11px] text-[#AAA] truncate">{date(r.createdAt)} · {r.destinataire}</p>
                  </div>
                  <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${s.cls}`}>{t(s.label)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={carte}>
        <h2 className="text-[13px] font-bold mb-3">{t("Commissions")}</h2>
        {commissions.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag size={28} className="mx-auto mb-2 text-[#DDD]" />
            <p className="text-[13px] text-[#999]">{t("Pas encore de vente. Partagez vos liens pour gagner votre première commission.")}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {commissions.map((c) => {
              const s = ETAT[c.etat];
              return (
                <div key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold">{formatMontant(c.montant, c.devise)}</p>
                    <p className="text-[11px] text-[#AAA] truncate">{date(c.createdAt)} · {c.boutique}{c.numero && ` · ${t("commande")} ${c.numero}`}</p>
                  </div>
                  <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${s.cls}`}>{t(s.label)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
