"use client";
// IndexTable (masterprompt §7.5 et §13.4) : liste de ressources, ligne entière cliquable, sélection et actions groupées.
// ≤ 820 px : plus d'en-têtes ni de cases, chaque ligne devient un bloc ; sélection par appui long, barre d'actions en bas.
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/I18nProvider";
import { Button, IconButton } from "./Button";
import { Checkbox } from "./Form";
import { Menu, Popover, type Action } from "./Popover";
import { basculer, basculerTout, etatSelection, type Tri } from "./index-regles";

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "start" | "end";
  numeric?: boolean;
  width?: number;
  sortable?: boolean;
  hideOnMobile?: boolean;
  /** Colonne métier principale : en gras, et première ligne du bloc en mobile. */
  mobilePrimary?: boolean;
};

export type Pagination = { hasPrevious: boolean; hasNext: boolean; label: string; onPrevious(): void; onNext(): void };

export type IndexTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  getId: (r: T) => string;
  onRowClick?: (r: T) => void;
  /** Nom de la ressource pour les lecteurs d'écran (« Commandes »). */
  label: string;
  selectable?: boolean;
  /** Sélection contrôlée (sinon gérée en interne). */
  selected?: string[];
  onSelectionChange?: (ids: string[]) => void;
  promotedBulkActions?: Action[];
  bulkActions?: Action[];
  hiddenColumns?: string[];
  sort?: Tri | null;
  /** Clic sur un en-tête triable : même colonne → ordre inversé. */
  onSort?: (t: Tri) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  pagination?: Pagination;
};

const INTERACTIF = "a,button,input,select,textarea,label,[role=checkbox],[role=switch],[data-stop]";

