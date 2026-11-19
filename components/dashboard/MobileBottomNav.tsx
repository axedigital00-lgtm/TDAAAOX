"use client";
import { LangueSelecteur } from "@/components/ui/LangueSelecteur";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { groupesVisibles, primairesVisibles, estActif } from "@/components/dashboard/Sidebar";
import { X, Megaphone, Truck, Calendar, Search, MessageSquare, LifeBuoy, Lock } from "lucide-react";
import {
  IconAccueil, IconProduits, IconAxia, IconCommandes,
} from "@/components/dashboard/AppIcons";
import { useT } from "@/components/I18nProvider";
import { useAbonnementOverlay } from "@/components/dashboard/AbonnementOverlayProvider";
import { ouvrirAxia, useEtatAxia } from "@/components/dashboard/AxiaPanneau";
import { palierAuMoins, type Palier } from "@/lib/plans";
import type { ModuleKey, Niveau } from "@/lib/permissions";

// Tiroir « Plus » : le MÊME menu que la barre latérale (components/dashboard/Sidebar.tsx :
// mêmes entrées, mêmes droits d'équipe, même mode caisse, mêmes verrous de palier), pour
// qu'un marchand sur téléphone trouve tout ce qu'il trouve sur ordinateur.
// AUTRES_OUTILS : pages qui n'ont pas d'entrée dans la barre latérale mais en avaient une ici.
type ItemMobile = { href: string; label: string; Icon: React.ComponentType<{ size?: number; className?: string }>; moduleKey?: ModuleKey; requiresPalier?: Palier; messageVerrou?: string; opensAbonnement?: boolean };

export const AUTRES_OUTILS: ItemMobile[] = [
  { href: "/dashboard/scheduler",  label: "Planificateur",        Icon: Calendar,      moduleKey: "marketing" },
  { href: "/dashboard/publicite",  label: "Publicité Ads",        Icon: Megaphone,     moduleKey: "marketing" },
  { href: "/dashboard/sms",        label: "SMS / WhatsApp",       Icon: MessageSquare, moduleKey: "marketing" },
  { href: "/dashboard/veille",     label: "Veille concurrence",   Icon: Search,        moduleKey: "marketing" },
  { href: "/dashboard/logistique", label: "Logistique",           Icon: Truck,         moduleKey: "commandes" },
  { href: "/dashboard/support",    label: "Signaler un problème", Icon: LifeBuoy },
];

const MAIN_TABS = [
  // « Accueil » désigne désormais le parcours de démarrage (menu « Plus ») : cet onglet garde le nom de sa page.
  { href: "/dashboard/accueil",   label: "Tableau de bord", AppIcon: IconAccueil, exact: true },
  { href: "/dashboard/produits",  label: "Produits",  AppIcon: IconProduits, moduleKey: "produits" as ModuleKey },
  { href: "/dashboard/commandes", label: "Commandes", AppIcon: IconCommandes, moduleKey: "commandes" as ModuleKey },
];

