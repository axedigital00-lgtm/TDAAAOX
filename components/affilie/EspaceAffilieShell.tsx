"use client";
// Cadre de l'Espace affilié (vue d'ensemble /mon-espace-affilie + portail /affilie/[token]) :
// barre latérale sur ordinateur, en-tête + barre d'onglets flottante sur téléphone,
// dans le style du tableau de bord marchand.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Search, ArrowLeft, ArrowUpRight, type LucideIcon } from "lucide-react";
import { listerAffiliationsLocales, type AffiliationLocale } from "@/lib/affiliation-local";
import { useT } from "@/components/I18nProvider";
import { LangueSelecteur } from "@/components/ui/LangueSelecteur";

export interface Onglet { id: string; label: string; Icon: LucideIcon }

export function Initiale({ nom, logoUrl, taille = 28 }: { nom: string; logoUrl?: string | null; taille?: number }) {
  return logoUrl ? (
    <img src={logoUrl} alt="" className="rounded-lg object-cover flex-shrink-0 bg-white" style={{ width: taille, height: taille }} />
  ) : (
    <span className="rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-[#B7791F]"
      style={{ width: taille, height: taille, background: "rgba(245,166,35,0.14)", fontSize: taille * 0.42 }}>
      {nom.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function EspaceAffilieShell({ titre, retour, enTete, onglets, ongletActif, choisirOnglet, children }: {
  titre: string;
  /** Affiché au-dessus des onglets. */
  enTete?: React.ReactNode;
  /** Lien « retour » de l'en-tête mobile (portail d'une boutique → vue d'ensemble). */
  retour?: string;
  onglets?: Onglet[];
  ongletActif?: string;
  choisirOnglet?: (id: string) => void;
  children: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const [boutiques, setBoutiques] = useState<AffiliationLocale[]>([]);
  // Relu à chaque page : le portail ouvert vient peut-être d'être enregistré.
  useEffect(() => { setBoutiques(listerAffiliationsLocales()); }, [pathname]);

  const lien = (actif: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${actif ? "bg-[#FFF6E6] text-[#111]" : "text-[#666] hover:bg-gray-50"}`;

  return (
    <div className="min-h-dvh bg-[#F5F5F5] text-[#111] md:flex" style={{ fontFamily: "'Poppins','Century Gothic',system-ui,sans-serif" }}>
      {/* Barre latérale (ordinateur) */}
      <aside className="hidden md:flex flex-col w-[252px] h-screen sticky top-0 bg-white border-r border-gray-100 flex-shrink-0">
        <div className="h-[60px] flex items-center gap-2.5 px-5 border-b border-gray-100">
          <Link href="/" className="text-[19px] font-black tracking-tight">Axso</Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-full bg-[#111] text-[#F5A623]">{t("Affilié")}</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <Link href="/mon-espace-affilie" className={lien(pathname === "/mon-espace-affilie")}>
            <LayoutGrid size={16} className="text-[#F5A623]" />{t("Vue d'ensemble")}
          </Link>
          <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#BBB]">{t("Mes boutiques")}</p>
          {boutiques.length === 0 && <p className="px-3 text-[12px] text-[#AAA]">{t("Aucune pour l'instant")}</p>}
          {boutiques.map((b) => (
            <Link key={b.portalToken} href={`/affilie/${b.portalToken}`} className={lien(pathname === `/affilie/${b.portalToken}`)}>
              <Initiale nom={b.nomBoutique} logoUrl={b.logoUrl} taille={24} />
              <span className="truncate">{b.nomBoutique}</span>
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100 space-y-2">
          <LangueSelecteur />
          <Link href="/affiliation" className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-[#111] text-white text-[13px] font-semibold hover:bg-black">
            <span className="flex items-center gap-2"><Search size={15} className="text-[#F5A623]" />{t("Trouver des produits")}</span>
            <ArrowUpRight size={14} className="opacity-60" />
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* En-tête (téléphone) */}
        <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100">
          <div className="h-14 px-4 flex items-center gap-3">
            {retour ? (
              <Link href={retour} aria-label={t("Retour")} className="w-9 h-9 -ml-1 rounded-xl flex items-center justify-center hover:bg-gray-50">
                <ArrowLeft size={18} />
              </Link>
            ) : (
              <span className="text-[17px] font-black tracking-tight">Axso</span>
            )}
            <p className="flex-1 min-w-0 truncate text-[14px] font-bold">{titre}</p>
            <LangueSelecteur ouvrirVers="bas" aligner="droite" />
            <Link href="/affiliation" aria-label={t("Trouver des produits")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#111] text-[#F5A623]">
              <Search size={16} />
            </Link>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-8 pb-32 md:pb-12">
          {enTete}
          {onglets && choisirOnglet && (
            <div className="hidden md:flex gap-1 p-1 mb-6 bg-white rounded-xl border border-gray-100 w-fit">
              {onglets.map((o) => (
                <button key={o.id} onClick={() => choisirOnglet(o.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${ongletActif === o.id ? "bg-[#111] text-white" : "text-[#888] hover:text-[#111]"}`}>
                  <o.Icon size={15} />{t(o.label)}
                </button>
              ))}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Onglets flottants (téléphone) */}
      {onglets && choisirOnglet && (
        <nav className="md:hidden fixed z-40 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-[28px] bg-white/97 border border-gray-200/80"
          style={{ bottom: "max(14px, env(safe-area-inset-bottom))", boxShadow: "0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)" }}>
          {onglets.map((o) => {
            const actif = ongletActif === o.id;
            return (
              <button key={o.id} onClick={() => { choisirOnglet(o.id); window.scrollTo({ top: 0 }); }}
                className={`flex flex-col items-center gap-0.5 min-w-[76px] px-3 py-1.5 rounded-[22px] transition-colors ${actif ? "bg-[#111] text-white" : "text-[#999]"}`}>
                <o.Icon size={19} className={actif ? "text-[#F5A623]" : ""} />
                <span className="text-[10.5px] font-bold leading-none">{t(o.label)}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
