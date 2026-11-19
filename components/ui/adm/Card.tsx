// Carte (masterprompt §7.3). Une carte qui suit une carte prend 16 px de marge, sauf dans une grille.
import { cn } from "@/lib/utils";

export function Card({ title, actions, padding = "md", className, children }: { title?: React.ReactNode; actions?: React.ReactNode; padding?: "none" | "md"; className?: string; children?: React.ReactNode }) {
  return (
    <section className={cn(
      "adm-card overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)",
      "[.adm-card+&]:mt-4 [.grid>.adm-card+&]:mt-0 [.flex>.adm-card+&]:mt-0", className,
    )}>
      {(title || actions) && (
        <header className={cn("flex items-center gap-2", padding === "md" ? "px-4 pt-4 pb-2" : "px-4 py-3")}>
          {title && <h2 className="m-0 flex-1 text-[13px] font-[650] text-(--color-text-strong)">{title}</h2>}
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </header>
      )}
      {padding === "md" ? <div className={cn("p-4", (title || actions) && "pt-0")}>{children}</div> : children}
    </section>
  );
}

/** Section d'une carte sans padding : séparée de la précédente par 1 px. */
export function CardSection({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-4 not-first:border-t not-first:border-(--color-border-secondary)", className)}>{children}</div>;
}

/** Séparateur pleine largeur dans une carte à padding (marges négatives de 16 px). */
export function Divider({ className }: { className?: string }) {
  return <hr className={cn("-mx-4 my-4 border-0 border-t border-(--color-border-secondary)", className)} />;
}

/** Lignes « libellé … valeur » (ventilation, totaux). */
export function KeyValue({ items, className }: { items: { label: React.ReactNode; value: React.ReactNode; strong?: boolean }[]; className?: string }) {
  return (
    <dl className={cn("m-0 space-y-1.5", className)}>
      {items.map((it, i) => (
        <div key={i} className={cn("flex items-baseline justify-between gap-4", it.strong && "font-[650] text-(--color-text-strong)")}>
          <dt className={cn(!it.strong && "text-(--color-text-secondary)")}>{it.label}</dt>
          <dd className="m-0 text-right tabular-nums">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
