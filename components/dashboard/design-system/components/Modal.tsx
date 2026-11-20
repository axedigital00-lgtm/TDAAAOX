"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icons/Icon";

/**
 * Modale (§7.12) : Échap, clic sur le voile ou ✕ ferment ; focus piégé puis
 * restitué. En mobile (≤ 820px) elle s'affiche en BottomSheet via CSS.
 */
export function Modal({
  open, onClose, title, size = "md", footer, children, className, scrimClassName, labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  scrimClassName?: string;
  labelledBy?: string;
}) {
  const boite = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const precedent = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(boite.current?.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])',
    ) ?? []);
    setTimeout(() => (boite.current?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0])?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const [premier, dernier] = [f[0], f[f.length - 1]];
        if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
        else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); precedent?.focus?.(); };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  // Rendu dans la racine `.ax-admin` pour hériter des tokens, sinon dans <body>.
  const cible = document.querySelector(".ax-admin") ?? document.body;
  return createPortal(
    <div className={["axd-scrim", scrimClassName].filter(Boolean).join(" ")} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={boite} role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        className={["axd-modal", size !== "md" && `axd-modal--${size}`, className].filter(Boolean).join(" ")}>
        {title !== undefined && (
          <div className="axd-modal__head">
            <span style={{ flex: 1 }} id={labelledBy}>{title}</span>
            <button type="button" className="axd-icon-btn" onClick={onClose} aria-label="Fermer"><Icon name="x" /></button>
          </div>
        )}
        {children}
        {footer && <div className="axd-modal__foot">{footer}</div>}
      </div>
    </div>,
    cible,
  );
}
