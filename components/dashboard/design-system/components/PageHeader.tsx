"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { Button, type ButtonProps } from "./Button";
import { Modal } from "./Modal";

export type Action = {
  content: string;
  href?: string;
  external?: boolean;
  onAction?: () => void;
  icon?: IconName;
  disclosure?: boolean;
  disabled?: boolean;
  loading?: boolean;
  destructive?: boolean;
};

/** Conteneur de page (§5.4) : full 1200px, narrow 1000px, thin 720px. */
export function Page({ width = "full", children }: { width?: "full" | "narrow" | "thin"; children: React.ReactNode }) {
  return <div className={`axd-page${width !== "full" ? ` axd-page--${width}` : ""}`}>{children}</div>;
}

/** Layout fiche 2 colonnes (§5.5). En mobile, la colonne droite passe après. */
export function Layout({ main, aside }: { main: React.ReactNode; aside?: React.ReactNode }) {
  return <div className="axd-layout"><div className="axd-stack">{main}</div>{aside && <div className="axd-stack">{aside}</div>}</div>;
}

function versBouton(a: Action, variant?: ButtonProps["variant"]) {
  return (
    <Button key={a.content} variant={variant ?? (a.destructive ? "critical" : "default")} href={a.href} external={a.external}
      onClick={a.onAction} icon={a.icon} disclosure={a.disclosure} disabled={a.disabled} loading={a.loading}>
      {a.content}
    </Button>
  );
}

/**
 * En-tête de page collant (§5.3, §7.4). À droite : secondaires puis au plus un
 * primaire noir. En mobile, seul le primaire reste ; le reste passe dans « ⋯ ».
 */
export function PageHeader({
  icon, title, backHref, titleMeta, primaryAction, secondaryActions = [], overflowActions = [], extraActions,
}: {
  icon?: IconName;
  title: React.ReactNode;
  backHref?: string;
  titleMeta?: React.ReactNode;
  primaryAction?: Action;
  secondaryActions?: Action[];
  overflowActions?: Action[];
  /** Actions secondaires qui portent leur propre comportement (ex. import avec modale). Masquées en mobile. */
  extraActions?: React.ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const [plus, setPlus] = useState(false);
  const zonePlus = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!plus) return;
    const fermer = (e: MouseEvent) => { if (!zonePlus.current?.contains(e.target as Node)) setPlus(false); };
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") setPlus(false); };
    document.addEventListener("mousedown", fermer); document.addEventListener("keydown", echap);
    return () => { document.removeEventListener("mousedown", fermer); document.removeEventListener("keydown", echap); };
  }, [plus]);
  const replies = [...secondaryActions, ...overflowActions];
  const item = (a: Action, fermer: () => void) => a.href ? (
    <Link key={a.content} href={a.href} className="axd-menu-item" onClick={fermer} {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {a.icon && <Icon name={a.icon} />}{a.content}
    </Link>
  ) : (
    <button key={a.content} type="button" disabled={a.disabled} className={`axd-menu-item${a.destructive ? " axd-menu-item--critical" : ""}`}
      onClick={() => { fermer(); a.onAction?.(); }}>
      {a.icon && <Icon name={a.icon} />}{a.content}
    </button>
  );
  return (
    <div className="axd-ph">
      <h1 className="axd-ph__title">
        {backHref && <Link href={backHref} className="axd-ph__back" aria-label="Retour"><Icon name="chevronLeft" /></Link>}
        {icon && <Icon name={icon} />}
        <span className="axd-ph__text">{title}</span>
      </h1>
      {titleMeta && <span className="axd-ph__meta">{titleMeta}</span>}
      <span className="axd-ph__sp" />
      <div className="axd-ph__actions">
        {extraActions && <span className="axd-ph__extra">{extraActions}</span>}
        {secondaryActions.map((a) => versBouton(a))}
        {overflowActions.length > 0 && (
          <div ref={zonePlus} className="axd-ph__plus">
            <button type="button" className="axd-btn" aria-expanded={plus} aria-haspopup="menu" onClick={() => setPlus((v) => !v)}>
              Plus d’actions <Icon name="chevronDown" />
            </button>
            {plus && <div className="axd-popover axd-ph__pop" role="menu">{overflowActions.map((a) => item(a, () => setPlus(false)))}</div>}
          </div>
        )}
        {primaryAction && versBouton(primaryAction, "primary")}
        {replies.length > 0 && (
          <button type="button" className="axd-icon-btn axd-ph__more" onClick={() => setMenu(true)} aria-label="Plus d’actions">
            <Icon name="dots" />
          </button>
        )}
      </div>
      <Modal open={menu} onClose={() => setMenu(false)} title="Actions">
        <div className="axd-modal__body" style={{ padding: "var(--space-150)" }}>
          {replies.map((a) => item(a, () => setMenu(false)))}
        </div>
      </Modal>
    </div>
  );
}
