"use client";
// Guide de la page en cours, sur tout le dashboard : montré une fois automatiquement à la première
// visite de chaque page, puis à la demande avec le bouton « Guide de la page ».
// Pages sans guide écrit (lib/visites-pages.ts) : guide général à partir de leur nom dans le menu.
import { usePathname } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { VisiteGuidee, relancerVisite } from "./VisiteGuidee";
import { etapesPage, guidePour } from "@/lib/visites-pages";
import { pagesNavigables } from "./design-system/layout/navigation";

// Pages qui ont déjà leur propre visite détaillée.
const AVEC_VISITE = ["/dashboard/ma-boutique", "/dashboard/themes", "/dashboard/builder", "/dashboard/produits/nouveau"];

function guideDe(pathname: string) {
  const g = guidePour(pathname);
  if (g) return g;
  const page = pagesNavigables().filter((p) => pathname === p.href || pathname.startsWith(p.href + "/")).sort((a, b) => b.href.length - a.href.length)[0];
  if (!page) return null;
  return { route: page.href, guide: { titre: page.label, but: `Cette page « ${page.label} »${page.groupe ? ` fait partie de « ${page.groupe} »` : ""}. Parcourez-la, et touchez « Guide de la page » si vous avez un doute.` } };
}

export function VisitePage() {
  const t = useT();
  const pathname = usePathname();
  if (AVEC_VISITE.some((r) => pathname === r || pathname.startsWith(r + "/"))) return null;
  const g = guideDe(pathname);
  if (!g) return null;
  const cle = `page:${g.route}`;
  return (
    <>
      <VisiteGuidee key={cle} cle={cle} etapes={etapesPage(g.guide)} />
      <button type="button" className="axd-aide-page" data-guide="aide-page" onClick={() => relancerVisite(cle)} aria-label={t("Guide de la page")} title={t("Guide de la page")}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="10" cy="10" r="7.2" /><path d="M7.9 7.8a2.2 2.2 0 1 1 3 2.05c-.6.25-.9.7-.9 1.3v.35M10 14.2h.01" />
        </svg>
        <span>{t("Guide de la page")}</span>
      </button>
    </>
  );
}
