"use client";
// Modal et BottomSheet (masterprompt §7.12), sur <dialog> natif comme components/ui/Modale.tsx :
// Échap, focus piégé, fond inerte et retour du focus sont fournis par le navigateur.
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/I18nProvider";
import { IconButton } from "./Button";

function useDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return ref;
}

const WIDTHS = { sm: "min-[821px]:w-[440px]", md: "min-[821px]:w-[620px]", lg: "min-[821px]:w-[840px]" } as const;

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children?: React.ReactNode;
  /** Pied : actions alignées à droite (secondaire puis principale). */
  footer?: React.ReactNode;
  size?: keyof typeof WIDTHS;
  /** Bloque la fermeture (opération en cours). */
  locked?: boolean;
};

export function Modal({ open, onClose, title, children, footer, size = "md", locked }: ModalProps) {
  const t = useT();
  const ref = useDialog(open);
  const id = useId();
  return (
    <dialog ref={ref} aria-labelledby={`${id}-t`}
      onCancel={(e) => { e.preventDefault(); if (!locked) onClose(); }}
      onClick={(e) => { if (e.target === ref.current && !locked) onClose(); }}
      className={cn(
        "m-0 max-w-full bg-transparent p-0 text-(--color-text) backdrop:bg-black/50 open:flex",
        "min-[821px]:mx-auto min-[821px]:mt-[9vh] min-[821px]:max-w-[94vw] max-[820px]:mt-auto max-[820px]:w-full", WIDTHS[size],
        "transition-[opacity,scale] duration-(--duration-modal) starting:open:scale-[.98] starting:open:opacity-0",
      )}>
      {open && (
        <div className="flex max-h-[80vh] w-full flex-col overflow-hidden rounded-(--radius-2xl) bg-(--color-surface) shadow-(--shadow-modal) max-[820px]:max-h-[88vh] max-[820px]:rounded-b-none max-[820px]:rounded-t-(--radius-3xl)">
          <header className="sticky top-0 flex items-center gap-2 border-b border-(--color-border-secondary) py-3 pr-3 pl-4">
            <h2 id={`${id}-t`} className="m-0 flex-1 text-[13px] font-[650] text-(--color-text-strong)">{title}</h2>
            {!locked && <IconButton icon="x" aria-label={t("Fermer")} onClick={onClose} />}
          </header>
          {children && <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>}
          {footer && <footer className="flex justify-end gap-2 border-t border-(--color-border-secondary) px-4 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

/** Feuille du bas (mobile) : pleine largeur, poignée de glissement (glisser vers le bas pour fermer). */
export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode }) {
  const t = useT();
  const ref = useDialog(open);
  const id = useId();
  const start = useRef<number | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const move = (y: number) => { if (start.current !== null && panel.current) panel.current.style.translate = `0 ${Math.max(0, y - start.current)}px`; };
  const end = (y: number) => {
    if (start.current === null) return;
    const dy = y - start.current;
    start.current = null;
    if (panel.current) panel.current.style.translate = "";
    if (dy > 80) onClose();
  };
  return (
    <dialog ref={ref} aria-labelledby={`${id}-t`}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="m-0 mt-auto w-full max-w-full bg-transparent p-0 text-(--color-text) backdrop:bg-black/50 open:flex">
      {open && (
        <div ref={panel} className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-(--radius-3xl) bg-(--color-surface) shadow-(--shadow-modal)">
          <div className="grid cursor-grab touch-none place-items-center pt-2 pb-1"
            onPointerDown={(e) => { start.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => move(e.clientY)} onPointerUp={(e) => end(e.clientY)} onPointerCancel={() => end(0)}>
            <span className="h-1 w-9 rounded-full bg-(--color-border)" aria-hidden />
          </div>
          <header className="flex items-center gap-2 py-1 pr-3 pl-4">
            <h2 id={`${id}-t`} className="m-0 flex-1 text-[13px] font-[650] text-(--color-text-strong)">{title}</h2>
            <IconButton icon="x" aria-label={t("Fermer")} onClick={onClose} />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-1.5 pb-[max(12px,env(safe-area-inset-bottom))]">{children}</div>
        </div>
      )}
    </dialog>
  );
}
