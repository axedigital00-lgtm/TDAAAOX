"use client";
// La boutique qui se construit au fil des réponses : même téléphone que le hero de la landing.
// Nom dès qu'il est saisi, couleurs et miniature du design une fois choisi, produits après l'analyse.
import { Search, ShoppingBag, Download } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { MANIFESTE_LIBRAIRIE } from "@/lib/axso-design-manifest";
import { miniatureTheme } from "./donnees";
import { COURBE } from "./ui";

type Produit = { nom: string; prix: number };

export function ApercuBoutique({ nom, digital, themeId, produits, devise, compact }: {
  nom: string; digital: boolean; themeId?: string; produits?: Produit[]; devise: string; compact?: boolean;
}) {
  const tr = useT();
  const e = themeId ? MANIFESTE_LIBRAIRIE.find((x) => x.fichier === themeId) : undefined;
  const fond = e?.couleurs.fond || "#ffffff";
  const accent = e?.couleurs.accent || "#F5A623";
  const texte = e?.couleurs.texte || "#111111";
  const nomAffiche = nom.trim() || tr("Ta boutique");
  const fondu = { transition: `background-color .6s ${COURBE}, color .6s ${COURBE}` };

  // Mobile : une bande compacte sous la jauge, pour garder la question au premier plan.
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white/90 px-3 py-2.5 shadow-[0_10px_40px_-18px_rgba(17,17,17,0.25)]" aria-label={tr("Aperçu de ta boutique")}>
        <span className="w-9 h-9 rounded-lg flex items-center justify-center text-[14px] font-extrabold flex-shrink-0" style={{ background: accent, color: "#111111", ...fondu }}>
          {nomAffiche.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold text-[#111111] truncate">{nomAffiche}</span>
          <span className="block text-[12px] text-gray-500 truncate">
            {e ? tr(e.nom) : tr("Design à choisir")}
            {produits?.length ? ` · ${tr("{0} produits", produits.length)}` : ""}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div aria-label={tr("Aperçu de ta boutique")} role="img"
      className="relative w-[270px] h-[550px] rounded-[44px] bg-[#111111] p-[10px] shadow-[0_40px_80px_-20px_rgba(17,17,17,0.55)]">
      <div className="w-full h-full rounded-[34px] overflow-hidden flex flex-col" style={{ background: fond, color: texte, ...fondu }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-[10px] font-semibold">9:41</span>
          <span className="w-16 h-4 rounded-full bg-[#111111]" />
          <span className="text-[10px] font-semibold">5G</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: `${texte}14` }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold flex-shrink-0" style={{ background: accent, color: "#111111", ...fondu }}>
              {nomAffiche.charAt(0).toUpperCase()}
            </span>
            <span className="text-[12px] font-extrabold truncate">{nomAffiche}</span>
          </div>
          <div className="flex items-center gap-2 opacity-70">{digital ? <Download size={13} /> : <><Search size={13} /><ShoppingBag size={13} /></>}</div>
        </div>

        {/* Bannière : miniature du design une fois choisi */}
        <div className="relative mx-3 mt-3 h-[150px] rounded-2xl overflow-hidden" style={{ background: `${accent}22`, ...fondu }}>
          {themeId && <img key={themeId} src={miniatureTheme(themeId)} alt="" className="w-full h-full object-cover object-top insc-fondu" />}
        </div>

        <div className="grid grid-cols-2 gap-2.5 p-3">
          {(produits?.length ? produits.slice(0, 4) : [null, null, null, null]).map((p, i) => (
            <div key={i}>
              <div className="aspect-square rounded-xl" style={{ background: `${texte}0d` }} />
              {p ? (
                <>
                  <p className="mt-1.5 text-[9.5px] font-semibold truncate">{tr(p.nom)}</p>
                  <p className="text-[9.5px] font-extrabold" style={{ color: accent }}>{p.prix.toLocaleString("fr-FR")} {tr(devise)}</p>
                </>
              ) : (
                <>
                  <div className="mt-1.5 h-2 w-3/4 rounded-full" style={{ background: `${texte}12` }} />
                  <div className="mt-1 h-2 w-1/3 rounded-full" style={{ background: `${accent}55` }} />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
