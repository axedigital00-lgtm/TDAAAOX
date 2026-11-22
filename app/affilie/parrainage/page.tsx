// Parrainage : lien personnel, filleuls et commissions de 20 % sur leurs abonnements.
import { compteAffilie } from "@/app/affilie/session";
import { tableauParrain } from "@/lib/parrainage";
import { TAUX_PARRAINAGE } from "@/lib/parrainage-regles";
import { formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { PartagerParrainage } from "@/components/affilie/PartagerParrainage";

export const dynamic = "force-dynamic";
const carte = "bg-white border border-gray-100 rounded-2xl p-4 md:p-5";

export default async function ParrainagePage() {
  const t = await getT();
  const compte = await compteAffilie();
  const d = await tableauParrain(compte.id);
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://axsoafrica.com";
  const lien = `${base}/r/${d.code}`;
  const abonnes = d.filleuls.filter((f) => f.abonne).length;
  const totaux = new Map<string, number>();
  for (const c of d.commissions) if (c.etat !== "annulee") totaux.set(c.devise, (totaux.get(c.devise) ?? 0) + c.montant);
  const gagne = [...totaux].map(([dv, v]) => formatMontant(v, dv)).join(" · ") || formatMontant(0, "XAF");
  const date = (x: Date) => x.toLocaleDateString(t.loc, { day: "2-digit", month: "short", year: "numeric" });

  return <>
    <h1 className="text-[20px] md:text-[24px] font-bold mb-4">{t("Parrainage")}</h1>
    <section className="rounded-2xl p-5 md:p-7 mb-4 text-white" style={{ background: "linear-gradient(135deg,#111 0%,#1d1d1d 100%)" }}>
      <p className="text-[52px] md:text-[72px] leading-none font-bold" style={{ color: "#EBA900" }}>{Math.round(TAUX_PARRAINAGE * 100)} %</p>
      <p className="mt-2 text-[16px] md:text-[18px] font-semibold">{t("de commission sur les abonnements de tes filleuls, à vie.")}</p>
      <p className="mt-1 text-[13px] text-white/65">{t("Partage ton lien. Chaque paiement d'abonnement de tes filleuls te rapporte, tant qu'ils restent abonnés.")}</p>
      <PartagerParrainage lien={lien} />
    </section>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {[["Clics sur ton lien", String(d.clics)], ["Filleuls inscrits", String(d.filleuls.length)], ["Filleuls abonnés", String(abonnes)], ["Commissions gagnées", gagne]].map(([l, v]) => <div key={l} className={carte}><p className="text-[12px] text-[#777]">{t(l)}</p><p className="mt-1 text-[20px] font-bold break-words">{v}</p></div>)}
    </div>
    <section className={`${carte} mb-4`}>
      <h2 className="text-[15px] font-bold mb-3">{t("Tes filleuls")}</h2>
      {d.filleuls.length === 0 ? <p className="text-[13px] text-[#777]">{t("Aucun filleul pour l'instant. Envoie ton lien à un commerçant que tu connais.")}</p> : <ul className="divide-y divide-gray-100">
        {d.filleuls.map((f) => <li key={f.id} className="flex items-center gap-3 py-2.5"><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold truncate">{f.nom}</p><p className="text-[11px] text-[#999]">{t("Inscrit le")} {date(f.depuis)}</p></div><span className={`text-[11px] font-semibold rounded-full px-2 py-1 ${f.abonne ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{f.abonne ? t("Abonné") : t("Inscrit")}</span></li>)}
      </ul>}
    </section>
    <section className={carte}>
      <h2 className="text-[15px] font-bold mb-2">{t("Comment ça marche")}</h2>
      <ol className="list-decimal pl-5 space-y-1.5 text-[13px] text-[#444]">
        <li>{t("Un commerçant s'inscrit avec ton lien dans les 60 jours suivant son clic.")}</li>
        <li>{t("À chaque paiement confirmé de son abonnement, tu reçois 20 % du montant.")}</li>
        <li>{t("Après 48 heures, la commission devient disponible dans Gains et se retire sur Mobile Money.")}</li>
      </ol>
      <p className="mt-3 text-[12px] text-[#888]">{t("Les abonnements offerts, remboursés ou l'auto-parrainage ne donnent pas droit à commission.")}</p>
    </section>
  </>;
}
