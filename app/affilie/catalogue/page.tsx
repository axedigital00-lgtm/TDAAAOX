// Catalogue de l'affilié : tous les produits ouverts à l'affiliation, avec sa commission et son lien en un clic.
import { compteAffilie } from "@/app/affilie/session";
import { catalogueAffiliation } from "@/lib/affiliation";
import { estNumerique } from "@/lib/affiliation-regles";
import { formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { Initiale } from "@/components/affilie/EspaceAffilieShell";
import { ObtenirLien } from "@/components/affilie/Actions";
import { BadgeCheck, Package, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CatalogueAffilie({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; tri?: string }> }) {
  const t = await getT();
  const compte = await compteAffilie();
  const { q, cat, tri } = await searchParams;
  const { produits, total, categories } = await catalogueAffiliation({ q, cat, tri, userId: compte.id });
  const champ = "px-3.5 py-2.5 text-base sm:text-[13px] rounded-xl border border-gray-200 bg-white outline-none focus:border-[#F5A623]";

  return (
    <>
      <div className="mb-4">
        <h1 className="text-[20px] md:text-[24px] font-bold">{t("Catalogue")}</h1>
        <p className="text-[12.5px] text-[#999]">{t("{0} produit(s) à recommander · commission sur chaque vente payée en ligne", total)}</p>
      </div>

      <form method="GET" className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BBB]" />
          <input name="q" defaultValue={q} placeholder={t("Produit ou boutique…")} className={`${champ} w-full pl-10`} />
        </div>
        {categories.length > 0 && (
          <select name="cat" defaultValue={cat ?? ""} className={champ}>
            <option value="">{t("Toutes catégories")}</option>
            {categories.map((c) => <option key={c} value={c}>{t(c)}</option>)}
          </select>
        )}
        <select name="tri" defaultValue={tri ?? "commission"} className={champ}>
          <option value="commission">{t("Meilleure commission")}</option>
          <option value="populaire">{t("Les plus vendus")}</option>
        </select>
        <button className="px-5 py-2.5 rounded-xl bg-[#111] text-white text-[13px] font-semibold">{t("Filtrer")}</button>
      </form>

      {produits.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center">
          <Package size={32} className="mx-auto mb-3 text-[#DDD]" />
          <p className="text-[13px] text-[#999]">{t("Aucun produit ne correspond.")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {produits.map((p) => (
            <div key={p.produitId} className="bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-[#F5F5F5]">
                {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Package size={30} className="absolute inset-0 m-auto text-[#DDD]" />}
                <span className="absolute top-2 left-2 text-[10.5px] font-black px-2 py-1 rounded-lg bg-[#F5A623] text-[#111]">+{Math.round(p.taux * 100)} %</span>
                {estNumerique(p.type) && <span className="absolute top-2 right-2 text-[9.5px] font-bold px-2 py-0.5 rounded-lg bg-black/60 text-white">{t("Numérique")}</span>}
              </div>
              <div className="p-3 flex flex-col flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-snug line-clamp-2 mb-1">{p.nom}</p>
                <div className="flex items-center gap-1 mb-2 min-w-0">
                  <Initiale nom={p.boutique} logoUrl={p.logoUrl} taille={16} />
                  <span className="text-[11px] text-[#999] truncate">{p.boutique}</span>
                  {p.certifie && <BadgeCheck size={12} className="text-[#F5A623] flex-shrink-0" />}
                </div>
                <p className="text-[12px] text-[#777]">{formatMontant(p.prix, p.devise)}</p>
                <p className="text-[12.5px] font-bold text-emerald-600 mb-3">{t("Vous gagnez ~{0}", formatMontant(p.gain, p.devise))}</p>
                <div className="mt-auto">
                  <ObtenirLien produitId={p.produitId} nom={p.nom} partenariat={p.partenariat} validationManuelle={p.validationManuelle} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
