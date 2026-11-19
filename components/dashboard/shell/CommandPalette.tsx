"use client";
// Palette de commandes (masterprompt §11) : Ctrl/⌘+K, champ de la barre latérale ou de la barre mobile.
// Logique de recherche partagée avec l'ancienne recherche (useRecherche, lib/recherche-dashboard.ts).
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icones";
import { useT } from "@/components/I18nProvider";
import { useRecherche } from "@/components/dashboard/RechercheDashboard";
import { ouvrirAxia } from "@/components/dashboard/AxiaPanneau";
import { chercher } from "@/lib/recherche-dashboard";
import type { ModuleKey, Niveau } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { filtreParPermission, pagesMenu } from "./menu";

/** Ouvre la palette (avec une requête éventuelle) depuis n'importe où. */
export function ouvrirPalette(q = "") {
  window.dispatchEvent(new CustomEvent("recherche:ouvrir", { detail: q }));
}

// Actions rapides : uniquement des pages qui existent.
const ACTIONS: { href: string; label: string; moduleKey?: ModuleKey }[] = [
  { href: "/dashboard/produits/nouveau", label: "Ajouter un produit", moduleKey: "produits" },
  { href: "/dashboard/marketing/codes-promo", label: "Créer une réduction", moduleKey: "marketing" },
  { href: "/dashboard/campagnes", label: "Lancer une campagne", moduleKey: "marketing" },
];

const ICONE_GROUPE: Record<string, IconName> = { Pages: "doc", Sections: "gear", Produits: "tag", Commandes: "orders", Clients: "user", Actions: "plus" };
const LIBELLE_GROUPE: Record<string, string> = { Sections: "Paramètres" };
const CLE_RECENTS = "adm_recherches";

function lireRecents(): string[] {
  try { return JSON.parse(localStorage.getItem(CLE_RECENTS) || "[]").slice(0, 5); } catch { return []; }
}

