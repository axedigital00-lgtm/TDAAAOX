"use client";
// IndexFilters (masterprompt §7.5) : vues, recherche, filtres, colonnes et tri, tous reflétés dans l'URL.
// Paramètres : ?vue= · ?q= (debounce 250 ms) · ?<clé de filtre>= · ?tri=colonne:ordre. La page lit ces paramètres et charge les données.
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/components/I18nProvider";
import { Icon } from "@/components/ui/icones";
import { Button } from "./Button";
import { Checkbox, Radio } from "./Form";
import { Menu, Popover, type Action } from "./Popover";
import { ecrireTri, lireTri, majRecherche } from "./index-regles";

export type Vue = { id: string; label: string };
export type Filtre = { key: string; label: string; options: { value: string; label: string }[] };

export type IndexFiltersProps = {
  /** Onglets de vues ; la première est la vue par défaut (aucun ?vue= dans l'URL). */
  views?: Vue[];
  /** Menu de la vue active (Renommer, Dupliquer, Supprimer) — seulement si la page sait enregistrer des vues. */
  viewActions?: Action[];
  filters?: Filtre[];
  sortOptions?: { id: string; label: string }[];
  /** Colonnes masquables (voir useColonnesMasquees). */
  columns?: { id: string; header: string }[];
  hiddenColumns?: string[];
  onHiddenColumnsChange?: (ids: string[]) => void;
  searchPlaceholder?: string;
};

/** Colonnes masquées, mémorisées sur cet appareil (localStorage, sans erreur si indisponible). */
export function useColonnesMasquees(cle: string, parDefaut: string[] = []) {
  const [masquees, setMasquees] = useState(parDefaut);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(`adm-colonnes:${cle}`) ?? "null");
      if (Array.isArray(v)) setMasquees(v);
    } catch {}
  }, [cle]);
  const maj = (ids: string[]) => {
    setMasquees(ids);
    try { localStorage.setItem(`adm-colonnes:${cle}`, JSON.stringify(ids)); } catch {}
  };
  return [masquees, maj] as const;
}

