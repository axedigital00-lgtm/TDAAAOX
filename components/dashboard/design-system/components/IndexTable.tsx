"use client";
// IndexFilters + IndexTable (MASTERPROMPT §7.5), composant central des listes.
// Les lignes arrivent prêtes du serveur (cellules en ReactNode) ; filtres,
// recherche, tri et page vivent dans l'URL (§6).

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../icons/Icon";

export type IndexColumn = {
  id: string;
  header: string;
  numeric?: boolean;
  /** Colonne de tri (paramètre `sort`) ; le sens courant s'affiche « Date ↓ ». */
  sortKey?: string;
  hideOnMobile?: boolean;
  /** Colonne affichée en gras sur toute la largeur de la ligne en mobile. */
  mobilePrimary?: boolean;
  /** Vignette : à gauche du titre en mobile. */
  thumbnail?: boolean;
  width?: number;
};

export type IndexRow = { id: string; href?: string; cells: Record<string, React.ReactNode> };

export type BulkAction = { id: string; content: string; destructive?: boolean };

// ─── IndexFilters ───────────────────────────────────────────────────────────

export type IndexView = { id: string; label: string };

export function IndexFilters({
  views, searchPlaceholder = "Rechercher et filtrer", sortOptions,
}: {
  views: IndexView[];
  searchPlaceholder?: string;
  sortOptions?: { key: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const vue = params.get("view") ?? views[0]?.id;
  const [q, setQ] = useState(params.get("q") ?? "");
  const [tri, setTri] = useState(false);
  const zoneTri = useRef<HTMLDivElement>(null);

  const url = (maj: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(maj)) v === null || v === "" ? p.delete(k) : p.set(k, v);
    p.delete("page");
    const s = p.toString();
    return s ? `${pathname}?${s}` : pathname;
  };

  // Recherche : anti-rebond de 250 ms, met à jour ?q= sans empiler l'historique.
  useEffect(() => {
    if ((params.get("q") ?? "") === q.trim()) return;
    const t = setTimeout(() => router.replace(url({ q: q.trim() || null }), { scroll: false }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (!tri) return;
    const fermer = (e: MouseEvent) => { if (!zoneTri.current?.contains(e.target as Node)) setTri(false); };
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, [tri]);

  const sortActuel = params.get("sort");
  return (
    <div className="axd-ix-bar">
      <div className="axd-ix-tabs" role="tablist">
        {views.map((v) => (
          <Link key={v.id} href={url({ view: v.id === views[0].id ? null : v.id })} role="tab" aria-selected={v.id === vue}
            className="axd-ix-tab" scroll={false}>
            {v.label}{v.id === vue && <Icon name="chevronUpDown" size={14} />}
          </Link>
        ))}
      </div>
      <label className="axd-ix-search">
        <Icon name="search" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
      </label>
      {sortOptions && (
        <div ref={zoneTri} style={{ position: "relative" }}>
          <button type="button" className="axd-icon-btn" aria-label="Trier" title="Trier" aria-expanded={tri} onClick={() => setTri((v) => !v)}><Icon name="sort" /></button>
          {tri && (
            <div className="axd-popover axd-ix-pop" role="menu">
              <div className="axd-menu-label">Trier par</div>
              {sortOptions.flatMap((o) => [
                { v: `${o.key}:desc`, l: `${o.label} (décroissant)` },
                { v: `${o.key}:asc`, l: `${o.label} (croissant)` },
              ]).map((o) => (
                <Link key={o.v} href={url({ sort: o.v })} className="axd-menu-item" data-active={sortActuel === o.v || undefined} onClick={() => setTri(false)} scroll={false}>{o.l}</Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── IndexTable ─────────────────────────────────────────────────────────────

export function IndexTable({
  columns, rows, selectable = true, bulkActions = [], onBulkAction, pagination, emptyState, resourceName = { singular: "élément", plural: "éléments" },
}: {
  columns: IndexColumn[];
  rows: IndexRow[];
  selectable?: boolean;
  bulkActions?: BulkAction[];
  onBulkAction?: (actionId: string, ids: string[]) => void | Promise<void>;
  pagination?: { label: string; previousHref?: string; nextHref?: string };
  emptyState?: React.ReactNode;
  resourceName?: { singular: string; plural: string };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [enCours, setEnCours] = useState(false);
  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  useEffect(() => setSelection((s) => new Set([...s].filter((id) => ids.includes(id)))), [ids]);

  const tout = selection.size > 0 && selection.size === rows.length;
  const partiel = selection.size > 0 && !tout;
  const basculer = (id: string) => setSelection((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const sort = params.get("sort");

  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  const executer = async (id: string) => {
    if (!onBulkAction) return;
    setEnCours(true);
    try { await onBulkAction(id, [...selection]); setSelection(new Set()); }
    finally { setEnCours(false); }
  };

  return (
    <>
      <div className="axd-ix-wrap">
        <table className="axd-ix">
          <thead>
            {selection.size > 0 ? (
              <tr className="axd-ix-bulk">
                <th className="axd-ix-cb">
                  <Checkbox checked={tout} indeterminate={partiel} onChange={() => setSelection(tout ? new Set() : new Set(ids))} label="Tout sélectionner" />
                </th>
                <th colSpan={columns.length}>
                  <div className="axd-ix-bulk__bar">
                    <span>{selection.size} sélectionné{selection.size > 1 ? "s" : ""}</span>
                    {bulkActions.map((a) => (
                      <button key={a.id} type="button" disabled={enCours} className={`axd-btn axd-btn--sm${a.destructive ? " axd-btn--critical" : ""}`} onClick={() => executer(a.id)}>{a.content}</button>
                    ))}
                  </div>
                </th>
              </tr>
            ) : (
              <tr>
                {selectable && <th className="axd-ix-cb"><Checkbox checked={false} onChange={() => setSelection(new Set(ids))} label="Tout sélectionner" /></th>}
                {columns.map((c) => {
                  const actif = c.sortKey && sort?.startsWith(c.sortKey + ":");
                  return (
                    <th key={c.id} scope="col" className={c.numeric ? "axd-ix-num" : undefined} style={c.width ? { width: c.width } : undefined}
                      aria-sort={actif ? (sort!.endsWith(":asc") ? "ascending" : "descending") : undefined}>
                      {c.header}{actif ? (sort!.endsWith(":asc") ? " ↑" : " ↓") : ""}
                    </th>
                  );
                })}
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} aria-selected={selection.has(r.id) || undefined}
                onClick={(e) => {
                  if (!r.href || (e.target as HTMLElement).closest("a,button,input,label,select")) return;
                  e.metaKey || e.ctrlKey ? window.open(r.href, "_blank") : router.push(r.href);
                }}
                className={r.href ? "axd-ix-link" : undefined}>
                {selectable && (
                  <td className="axd-ix-cb"><Checkbox checked={selection.has(r.id)} onChange={() => basculer(r.id)} label="Sélectionner" /></td>
                )}
                {columns.map((c) => (
                  <td key={c.id}
                    className={[c.numeric && "axd-ix-num", c.mobilePrimary && "axd-ix-primary", c.thumbnail && "axd-ix-thumbcell", c.hideOnMobile && "axd-ix-hide-m"].filter(Boolean).join(" ") || undefined}>
                    {r.cells[c.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="axd-ix-pager">
          {pagination.previousHref ? <Link href={pagination.previousHref} className="axd-ix-pager__btn" aria-label="Page précédente"><Icon name="chevronLeft" /></Link>
            : <span className="axd-ix-pager__btn" aria-disabled><Icon name="chevronLeft" /></span>}
          <span>{pagination.label}</span>
          {pagination.nextHref ? <Link href={pagination.nextHref} className="axd-ix-pager__btn" aria-label="Page suivante"><Icon name="chevronRight" /></Link>
            : <span className="axd-ix-pager__btn" aria-disabled><Icon name="chevronRight" /></span>}
        </div>
      )}
    </>
  );
}

export function Checkbox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={indeterminate ? "mixed" : checked} aria-label={label}
      className="axd-cbx" onClick={(e) => { e.stopPropagation(); onChange(); }} />
  );
}
