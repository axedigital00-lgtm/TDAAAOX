// Bouton de l'admin marchand (masterprompt §7.1). Sans "use client" : utilisable dans une page serveur.
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icones";

export type ButtonVariant = "default" | "primary" | "plain" | "ghost" | "tint" | "critical";

const VARIANTS: Record<ButtonVariant, string> = {
  default: "bg-(--color-surface) text-(--color-text-strong) shadow-(--shadow-button) hover:bg-(--color-button-hover) active:bg-(--color-button-pressed) active:shadow-(--shadow-button-pressed)",
  primary: "bg-(--color-primary) text-(--color-text-on-dark) shadow-(--shadow-button-primary) hover:bg-(--color-primary-hover) active:bg-(--color-primary-pressed)",
  plain: "bg-transparent text-(--color-link) px-1.5! hover:underline",
  ghost: "bg-transparent text-(--color-text-strong) hover:bg-(--color-surface-tertiary) active:bg-(--color-tint-hover)",
  tint: "bg-(--color-surface-tertiary) text-(--color-text-strong) hover:bg-(--color-tint-hover)",
  critical: "bg-(--color-critical) text-(--color-text-on-dark) hover:brightness-95 active:brightness-90",
};

export function buttonClasses({ variant = "default", size = "md", fullWidth, className }: { variant?: ButtonVariant; size?: "md" | "sm"; fullWidth?: boolean; className?: string } = {}) {
  return cn(
    "adm-btn relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-(--radius-md) font-[550] select-none",
    "transition-[background-color,box-shadow,color] duration-(--duration-fast)",
    "disabled:opacity-45 disabled:pointer-events-none aria-disabled:opacity-45 aria-disabled:pointer-events-none",
    size === "md" ? "h-[30px] px-3 text-[13px]" : "h-[26px] px-2.5 text-xs",
    VARIANTS[variant], fullWidth && "w-full", className,
  );
}

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className={cn("animate-spin", className)} aria-hidden fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
      <path d="M17 10a7 7 0 0 0-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  icon?: IconName;
  iconPosition?: "start" | "end";
  /** Ajoute un chevron (menu déroulant). */
  disclosure?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  href?: string;
  type?: "button" | "submit" | "reset";
  ref?: React.Ref<HTMLButtonElement>;
};

export function Button({ variant, size, icon, iconPosition = "start", disclosure, loading, fullWidth, href, type = "button", disabled, className, children, ...rest }: ButtonProps) {
  const classes = buttonClasses({ variant, size, fullWidth, className });
  const content = (
    <>
      <span className={cn("inline-flex items-center gap-1.5", loading && "invisible")}>
        {icon && iconPosition === "start" && <Icon name={icon} />}
        {children}
        {icon && iconPosition === "end" && <Icon name={icon} />}
        {disclosure && <Icon name="chevronDown" className="-mr-1" />}
      </span>
      {loading && <Spinner className="absolute" />}
    </>
  );
  if (href && !disabled && !loading) {
    return <Link href={href} className={classes} aria-label={rest["aria-label"]}>{content}</Link>;
  }
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={classes} {...rest}>
      {content}
    </button>
  );
}

/** Bouton icône seule, 28×28 : `aria-label` obligatoire (c'est aussi son infobulle native). */
export function IconButton({ icon, className, ...rest }: Omit<ButtonProps, "children" | "iconPosition" | "disclosure" | "size" | "variant" | "fullWidth"> & { icon: IconName; "aria-label": string }) {
  const classes = cn(
    "inline-grid size-7 shrink-0 place-items-center rounded-(--radius-md) text-(--color-icon-header)",
    "transition-colors duration-(--duration-fast) hover:bg-(--color-surface-tertiary) active:bg-(--color-tint-hover)",
    "disabled:opacity-45 disabled:pointer-events-none", className,
  );
  const { href, loading, disabled, type = "button", ...attrs } = rest;
  const inner = loading ? <Spinner /> : <Icon name={icon} />;
  if (href && !disabled) return <Link href={href} className={classes} aria-label={attrs["aria-label"]} title={attrs["aria-label"]}>{inner}</Link>;
  return <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} title={attrs["aria-label"]} className={classes} {...attrs}>{inner}</button>;
}