export function MobileBottomNav({ permissions, modePos = "simple", demarrage }: {
  permissions?: Record<ModuleKey, Niveau>;
  modePos?: "simple" | "pro";
  /** Parcours de démarrage : étapes restantes et entrées à compléter (mêmes pastilles que la barre latérale). */
  demarrage?: { restantes: number; hrefs: string[] } | null;
}) {
  const t = useT();
  const { openAbonnement, palier } = useAbonnementOverlay();
  const autorise = (it: { moduleKey?: ModuleKey }) => !permissions || !it.moduleKey || permissions[it.moduleKey] !== "aucun";
  const onglets = MAIN_TABS.filter(autorise);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Bouton AXIA : ouvre le panneau AXIA en plein écran (AxiaPanneau ; un compte Essentiel y lit
  // l'offre Pro). Pastille : propositions d'AXIA en attente.
  const { ouvert: axiaActive, compte: compteAxia } = useEtatAxia();

  return (
    <>
      {/* ── Îlot flottant ── */}
      <div
        className="md:hidden fixed z-50 left-1/2 -translate-x-1/2"
        style={{ bottom: `calc(env(safe-area-inset-bottom) + 16px)` }}
      >
        <div className="relative flex items-end">

          {/* Axia — flottante au-dessus du centre */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-10 z-10 flex flex-col items-center">
            <button
              onClick={() => ouvrirAxia()}
              aria-label={compteAxia > 0 ? t("Ouvrir AXIA ({0} propositions en attente)", String(compteAxia)) : t("Ouvrir AXIA")}
              aria-expanded={axiaActive}
              className="relative transition-transform active:scale-90"
              style={{ filter: `drop-shadow(0 4px 14px rgba(17,17,17,${axiaActive ? "0.55" : "0.35"}))` }}
            >
              <IconAxia size={52} />
              {compteAxia > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">{compteAxia}</span>
              )}
            </button>
          </div>

          {/* Pilule */}
          <div
            className="flex items-center gap-0 px-2 pt-2 pb-1.5 rounded-[32px]"
            style={{
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
              border: "1px solid rgba(235,235,235,0.8)",
            }}
          >
            {/* Tabs gauche */}
            {onglets.filter(o => o.href !== "/dashboard/commandes").map((tab) => {
              const active = tab.exact
                ? pathname === tab.href
                : pathname.startsWith(tab.href);
              const AppIcon = tab.AppIcon!;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="flex flex-col items-center gap-0.5 px-3 min-[380px]:px-4 py-1 rounded-2xl transition-all"
                >
                  <div className={`transition-all duration-200 ${active ? "scale-105" : "scale-90 opacity-50"}`}>
                    <AppIcon size={28} />
                  </div>
                  <span
                    className="text-[9.5px] font-bold leading-none"
                    style={{ color: active ? "#F5A623" : "#BBBBBB" }}
                  >
                    {t(tab.label)}
                  </span>
                  {active && (
                    <div className="w-1 h-1 rounded-full bg-[#F5A623] mt-0.5" />
                  )}
                </Link>
              );
            })}

            {/* Espace central pour Axia */}
            <div className="w-14 flex-shrink-0 flex flex-col items-center pt-1 pb-0.5">
              <span
                className="text-[9.5px] font-bold leading-none"
                style={{ color: axiaActive ? "#111111" : "#CCCCCC" }}
              >
                {t("Axia")}
              </span>
              {axiaActive && (
                <div className="w-1 h-1 rounded-full bg-[#111111] mt-0.5" />
              )}
            </div>

            {/* Tab droite — Commandes */}
            {onglets.filter(o => o.href === "/dashboard/commandes").map((tab) => {
              const active = pathname.startsWith(tab.href);
              const AppIcon = tab.AppIcon!;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="flex flex-col items-center gap-0.5 px-3 min-[380px]:px-4 py-1 rounded-2xl transition-all"
                >
                  <div className={`transition-all duration-200 ${active ? "scale-105" : "scale-90 opacity-50"}`}>
                    <AppIcon size={28} />
                  </div>
                  <span
                    className="text-[9.5px] font-bold leading-none"
                    style={{ color: active ? "#F5A623" : "#BBBBBB" }}
                  >
                    {t(tab.label)}
                  </span>
                  {active && (
                    <div className="w-1 h-1 rounded-full bg-[#F5A623] mt-0.5" />
                  )}
                </Link>
              );
            })}

            {/* Bouton Plus */}
            <button
              type="button"
              aria-label={t("Tous les modules")}
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 min-[380px]:px-4 py-1 rounded-2xl transition-all"
            >
              <div
                className={`w-7 h-7 flex items-center justify-center rounded-xl transition-all ${drawerOpen ? "bg-[#F5A623]/12 scale-105" : "scale-90 opacity-50"}`}
              >
                <div className="flex flex-col gap-[3px]">
                  <div className="flex gap-[3px]">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: drawerOpen ? "#F5A623" : "#AAAAAA" }} />
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: drawerOpen ? "#F5A623" : "#AAAAAA" }} />
                  </div>
                  <div className="flex gap-[3px]">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: drawerOpen ? "#F5A623" : "#AAAAAA" }} />
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: drawerOpen ? "#F5A623" : "#AAAAAA" }} />
                  </div>
                </div>
              </div>
              <span
                className="text-[9.5px] font-bold leading-none"
                style={{ color: drawerOpen ? "#F5A623" : "#BBBBBB" }}
              >
                {t("Plus")}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Drawer tous les modules ── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end"
          role="dialog" aria-modal="true" aria-label={t("Tous les modules")}
          onKeyDown={(e) => { if (e.key === "Escape") setDrawerOpen(false); }}
          onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false); }}
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="bg-white rounded-t-[28px] overflow-hidden"
            style={{ maxHeight: "82vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}
          >
            {/* Handle + header */}
            <div className="px-5 pt-3 pb-4 border-b border-[#F5F5F5]">
              <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-[#111111]">{t("Tous les modules")}</h2>
                  <p className="text-[12px] text-doux mt-0.5">{t("Tout le menu, comme sur ordinateur")}</p>
                </div>
                <button
                  type="button"
                  aria-label={t("Fermer")}
                  onClick={() => setDrawerOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-carte-2 rounded-xl text-doux"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Modules : même menu que la barre latérale, puis les outils propres au téléphone. */}
            <nav aria-label={t("Tous les modules")} className="overflow-y-auto pb-10" style={{ maxHeight: "calc(82vh - 90px)" }}>
              {[
                { id: "raccourcis", label: "Raccourcis", items: primairesVisibles(permissions) as ItemMobile[] },
                ...groupesVisibles(permissions, modePos, pathname, searchParams).map((g) => ({ id: g.id, label: g.label, items: g.items as ItemMobile[] })),
                { id: "autres", label: "Autres outils", items: AUTRES_OUTILS.filter(autorise) },
              ].filter((g) => g.items.length > 0).map((group) => (
                <section key={group.id} className="px-4 pt-5">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-doux">{t(group.label)}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {group.items.map((item) => {
                      const Icon = item.Icon;
                      const active = estActif(item, pathname, searchParams);
                      const verrou = !!item.requiresPalier && !palierAuMoins(palier, item.requiresPalier);
                      const pastille = item.href === "/dashboard/demarrer" ? (demarrage?.restantes ?? 0) > 0 : !!demarrage?.hrefs.includes(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={(e) => {
                            setDrawerOpen(false);
                            if (verrou || item.opensAbonnement) {
                              e.preventDefault();
                              if (verrou) openAbonnement(item.requiresPalier, item.messageVerrou);
                              else openAbonnement();
                            }
                          }}
                          className={`relative flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 transition-colors ${active ? "border-primaire bg-primaire-fond" : "border-bordure bg-carte-2"}`}
                        >
                          {pastille && !verrou && <span role="img" aria-label={t("À compléter")} className="absolute right-2 top-2 h-2 w-2 rounded-full bg-attention" />}
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl border bg-carte ${active ? "border-primaire text-encre" : "border-bordure text-doux"}`}>
                            {verrou ? <Lock size={15} /> : <Icon size={16} />}
                          </span>
                          <span className={`text-center text-[11px] leading-tight ${active ? "font-bold text-encre" : "font-semibold text-doux"}`}>
                            {t(item.label)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
              {/* Langue : sur mobile, ni l'en-tête PC ni la pastille flottante ne sont là. */}
              <div className="px-4 pt-6 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#AAAAAA]">{t("Langue")}</p>
                <LangueSelecteur aligner="droite" />
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
