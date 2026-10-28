// Accueil de l'espace affilié : gains (par devise), clics, ventes et courbes des 30 derniers jours.
import Link from "next/link";
import { compteAffilie } from "@/app/affilie/session";
import { prisma } from "@/lib/prisma";
import { commissionsDuCompte, soldesParDevise } from "@/lib/affiliation";
import { formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { ClicsConversionsChart, CommissionsChart } from "@/components/affilie/AffiliationCharts";
import { MousePointerClick, ShoppingBag, Percent, ArrowRight, Wallet, Clock } from "lucide-react";
import { MascotteAxso } from "@/components/affilie/MascotteAxso";

export const dynamic = "force-dynamic";
const JOURS = 30;
const carte = "bg-white border border-gray-100 rounded-2xl";

export default async function AccueilAffilie() {
  const t = await getT();
  const compte = await compteAffilie();
  const userId = compte.id;

  const depuis = new Date(Date.now() - (JOURS - 1) * 86400_000);
  depuis.setHours(0, 0, 0, 0);
  const [partenariats, commissions] = await Promise.all([
    prisma.affilie.findMany({ where: { userId }, select: { id: true, clics: true, conversions: true } }),
    commissionsDuCompte(userId),
  ]);
  const clicsLog = partenariats.length
    ? await prisma.affilieClic.findMany({ where: { affilieId: { in: partenariats.map((p) => p.id) }, createdAt: { gte: depuis } }, select: { createdAt: true } })
    : [];

  const soldes = Object.entries(soldesParDevise(commissions));
  const devise = soldes[0]?.[0] ?? "XAF";
  const clics = partenariats.reduce((s, p) => s + p.clics, 0);
  const ventes = partenariats.reduce((s, p) => s + p.conversions, 0);
  const tauxConv = clics > 0 ? Math.round((ventes / clics) * 1000) / 10 : 0;

  // Séries jour par jour (commissions de la devise principale seulement : on n'additionne pas deux monnaies).
  const cle = (d: Date) => d.toISOString().slice(0, 10);
  const jours = Array.from({ length: JOURS }, (_, i) => new Date(depuis.getTime() + i * 86400_000));
  const index = new Map(jours.map((d, i) => [cle(d), i]));
  const serie = jours.map((d) => ({ date: d.toLocaleDateString(t.loc, { day: "2-digit", month: "short" }), clics: 0, conversions: 0, commissions: 0 }));
  for (const c of clicsLog) { const i = index.get(cle(c.createdAt)); if (i != null) serie[i].clics++; }
  for (const c of commissions) {
    const i = index.get(cle(c.createdAt));
    if (i == null || c.etat === "annulee") continue;
    serie[i].conversions++;
    if (c.devise === devise) serie[i].commissions += c.montant;
  }

  if (partenariats.length === 0) {
    return (
      <div className={`${carte} p-8 md:p-12 text-center`}>
        <MascotteAxso />
        <h1 className="text-[20px] font-bold mb-2">{t("Bienvenue dans votre espace affilié")}</h1>
        <p className="text-[13.5px] text-[#777] max-w-md mx-auto mb-6">
          {t("Choisissez un produit dans le catalogue, copiez votre lien et partagez-le. Chaque vente payée en ligne vous rapporte une commission, versée par Axso sur votre Mobile Money.")}
        </p>
        <Link href="/affilie/catalogue" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F5A623] text-[#111] text-[13.5px] font-bold">
          {t("Trouver mon premier produit")}<ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-[20px] md:text-[24px] font-bold mb-4 md:mb-6">{t("Bonjour {0}", (compte.name ?? "").split(" ")[0])}</h1>

      <div className="rounded-2xl p-5 md:p-6 mb-4 text-white" style={{ background: "linear-gradient(135deg,#111111 0%,#1d1d1d 100%)" }}>
        {soldes.length === 0 ? (
          <p className="text-[13px] text-white/70">{t("Pas encore de commission. Partagez vos liens : votre première vente apparaîtra ici.")}</p>
        ) : soldes.map(([d, s]) => (
          <div key={d} className="flex flex-wrap items-end justify-between gap-4 py-2 first:pt-0 last:pb-0">
            <div>
              <p className="text-[12px] text-white/60 flex items-center gap-1.5"><Wallet size={14} className="text-[#F5A623]" />{t("Disponible")}</p>
              <p className="text-[28px] md:text-[34px] font-black tracking-tight text-[#F5A623] leading-tight">{formatMontant(s.disponible, d)}</p>
            </div>
            <div className="flex gap-5 text-[12px]">
              <div><p className="text-white/50 flex items-center gap-1"><Clock size={12} />{t("En attente")}</p><p className="font-bold text-[15px]">{formatMontant(s.enAttente, d)}</p></div>
              <div><p className="text-white/50">{t("Déjà versé")}</p><p className="font-bold text-[15px]">{formatMontant(s.verse, d)}</p></div>
            </div>
          </div>
        ))}
        <Link href="/affilie/gains" className="inline-flex items-center gap-1 mt-4 text-[12.5px] font-semibold text-[#F5A623]">{t("Voir mes gains et retirer")}<ArrowRight size={13} /></Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Clics", v: clics.toLocaleString(t.loc), Icon: MousePointerClick, c: "#3b82f6" },
          { label: "Ventes", v: ventes.toLocaleString(t.loc), Icon: ShoppingBag, c: "#10b981" },
          { label: "Conversion", v: `${tauxConv.toLocaleString(t.loc)} %`, Icon: Percent, c: "#8b5cf6" },
        ].map((k) => (
          <div key={k.label} className={`${carte} p-4 min-w-0`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${k.c}14` }}><k.Icon size={16} style={{ color: k.c }} /></div>
            <p className="text-[19px] md:text-[22px] font-bold leading-none truncate">{k.v}</p>
            <p className="text-[11px] text-[#999] mt-1.5">{t(k.label)}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <ClicsConversionsChart donnees={serie} />
        <CommissionsChart donnees={serie} devise={devise} />
      </div>
    </>
  );
}
