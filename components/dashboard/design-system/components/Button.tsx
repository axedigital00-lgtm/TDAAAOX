"use client";
import Link from "next/link";
import { Icon, type IconName } from "../icons/Icon";

export type ButtonVariant = "default" | "primary" | "plain" | "ghost" | "tint" | "critical";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  icon?: IconName;
  iconPosition?: "start" | "end";
  /** Ajoute un chevron (menu déroulant). */
  disclosure?: boolean;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  href?: string;
  /** Lien externe : ouvert dans un nouvel onglet. */
  external?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  type?: "button" | "submit";
  "aria-label"?: string;
  title?: string;
  children?: React.ReactNode;
};

export function buttonClass({ variant = "default", size = "md", fullWidth, loading }: Pick<ButtonProps, "variant" | "size" | "fullWidth" | "loading">) {
  return [
    "axd-btn",
    variant !== "default" && `axd-btn--${variant}`,
    size === "sm" && "axd-btn--sm",
    fullWidth && "axd-btn--full",
    loading && "axd-btn--loading",
  ].filter(Boolean).join(" ");
}

export function Button({
  variant, size, icon, iconPosition = "start", disclosure, loading, disabled, fullWidth,
  href, external, onClick, type = "button", children, ...aria
}: ButtonProps) {
  const cls = buttonClass({ variant, size, fullWidth, loading });
  const contenu = (
    <>
      {icon && iconPosition === "start" && <Icon name={icon} />}
      {children !== undefined && <span>{children}</span>}
      {icon && iconPosition === "end" && <Icon name={icon} />}
      {disclosure && <Icon name="chevronDown" />}
      {loading && <span className="axd-spinner" aria-hidden />}
    </>
  );
  if (href && !disabled) {
    return external
      ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls} onClick={onClick} {...aria}>{contenu}</a>
      : <Link href={href} className={cls} onClick={onClick} {...aria}>{contenu}</Link>;
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled || loading} aria-busy={loading || undefined} {...aria}>
      {contenu}
    </button>
  );
}

/** Bouton icône seul, 28×28 : `aria-label` obligatoire (§7.1). */
export function IconButton({ icon, onClick, href, "aria-label": label, className }: { icon: IconName; onClick?: (e: React.MouseEvent) => void; href?: string; "aria-label": string; className?: string }) {
  const cls = ["axd-icon-btn", className].filter(Boolean).join(" ");
  if (href) return <Link href={href} className={cls} aria-label={label} title={label}><Icon name={icon} /></Link>;
  return <button type="button" className={cls} onClick={onClick} aria-label={label} title={label}><Icon name={icon} /></button>;
}
