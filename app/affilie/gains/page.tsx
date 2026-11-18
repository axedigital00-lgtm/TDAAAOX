// Gains et retraits : soldes par devise, retrait Mobile Money (validé par Axso), détail des commissions.
import Link from "next/link";
import { compteAffilie } from "@/app/affilie/session";
import { prisma } from "@/lib/prisma";
import { commissionsDuCompte, soldesParDevise } from "@/lib/affiliation";
import { minimumRetrait } from "@/lib/wallet-regles";
import { tauxDuJour } from "@/lib/taux-change";
import { formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { Retirer } from "@/components/affilie/Actions";
import { Wallet, ArrowRight } from "lucide-react";
import { MascotteAxso } from "@/components/affilie/MascotteAxso";
import { Badge, type Ton } from "@/components/ui";

export const dynamic = "force-dynamic";
const carte = "bg-white border border-gray-100 rounded-2xl p-4 md:p-5";

// Les quatre états d'une commission (lib/affiliation-regles.ts › etatCommission), expliqués simplement.
// « versee » = la commission est partie dans une demande de retrait (même si l'envoi est encore en cours).
const ETAT: Record<string, { label: string; filtre: string; ton: Ton; aide: string }> = {
  en_attente: { label: "En attente", filtre: "En attente", ton: "attention", aide: "Commande pas encore livrée, ou livrée depuis moins de 48 h." },
  disponible: { label: "Disponible", filtre: "Disponibles", ton: "succes", aide: "Vente confirmée : vous pouvez la retirer." },
  versee: { label: "Retirée", filtre: "Retirées", ton: "neutre", aide: "Incluse dans une demande de retrait : suivez l'envoi dans « Retraits »." },
  annulee: { label: "Annulée", filtre: "Annulées", ton: "erreur", aide: "Commande remboursée : la commission ne sera pas versée." },
};
const RETRAIT: Record<string, { label: string; ton: Ton }> = {
  en_attente: { label: "En cours d'envoi", ton: "attention" },
  complete: { label: "Envoyé", ton: "succes" },
  echoue: { label: "Non abouti · remis en disponible", ton: "erreur" },
};

export default async function GainsAffilie({ searchParams }: { searchParams: Promise<{ etat?: string }> }) {
  const t = await getT();
  const compte = await compteAffilie();
  const userId = compte.id;
  const { etat } = await searchParams;
  const filtre = etat && ETAT[etat] ? etat : null;
  const [commissions, retraits, taux] = await Promise.all([
    commissionsDuCompte(userId),
    prisma.retraitAffilie.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    tauxDuJour(),
  ]);
  const soldes = Object.entries(soldesParDevise(commissions));
  const date = (d: Date) => d.toLocaleDateString(t.loc, { day: "2-digit", month: "short", year: "numeric" });
  const affichees = filtre ? commissions.filter((c) => c.etat === filtre) : commissions;
  const nb = (e: string) => commissions.filter((c) => c.etat === e).length;
  const puce = (actif: boolean) =>
    `inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-full text-[12.5px] font-semibold whitespace-nowrap border transition-colors ${actif ? "bg-[#111] text-white border-[#111]" : "bg-white text-[#555] border-gray-200 hover:border-gray-300"}`;

  return (
    <>
      <div className="mb-4">
        <h1 className="text-[20px] md:text-[24px] font-bold">{t("Gains et retraits")}</h1>
        <p className="text-[12.5px] text-[#888]">{t("Vos commissions, leur état et vos retraits sur Mobile Money.")}</p>
      </div>

      <div className="rounded-2xl p-5 md:p-6 mb-4 text-white space-y-5" style={{ background: "linear-gradient(135deg,#111111 0%,#1d1d1d 100%)" }}>
        {soldes.length === 0 && <p className="text-[13px] text-white/70 flex items-center gap-2"><Wallet size={15} className="text-[#F5A623]" />{t("Aucun gain pour l'instant.")}</p>}
        {soldes.map(([d, s]) => (
          <div key={d} className="space-y-4">
            <div>
              <p className="text-[12px] text-white/60">{t("Disponible au retrait")}</p>
              <p className="text-[28px] md:text-[34px] font-black text-[#F5A623] leading-tight">{formatMontant(s.disponible, d)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11.5px]">
              {[
                { label: "En attente", v: s.enAttente },
                { label: "Déjà retiré", v: s.verse },
                { label: "Total généré", v: s.enAttente + s.disponible + s.verse },
              ].map((k) => (
                <div key={k.label} className="rounded-xl bg-white/5 px-2.5 py-2 min-w-0">
                  <p className="text-white/55 truncate">{t(k.label)}</p>
                  <p className="font-bold text-[13.5px] truncate">{formatMontant(k.v, d)}</p>
                </div>
              ))}
            </div>
            <Retirer devise={d} disponible={s.disponible} minimum={minimumRetrait(d, taux)} telephone={retraits[0]?.destinataire ?? ""} />
          </div>
        ))}
        <p className="text-[11.5px] text-white/55 leading-relaxed">
          {t("Une commission devient disponible 48 h après la livraison de la commande (un produit numérique est livré dès le paiement). Axso envoie le retrait sur votre Mobile Money et vous prévient par e-mail.")}
        </p>
      </div>

      {retraits.length > 0 && (
        <div className={`${carte} mb-4`}>
          <h2 className="text-[13px] font-bold mb-3">{t("Retraits")}</h2>
          <div className="divide-y divide-gray-100">
            {retraits.map((r) => {
              const s = RETRAIT[r.statut] ?? { label: r.statut, ton: "neutre" as Ton };
              return (
                <div key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold">{formatMontant(r.montant, r.devise)}</p>
                    <p className="text-[11px] text-[#999] truncate">{date(r.createdAt)} · {r.destinataire}</p>
                  </div>
                  <Badge ton={s.ton}>{t(s.label)}</Badge>
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
            <MascotteAxso hauteur={64} />
            <p className="text-[13px] text-[#888] mb-4">{t("Pas encore de vente. Partagez vos liens pour gagner votre première commission.")}</p>
            <Link href="/affilie/liens" className="inline-flex items-center gap-2 px-4 min-h-[40px] rounded-xl bg-[#F5A623] text-[#111] text-[13px] font-bold">
              {t("Voir mes liens")}<ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <>
            {/* Ce que veut dire chaque état : toujours visible, c'est la question n° 1 d'un affilié. */}
            <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 mb-4 text-[11.5px]">
              {Object.values(ETAT).map((e) => (
                <div key={e.label} className="flex items-start gap-2">
                  <dt><Badge ton={e.ton}>{t(e.label)}</Badge></dt>
                  <dd className="text-[#777] leading-snug">{t(e.aide)}</dd>
                </div>
              ))}
            </dl>
            <nav aria-label={t("Filtrer les commissions")} className="flex gap-2 overflow-x-auto pb-3 mb-1 -mx-1 px-1">
              <Link href="/affilie/gains" scroll={false} className={puce(!filtre)} aria-current={!filtre ? "true" : undefined}>
                {t("Toutes")} <span className="opacity-60">{commissions.length}</span>
              </Link>
              {Object.entries(ETAT).map(([cle, e]) => (
                <Link key={cle} href={`/affilie/gains?etat=${cle}`} scroll={false} className={puce(filtre === cle)} aria-current={filtre === cle ? "true" : undefined}>
                  {t(e.filtre)} <span className="opacity-60">{nb(cle)}</span>
                </Link>
              ))}
            </nav>
            {affichees.length === 0 ? (
              <p className="text-[13px] text-[#888] text-center py-6">
                {t("Aucune commission dans cet état.")}{" "}
                <Link href="/affilie/gains" scroll={false} className="font-semibold text-[#B7791F] underline">{t("Voir toutes les commissions")}</Link>
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {affichees.map((c) => {
                  const s = ETAT[c.etat];
                  return (
                    <div key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold">{formatMontant(c.montant, c.devise)}</p>
                        <p className="text-[11px] text-[#999] truncate">{date(c.createdAt)} · {c.boutique}{c.numero && ` · ${t("commande")} ${c.numero}`}</p>
                      </div>
                      <Badge ton={s.ton}>{t(s.label)}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
