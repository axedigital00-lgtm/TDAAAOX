// Timeline, Avatar, Thumbnail, Tabs, Skeleton (masterprompt §7.13). Server-safe.
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icones";

export type TimelineItem = { id: string; content: React.ReactNode; time?: string };

/** Le plus récent en premier : il porte le point vert. `header` : champ « Laisser un commentaire » des fiches. */
export function Timeline({ items, header }: { items: TimelineItem[]; header?: React.ReactNode }) {
  return (
    <div>
      {header && <div className="mb-3">{header}</div>}
      <ol className="m-0 list-none p-0">
        {items.map((it, i) => (
          <li key={it.id} className="relative flex gap-3 pb-4 pl-0.5 last:pb-0">
            {i < items.length - 1 && <span aria-hidden className="absolute top-3 bottom-0 left-[6px] w-px bg-(--color-border)" />}
            <span aria-hidden className={cn("relative mt-[6px] size-[9px] shrink-0 rounded-full",
              i === 0 ? "bg-(--color-live) shadow-[0_0_0_3px_#cdfee1]" : "bg-(--color-text-subdued)")} />
            <div className="min-w-0 flex-1">{it.content}</div>
            {it.time && <time className="shrink-0 text-xs text-(--color-text-secondary)">{it.time}</time>}
          </li>
        ))}
      </ol>
    </div>
  );
}

const AVATAR_COLORS = ["#2c6ecb", "#29845a", "#7c3aed", "#c4290e", "#b98900", "#0f766e", "#be185d", "#4a4a4a"];

export function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function Avatar({ name, src, size = 28, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, background: src ? undefined : avatarColor(name), fontSize: Math.round(size * 0.4) };
  return src
    ? <img src={src} alt={name} style={style} className={cn("shrink-0 rounded-full object-cover", className)} />
    : <span role="img" aria-label={name} style={style} className={cn("grid shrink-0 place-items-center rounded-full font-[650] text-white", className)}>{initials(name)}</span>;
}

export function Thumbnail({ src, alt, size = 40, className }: { src?: string | null; alt: string; size?: 24 | 32 | 40 | 72; className?: string }) {
  return (
    <span style={{ width: size, height: size }}
      className={cn("grid shrink-0 place-items-center overflow-hidden border border-(--color-border) bg-[#fafafa] text-(--color-text-subdued)", size <= 24 ? "rounded-(--radius-sm)" : "rounded-(--radius-md)", className)}>
      {src ? <img src={src} alt={alt} className="size-full object-cover" /> : <Icon name="image" label={alt} />}
    </span>
  );
}

export type Tab = { id: string; label: React.ReactNode; href?: string };

/** Onglets de page. Avec `href` : liens (deep-link ?onglet=) ; sinon boutons pilotés par `onSelect`. */
export function Tabs({ tabs, selected, onSelect, label, className }: { tabs: Tab[]; selected: string; onSelect?: (id: string) => void; label?: string; className?: string }) {
  const cls = (on: boolean) => cn(
    "-mb-px inline-flex h-9 items-center border-b-2 px-0.5 text-[13px] whitespace-nowrap transition-colors duration-(--duration-fast)",
    on ? "border-(--color-primary) font-semibold text-(--color-text-strong)" : "border-transparent text-(--color-text-secondary) hover:text-(--color-text-strong)",
  );
  return (
    <div role={onSelect ? "tablist" : undefined} aria-label={label} className={cn("flex gap-5 overflow-x-auto border-b border-(--color-border)", className)}>
      {tabs.map((tab) => tab.href
        ? <Link key={tab.id} href={tab.href} aria-current={tab.id === selected ? "page" : undefined} className={cls(tab.id === selected)}>{tab.label}</Link>
        : <button key={tab.id} type="button" role="tab" aria-selected={tab.id === selected} onClick={() => onSelect?.(tab.id)} className={cls(tab.id === selected)}>{tab.label}</button>)}
    </div>
  );
}

const SHIMMER = "rounded-[6px] bg-[linear-gradient(90deg,#f1f1f1_25%,#e7e7e7_37%,#f1f1f1_63%)] bg-size-[400%_100%] animate-[adm-shimmer_1.2s_linear_infinite]";

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => <div key={i} className={cn(SHIMMER, "h-3", i === lines - 1 && lines > 1 ? "w-3/5" : "w-full")} />)}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden className="adm-card rounded-(--radius-xl) bg-(--color-surface) p-4 shadow-(--shadow-card) [.adm-card+&]:mt-4">
      <div className={cn(SHIMMER, "mb-4 h-3 w-2/5")} />
      <SkeletonText lines={lines} />
    </div>
  );
}

export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-hidden className="adm-card overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
      <div className="h-9 bg-(--color-surface-secondary)" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-10 items-center gap-4 border-t border-(--color-border-secondary) px-3">
          <div className={cn(SHIMMER, "h-3 w-1/5")} /><div className={cn(SHIMMER, "h-3 w-1/4")} /><div className={cn(SHIMMER, "ml-auto h-3 w-16")} />
        </div>
      ))}
    </div>
  );
}

/** Page en chargement : en-tête + carte + tableau. `label` (déjà traduit) est annoncé aux lecteurs d'écran. */
export function SkeletonPage({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <div className="flex min-h-14 items-center"><div className={cn(SHIMMER, "h-3.5 w-40")} /></div>
      <SkeletonCard />
      <div className="mt-4"><SkeletonTable /></div>
    </div>
  );
}
