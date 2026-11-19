// Bannière dans la page (masterprompt §7.11). Les gestionnaires viennent d'un composant client parent.
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icones";
import { buttonClasses } from "./Button";

export type BannerTone = "info" | "warning" | "critical" | "success";

const TONES: Record<BannerTone, string> = {
  info: "bg-(--banner-info-bg) text-(--banner-info-text)",
  warning: "bg-(--banner-warning-bg) text-(--banner-warning-text)",
  critical: "bg-(--banner-critical-bg) text-(--banner-critical-text)",
  success: "bg-(--banner-success-bg) text-(--banner-success-text)",
};

export type BannerProps = {
  tone?: BannerTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: { content: string; href?: string; onAction?: () => void };
  /** Affiche ✕ ; `dismissLabel` = nom accessible (déjà traduit). */
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
};

export function Banner({ tone = "info", title, children, action, onDismiss, dismissLabel = "Fermer", className }: BannerProps) {
  return (
    <div role={tone === "critical" || tone === "warning" ? "alert" : "status"} data-tone={tone}
      className={cn("flex items-start gap-2.5 rounded-(--radius-lg) px-3 py-2.5 [&_a]:underline", TONES[tone], className)}>
      <Icon name={tone === "success" ? "checkCircle" : "info"} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        {title && <div className="font-[650]">{title}</div>}
        {children}
      </div>
      {action && (action.href
        ? <Link href={action.href} className={buttonClasses({ size: "sm", className: "no-underline!" })}>{action.content}</Link>
        : <button type="button" onClick={action.onAction} className={buttonClasses({ size: "sm" })}>{action.content}</button>)}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label={dismissLabel} title={dismissLabel}
          className="-mt-0.5 -mr-1 grid size-6 place-items-center rounded-(--radius-md) hover:bg-black/5">
          <Icon name="x" />
        </button>
      )}
    </div>
  );
}
