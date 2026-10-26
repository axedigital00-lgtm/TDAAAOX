"use client";

// Carte « Affiliés » de Ma boutique (modèle Selar/Gumroad : le marchand ouvre ses produits).
// - Produits déjà cochés sans programme : confirmation unique (les proposer ou les retirer).
// - Rien d'ouvert : invitation, masquable sur cet appareil.
// - Programme en place : rien.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";

const CLE_MASQUEE = "axso_carte_affilies_masquee";

export function CarteAffilies() {
  const tr = useT();
  const [etat, setEtat] = useState<{ programme: boolean; produitsOuverts: number } | null>(null);
  const [masquee, setMasquee] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    try { setMasquee(localStorage.getItem(CLE_MASQUEE) === "1"); } catch { setMasquee(false); }
    fetch("/api/affiliation/ouverture").then((r) => (r.ok ? r.json() : null)).then(setEtat).catch(() => {});
  }, []);

  async function choisir(choix: "oui" | "non") {
    setEnvoi(true);
    const r = await fetch("/api/affiliation/ouverture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choix }) }).catch(() => null);
    setEnvoi(false);
    if (!r?.ok) return toast.error(tr("Erreur, réessaie"));
    toast.success(choix === "oui" ? tr("Tes produits sont proposés aux affiliés") : tr("Produits retirés de l'affiliation"));
    setEtat(choix === "oui" ? { programme: true, produitsOuverts: etat!.produitsOuverts } : { programme: false, produitsOuverts: 0 });
  }

  if (!etat || etat.programme) return null;

  if (etat.produitsOuverts > 0) {
    return (
      <div className="ax-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 border border-emerald-200 bg-emerald-50">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0"><Zap size={18} className="text-emerald-700" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-[#111111]">{tr("Proposer tes produits aux affiliés ?")}</p>
          <p className="text-[13px] text-[#555555]">
            {tr("{0} de tes produits sont cochés « ouverts aux affiliés », mais aucun affilié ne les voit encore. Si tu acceptes, des affiliés pourront les promouvoir : tu ne paies une commission que sur les ventes qu'ils t'apportent.", etat.produitsOuverts)}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button disabled={envoi} onClick={() => choisir("non")} className="h-10 px-4 rounded-xl text-[13px] font-semibold text-[#555555] bg-white border border-[#E5E5E5] hover:bg-[#F5F5F5] disabled:opacity-50">{tr("Non, les retirer")}</button>
          <button disabled={envoi} onClick={() => choisir("oui")} className="h-10 px-4 rounded-xl text-[13px] font-bold text-white bg-[#111111] hover:opacity-90 disabled:opacity-50">{tr("Oui, les proposer")}</button>
        </div>
      </div>
    );
  }

  if (masquee) return null;
  return (
    <div className="ax-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#FFF4E0] flex items-center justify-center flex-shrink-0"><Zap size={18} className="text-[#F5A623]" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-[#111111]">{tr("Laisse des affiliés vendre pour toi")}</p>
        <p className="text-[13px] text-[#555555]">{tr("Ouvre un produit aux affiliés depuis sa fiche (« Ouvrir aux affiliés ») : ils le font connaître, et tu ne paies que sur les ventes réalisées.")}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() => { setMasquee(true); try { localStorage.setItem(CLE_MASQUEE, "1"); } catch {} }} className="h-10 px-4 rounded-xl text-[13px] font-semibold text-[#555555] hover:bg-[#F5F5F5]">{tr("Plus tard")}</button>
        <Link href="/dashboard/produits" className="h-10 px-4 rounded-xl text-[13px] font-bold text-white bg-[#111111] hover:opacity-90 inline-flex items-center">{tr("Choisir mes produits")}</Link>
      </div>
    </div>
  );
}
