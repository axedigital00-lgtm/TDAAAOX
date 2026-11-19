"use client";
// Popover, Menu et Tooltip (masterprompt §7.12).
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icones";

export type Action = { content: string; onAction?: () => void; href?: string; icon?: IconName; destructive?: boolean; disabled?: boolean };

/** Fenêtre flottante ancrée sous son déclencheur ; se ferme au clic extérieur et sur Échap (focus rendu au déclencheur). */
export function Popover({ activator, open, onClose, align = "start", className, children }: {
  activator: React.ReactNode; open: boolean; onClose: () => void; align?: "start" | "end"; className?: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
      (ref.current?.querySelector("[aria-haspopup],button,a") as HTMLElement | null)?.focus();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open, onClose]);
  return (
    <div ref={ref} className="relative inline-flex">
      {activator}
      {open && (
        <div className={cn(
          "absolute top-full z-(--z-modal) mt-1 min-w-[200px] rounded-(--radius-lg) bg-(--color-surface) p-1.5 shadow-(--shadow-popover)",
          align === "end" ? "right-0" : "left-0", className,
        )}>{children}</div>
      )}
    </div>
  );
}

/** Liste d'actions au clavier : ↑ ↓ Début Fin, Entrée, Échap. */
export function Menu({ items, onItem, label }: { items: Action[]; onItem?: () => void; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { (ref.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])') as HTMLElement | null)?.focus(); }, []);
  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])];
    const i = els.indexOf(document.activeElement as HTMLElement);
    const go = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: els.length - 1 }[e.key];
    if (go === undefined || !els.length) return;
    e.preventDefault();
    els[(go + els.length) % els.length].focus();
  };
  const cls = (a: Action) => cn(
    "flex h-8 w-full items-center gap-2 rounded-(--radius-md) px-2.5 text-left outline-none",
    "hover:bg-(--color-surface-tertiary) focus-visible:bg-(--color-surface-tertiary)",
    a.destructive ? "text-(--color-critical-text)" : "text-(--color-text-strong)", a.disabled && "pointer-events-none opacity-45",
  );
  return (
    <div ref={ref} role="menu" aria-label={label} onKeyDown={onKeyDown}>
      {items.map((a) => {
        const inner = <>{a.icon && <Icon name={a.icon} />}<span className="truncate">{a.content}</span></>;
        return a.href && !a.disabled
          ? <Link key={a.content} role="menuitem" href={a.href} className={cls(a)} onClick={onItem}>{inner}</Link>
          : <button key={a.content} type="button" role="menuitem" aria-disabled={a.disabled || undefined} className={cls(a)}
              onClick={() => { if (a.disabled) return; a.onAction?.(); onItem?.(); }}>{inner}</button>;
      })}
    </div>
  );
}

/** Infobulle : apparaît après 300 ms au survol ou au focus clavier. */
export function Tooltip({ content, children, className }: { content: React.ReactNode; children: React.ReactNode; className?: string }) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const id = useId();
  const on = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setShow(true), 300); };
  const off = () => { clearTimeout(timer.current); setShow(false); };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <span className={cn("relative inline-flex", className)} aria-describedby={show ? id : undefined}
      onMouseEnter={on} onMouseLeave={off} onFocus={on} onBlur={off} onKeyDown={(e) => e.key === "Escape" && off()}>
      {children}
      {show && (
        <span role="tooltip" id={id} className="pointer-events-none absolute bottom-full left-1/2 z-(--z-tooltip) mb-1.5 w-max max-w-[260px] -translate-x-1/2 rounded-[6px] bg-(--color-tooltip) px-2 py-1 text-xs text-white">
          {content}
        </span>
      )}
    </span>
  );
}