export function IndexFilters({ views = [], viewActions, filters = [], sortOptions = [], columns = [], hiddenColumns = [], onHiddenColumnsChange, searchPlaceholder }: IndexFiltersProps) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [ouvert, setOuvert] = useState<null | "vue" | "ajout" | "colonnes" | "tri">(null);
  const [filtreChoisi, setFiltreChoisi] = useState<Filtre | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const aller = (patch: Record<string, string | null>) => {
    const qs = majRecherche(params.toString(), patch);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const fermer = () => { setOuvert(null); setFiltreChoisi(null); };

  // Recherche : 250 ms après la dernière frappe.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => aller({ q: q.trim() || null }), 250);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const vueActive = params.get("vue") ?? views[0]?.id;
  const actifs = filters.flatMap((f) => {
    const v = params.get(f.key);
    const o = v ? f.options.find((x) => x.value === v) : null;
    return o ? [{ f, o }] : [];
  });
  const tri = lireTri(params.get("tri"));
  const ajoutables = filters.filter((f) => !params.get(f.key));

  return (
    <div className="border-b border-(--color-border-secondary)">
      <div className="flex h-11 items-center gap-2 overflow-x-auto pr-2 pl-3 [scrollbar-width:none]">
        {views.length > 0 && (
          <div role="tablist" aria-label={t("Vues")} className="flex flex-none items-center gap-0.5">
            {views.map((v) => {
              const on = v.id === vueActive;
              const onglet = (
                <button key={v.id} type="button" role="tab" aria-selected={on}
                  onClick={() => (on && viewActions?.length ? setOuvert(ouvert === "vue" ? null : "vue") : aller({ vue: v.id === views[0].id ? null : v.id }))}
                  className={cn("inline-flex h-7 flex-none items-center gap-1 rounded-(--radius-md) px-2.5 font-[550]",
                    on ? "bg-(--color-surface-tertiary) text-(--color-text-strong)" : "text-(--color-text-secondary) hover:bg-(--color-surface-secondary)")}>
                  {v.label}{on && viewActions?.length ? <Icon name="chevronUpDown" /> : null}
                </button>
              );
              return on && viewActions?.length
                ? <Popover key={v.id} open={ouvert === "vue"} onClose={fermer} activator={onglet}><Menu items={viewActions} onItem={fermer} label={v.label} /></Popover>
                : onglet;
            })}
          </div>
        )}

        <label className="flex h-7 min-w-[150px] flex-1 items-center gap-1.5 rounded-(--radius-md) px-1.5 text-(--color-text-subdued)">
          <Icon name="search" />
          <span className="sr-only">{t("Rechercher et filtrer")}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder ?? t("Rechercher et filtrer")}
            className="min-w-0 flex-1 bg-transparent text-(--color-text) outline-none placeholder:text-(--color-text-subdued) [&::-webkit-search-cancel-button]:hidden" />
        </label>

        {columns.length > 0 && onHiddenColumnsChange && (
          <Popover open={ouvert === "colonnes"} onClose={fermer} align="end" activator={
            <Button size="sm" icon="columns" aria-label={t("Colonnes")} aria-expanded={ouvert === "colonnes"} onClick={() => setOuvert(ouvert === "colonnes" ? null : "colonnes")} className="flex-none">
              <span className="max-[820px]:sr-only">{t("Colonnes")}</span>
            </Button>
          }>
            <fieldset className="space-y-2 p-1.5">
              <legend className="sr-only">{t("Colonnes affichées")}</legend>
              {columns.map((c) => (
                <Checkbox key={c.id} label={c.header} checked={!hiddenColumns.includes(c.id)}
                  onChange={(e) => onHiddenColumnsChange(e.target.checked ? hiddenColumns.filter((h) => h !== c.id) : [...hiddenColumns, c.id])} />
              ))}
            </fieldset>
          </Popover>
        )}

        {sortOptions.length > 0 && (
          <Popover open={ouvert === "tri"} onClose={fermer} align="end" activator={
            <Button size="sm" icon="sort" aria-label={t("Trier")} aria-expanded={ouvert === "tri"} onClick={() => setOuvert(ouvert === "tri" ? null : "tri")} className="flex-none">
              <span className="max-[820px]:sr-only">{t("Trier")}</span>
            </Button>
          }>
            <fieldset className="space-y-2 p-1.5">
              <legend className="mb-1 text-xs font-[550] text-(--color-text-secondary)">{t("Trier par")}</legend>
              {sortOptions.map((o) => (
                <Radio key={o.id} name="adm-tri" label={o.label} checked={tri?.colonne === o.id}
                  onChange={() => aller({ tri: ecrireTri({ colonne: o.id, ordre: tri?.ordre ?? "desc" }) })} />
              ))}
            </fieldset>
            {tri && (
              <div className="mt-1 flex gap-1 border-t border-(--color-border-secondary) p-1.5 pt-2">
                {(["asc", "desc"] as const).map((o) => (
                  <Button key={o} size="sm" variant={tri.ordre === o ? "tint" : "ghost"} aria-pressed={tri.ordre === o}
                    icon={o === "asc" ? "arrowUp" : undefined} onClick={() => aller({ tri: ecrireTri({ ...tri, ordre: o }) })}>
                    {o === "asc" ? t("Croissant") : t("Décroissant")}
                  </Button>
                ))}
              </div>
            )}
          </Popover>
        )}
      </div>

      {(actifs.length > 0 || ajoutables.length > 0) && filters.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
          {actifs.map(({ f, o }) => (
            <span key={f.key} className="inline-flex h-7 flex-none items-center gap-1 rounded-(--radius-md) border border-dashed border-(--color-border-input) pr-1 pl-2.5 text-(--color-text-strong)">
              {f.label} : {o.label}
              <button type="button" aria-label={t("Retirer le filtre {0}", f.label)} onClick={() => aller({ [f.key]: null })}
                className="grid size-5 place-items-center rounded-[4px] text-(--color-text-secondary) hover:bg-(--color-surface-tertiary)">
                <Icon name="x" />
              </button>
            </span>
          ))}
          {ajoutables.length > 0 && (
            <Popover open={ouvert === "ajout"} onClose={fermer} activator={
              <Button size="sm" variant="ghost" icon="plus" iconPosition="end" aria-expanded={ouvert === "ajout"}
                onClick={() => { setFiltreChoisi(null); setOuvert(ouvert === "ajout" ? null : "ajout"); }} className="flex-none">
                {t("Ajouter un filtre")}
              </Button>
            }>
              {filtreChoisi
                ? <Menu key={filtreChoisi.key} label={filtreChoisi.label}
                    items={filtreChoisi.options.map((o) => ({ content: o.label, onAction: () => aller({ [filtreChoisi.key]: o.value }) }))} onItem={fermer} />
                : <Menu label={t("Ajouter un filtre")} items={ajoutables.map((f) => ({ content: f.label, onAction: () => setFiltreChoisi(f) }))} />}
            </Popover>
          )}
        </div>
      )}
    </div>
  );
}