export function CommandPalette({ permissions }: { permissions?: Record<ModuleKey, Niveau> }) {
  const t = useT();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const pages = useMemo(() => pagesMenu(permissions), [permissions]);
  const { q, setQ, lignes: trouvees, chargement, actif, setActif } = useRecherche(pages, permissions);

  const actions = useMemo(() => {
    const dispo = filtreParPermission(ACTIONS, permissions);
    const liste = q.trim() ? chercher(dispo, q, (a) => ({ principal: `${a.label} ${t(a.label)}` })) : dispo;
    return liste.map((a) => ({ cle: `a-${a.href}`, groupe: "Actions", titre: a.label, href: a.href, image: undefined as string | null | undefined, detail: undefined as string | undefined }));
  }, [q, permissions, t]);
  const lignes = [...trouvees, ...actions];

  useEffect(() => {
    const ouvrir = (requete = "") => { setQ(requete); setRecents(lireRecents()); setOuvert(true); };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ouvrir(); }
    };
    const onOuvrir = (e: Event) => ouvrir((e as CustomEvent<string>).detail ?? "");
    window.addEventListener("keydown", onKey);
    window.addEventListener("recherche:ouvrir", onOuvrir);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("recherche:ouvrir", onOuvrir); };
  }, [setQ]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (ouvert && !d.open) { d.showModal(); champ.current?.focus(); }
    if (!ouvert && d.open) d.close();
  }, [ouvert]);

  const fermer = () => { setOuvert(false); setQ(""); };
  const aller = (href: string) => {
    const terme = q.trim();
    if (terme) try { localStorage.setItem(CLE_RECENTS, JSON.stringify([terme, ...lireRecents().filter((r) => r !== terme)].slice(0, 5))); } catch { /* stockage indisponible */ }
    fermer();
    router.push(href);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActif((i) => Math.min(i + 1, lignes.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActif((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && lignes[actif]) { e.preventDefault(); aller(lignes[actif].href); }
  };

  return (
    <dialog ref={dialog} aria-label={t("Recherche")} onCancel={(e) => { e.preventDefault(); fermer(); }} onClick={(e) => { if (e.target === dialog.current) fermer(); }}
      className="m-0 max-w-full bg-transparent p-0 backdrop:bg-black/50 min-[821px]:mx-auto min-[821px]:mt-[12vh] min-[821px]:w-[600px] max-[820px]:h-dvh max-[820px]:max-h-dvh max-[820px]:w-full">
      {ouvert && (
        <div className="flex max-h-[70vh] flex-col overflow-hidden rounded-(--radius-2xl) bg-(--color-surface) text-(--color-text) shadow-(--shadow-modal) max-[820px]:h-full max-[820px]:max-h-none max-[820px]:rounded-none">
          <div className="flex h-12 flex-none items-center gap-2 border-b border-(--color-border-secondary) px-3">
            <Icon name="search" size={16} className="text-(--color-icon-header)" />
            <input ref={champ} type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} autoComplete="off"
              placeholder={t("Rechercher des pages, commandes, produits, clients…")} aria-label={t("Rechercher dans le tableau de bord")}
              role="combobox" aria-expanded aria-controls="palette-resultats" aria-activedescendant={lignes[actif] ? `palette-${actif}` : undefined}
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-(--color-text-subdued) max-[820px]:text-[16px] [&::-webkit-search-cancel-button]:hidden" />
            <button type="button" onClick={fermer} className="rounded-(--radius-sm) bg-(--color-surface-tertiary) px-1.5 text-[11px] leading-5 font-[550] text-(--color-text-secondary)">{t("Échap")}</button>
          </div>
          <div id="palette-resultats" role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1.5">
            {!q.trim() && recents.length > 0 && (
              <div className="px-2 pb-1">
                <p className="px-2 pt-1.5 pb-1 text-[12px] font-[550] text-(--color-text-secondary)">{t("Recherches récentes")}</p>
                {recents.map((r) => (
                  <button key={r} type="button" onClick={() => { setQ(r); champ.current?.focus(); }} className="flex h-8 w-full items-center gap-2 rounded-(--radius-md) px-2 text-left text-[13px] hover:bg-(--color-surface-tertiary)">
                    <Icon name="history" size={16} className="text-(--color-icon-header)" />{r}
                  </button>
                ))}
              </div>
            )}
            {lignes.map((l, i) => (
              <div key={l.cle} className="px-2">
                {(i === 0 || lignes[i - 1]!.groupe !== l.groupe) && (
                  <p className="px-2 pt-2 pb-1 text-[12px] font-[550] text-(--color-text-secondary)">{t(LIBELLE_GROUPE[l.groupe] ?? l.groupe)}</p>
                )}
                <button id={`palette-${i}`} type="button" role="option" aria-selected={i === actif} onMouseEnter={() => setActif(i)} onClick={() => aller(l.href)}
                  className={cn("flex min-h-9 w-full items-center gap-2.5 rounded-(--radius-md) px-2 py-1 text-left", i === actif && "bg-(--color-surface-tertiary)")}>
                  {l.image
                    ? <img src={l.image} alt="" className="size-7 flex-none rounded-(--radius-sm) border border-(--color-border) object-cover" />
                    : <Icon name={ICONE_GROUPE[l.groupe] ?? "doc"} size={16} className="flex-none text-(--color-icon-header)" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-[550] text-(--color-text-strong)">{t(l.titre)}</span>
                    {l.detail && <span className="block truncate text-[12px] text-(--color-text-secondary)">{t(l.detail)}</span>}
                  </span>
                  {i === actif && <Icon name="arrowRight" size={16} className="flex-none text-(--color-text-subdued)" />}
                </button>
              </div>
            ))}
            {chargement && <p className="px-4 py-2 text-[12px] text-(--color-text-secondary)">{t("Recherche dans les produits, commandes et clients…")}</p>}
            {q.trim().length >= 2 && !chargement && trouvees.length === 0 && (
              <div className="px-4 py-6 text-center">
                <p className="text-[13px] text-(--color-text-secondary)">{t("Aucun résultat pour « {0} »", q.trim())}</p>
                <button type="button" onClick={() => { const question = t("Où trouver « {0} » dans mon tableau de bord ?", q.trim()); fermer(); ouvrirAxia(question); }}
                  className="mt-2 text-[13px] text-(--color-link) hover:underline">{t("Demander à AXIA")}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