export function IndexTable<T>({
  rows, columns, getId, onRowClick, label, selectable, selected: selCtrl, onSelectionChange,
  promotedBulkActions = [], bulkActions = [], hiddenColumns = [], sort, onSort, loading, emptyState, pagination,
}: IndexTableProps<T>) {
  const t = useT();
  const [selInterne, setSelInterne] = useState<string[]>([]);
  const [menu, setMenu] = useState(false);
  const appui = useRef<ReturnType<typeof setTimeout>>(undefined);
  const selection = selCtrl ?? selInterne;
  const setSelection = (ids: string[]) => { if (!selCtrl) setSelInterne(ids); onSelectionChange?.(ids); };

  const cols = columns.filter((c) => !hiddenColumns.includes(c.id));
  const ids = rows.map(getId);
  const etat = etatSelection(selection, ids);
  const nb = ids.filter((id) => selection.includes(id)).length;
  const principale = cols.find((c) => c.mobilePrimary) ?? cols[0];

  if (!loading && rows.length === 0 && emptyState) return <>{emptyState}</>;

  const caseTout = selectable && (
    <Checkbox label={t("Tout sélectionner")} labelHidden checked={etat === "all"} indeterminate={etat === "some"}
      onChange={() => setSelection(basculerTout(selection, ids))} />
  );
  const actions = nb > 0 && (
    <div className="flex min-w-0 items-center gap-2">
      <span className="whitespace-nowrap font-[550] text-(--color-text-strong)">{t("{0} sélectionné(s)", nb)}</span>
      {promotedBulkActions.map((a) => (
        <Button key={a.content} size="sm" icon={a.icon} disabled={a.disabled} variant={a.destructive ? "critical" : "default"} onClick={a.onAction}>{a.content}</Button>
      ))}
      {bulkActions.length > 0 && (
        <Popover open={menu} onClose={() => setMenu(false)} activator={
          <IconButton icon="dots" aria-label={t("Plus d'actions")} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)} />
        }>
          <Menu items={bulkActions} onItem={() => setMenu(false)} label={t("Plus d'actions")} />
        </Popover>
      )}
    </div>
  );

  const clicLigne = (e: React.MouseEvent, r: T) => {
    if ((e.target as Element).closest(INTERACTIF)) return;
    if (nb > 0 && window.matchMedia("(max-width: 820px)").matches) return setSelection(basculer(selection, getId(r)));
    onRowClick?.(r);
  };
  // Mobile : appui long (500 ms) = sélection.
  const debutAppui = (e: React.PointerEvent, id: string) => {
    if (!selectable || e.pointerType !== "touch") return;
    appui.current = setTimeout(() => { setSelection(basculer(selection, id)); navigator.vibrate?.(10); }, 500);
  };
  const finAppui = () => clearTimeout(appui.current);

  return (
    <div className="relative">
      <div className="overflow-x-auto max-[820px]:overflow-visible">
        <table className="w-full border-collapse text-[13px]" aria-label={label} aria-busy={loading || undefined}>
          <thead className="max-[820px]:hidden">
            {nb > 0 ? (
              <tr>
                {selectable && <th className="h-9 w-9 bg-(--color-surface-secondary) pr-0 pl-3 border-b border-(--color-border-secondary)">{caseTout}</th>}
                <th colSpan={cols.length} className="h-9 bg-(--color-surface-secondary) px-3 text-left font-normal border-b border-(--color-border-secondary)">{actions}</th>
              </tr>
            ) : (
              <tr>
                {selectable && <th className="h-9 w-9 bg-(--color-surface-secondary) pr-0 pl-3 border-b border-(--color-border-secondary)">{caseTout}</th>}
                {cols.map((c) => {
                  const trie = sort?.colonne === c.id ? sort.ordre : null;
                  const contenu = <>{c.header}{trie && <span aria-hidden> {trie === "desc" ? "↓" : "↑"}</span>}</>;
                  return (
                    <th key={c.id} scope="col" style={c.width ? { width: c.width } : undefined}
                      aria-sort={trie ? (trie === "asc" ? "ascending" : "descending") : undefined}
                      className={cn("h-9 whitespace-nowrap bg-(--color-surface-secondary) px-3 text-xs font-[550] text-(--color-text-secondary) border-b border-(--color-border-secondary)",
                        c.align === "end" || c.numeric ? "text-right" : "text-left")}>
                      {c.sortable && onSort
                        ? <button type="button" className="rounded-[4px] hover:text-(--color-text-strong)"
                            onClick={() => onSort({ colonne: c.id, ordre: trie === "desc" ? "asc" : "desc" })}>{contenu}</button>
                        : contenu}
                    </th>
                  );
                })}
              </tr>
            )}
          </thead>
          <tbody className="max-[820px]:block">
            {loading
              ? Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} aria-hidden className="max-[820px]:block max-[820px]:px-3.5 max-[820px]:py-3">
                    {selectable && <td className="h-10 w-9 pl-3 max-[820px]:hidden" />}
                    {cols.map((c, j) => (
                      <td key={c.id} className={cn("h-10 px-3 border-b border-(--color-border-secondary) max-[820px]:block max-[820px]:h-auto max-[820px]:border-0 max-[820px]:p-0 max-[820px]:pt-1", j > 1 && "max-[820px]:hidden")}>
                        <div className="h-3 w-3/4 animate-[adm-shimmer_1.2s_linear_infinite] rounded-[6px] bg-[linear-gradient(90deg,#f1f1f1_0%,#e3e3e3_50%,#f1f1f1_100%)] bg-size-[200%_100%]" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((r) => {
                  const id = getId(r);
                  const coche = selection.includes(id);
                  return (
                    <tr key={id} aria-selected={selectable ? coche : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      onClick={(e) => clicLigne(e, r)}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) onRowClick?.(r); }}
                      onPointerDown={(e) => debutAppui(e, id)} onPointerUp={finAppui} onPointerLeave={finAppui} onPointerCancel={finAppui}
                      className={cn("group [&:last-child>td]:border-b-0",
                        onRowClick && "cursor-pointer",
                        coche ? "[&>td]:bg-(--color-surface-selected)" : "hover:[&>td]:bg-(--color-surface-secondary)",
                        "max-[820px]:flex max-[820px]:flex-wrap max-[820px]:items-center max-[820px]:gap-x-2.5 max-[820px]:gap-y-1 max-[820px]:border-b max-[820px]:border-(--color-border-secondary) max-[820px]:px-3.5 max-[820px]:py-3 max-[820px]:last:border-b-0",
                        coche ? "max-[820px]:bg-(--color-surface-selected)" : "max-[820px]:hover:bg-(--color-surface-secondary)",
                      )}>
                      {selectable && (
                        <td className="h-10 w-9 pr-0 pl-3 align-middle border-b border-(--color-border-secondary) max-[820px]:hidden">
                          <Checkbox label={t("Sélectionner")} labelHidden checked={coche} onChange={() => setSelection(basculer(selection, id))} />
                        </td>
                      )}
                      {cols.map((c) => {
                        const p = c === principale;
                        return (
                          <td key={c.id}
                            className={cn("h-10 whitespace-nowrap px-3 py-1.5 align-middle border-b border-(--color-border-secondary)",
                              c.align === "end" || c.numeric ? "text-right" : "text-left", c.numeric && "tabular-nums",
                              p ? "font-semibold text-(--color-text-strong)" : "text-(--color-text)",
                              "max-[820px]:block max-[820px]:h-auto max-[820px]:whitespace-normal max-[820px]:border-0 max-[820px]:bg-transparent! max-[820px]:p-0 max-[820px]:text-left max-[820px]:empty:hidden",
                              p ? "max-[820px]:order-first max-[820px]:w-full" : "max-[820px]:text-(--color-text-secondary)",
                              c.hideOnMobile && "max-[820px]:hidden")}>
                            {c.cell(r)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Mobile : barre d'actions groupées en bas d'écran. */}
      {nb > 0 && (
        <div className="fixed inset-x-3 bottom-3 z-(--z-dock) hidden items-center justify-between gap-2 overflow-x-auto rounded-(--radius-lg) bg-(--color-surface) p-2 shadow-(--shadow-popover) max-[820px]:flex">
          {actions}
          <IconButton icon="x" aria-label={t("Annuler la sélection")} onClick={() => setSelection([])} />
        </div>
      )}

      {pagination && (
        <nav aria-label={t("Pagination")} className="flex items-center justify-center gap-1 border-t border-(--color-border-secondary) bg-(--color-surface-secondary) px-3 py-1.5 text-xs text-(--color-text-secondary)">
          <IconButton icon="chevronLeft" aria-label={t("Page précédente")} disabled={!pagination.hasPrevious} onClick={pagination.onPrevious} />
          <span className="tabular-nums">{pagination.label}</span>
          <IconButton icon="chevronRight" aria-label={t("Page suivante")} disabled={!pagination.hasNext} onClick={pagination.onNext} />
        </nav>
      )}
    </div>
  );
}
