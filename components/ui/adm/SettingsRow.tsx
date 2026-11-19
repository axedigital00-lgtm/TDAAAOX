// Ligne de réglage / de liste de ressources (masterprompt §7.9).
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icones";

export type SettingsRowProps = {
  icon?: IconName;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Valeur grise, badge, toggle ou bouton. */
  end?: React.ReactNode;
  href?: string;
  onClick?: () => void;
};

export function SettingsRow({ icon, title, subtitle, end, href, onClick }: SettingsRowProps) {
  const clickable = !!(href || onClick);
  const inner = (
    <>
      {icon && <Icon name={icon} className="text-(--color-icon-header)" />}
      <div className="min-w-0 flex-1 text-left">
        <div className="font-[550] text-(--color-text-strong)">{title}</div>
        {subtitle && <div className="text-xs text-(--color-text-secondary)">{subtitle}</div>}
      </div>
      {end && <div className="flex shrink-0 items-center gap-2 text-(--color-text-secondary)">{end}</div>}
      {clickable && <Icon name="chevronRight" className="text-(--color-text-subdued)" />}
    </>
  );
  const cls = cn(
    "flex w-full items-center gap-3 px-4 py-3 max-[820px]:px-3.5 [&+&]:border-t [&+&]:border-(--color-border-secondary)",
    clickable && "cursor-pointer transition-colors duration-(--duration-fast) hover:bg-(--color-surface-secondary)",
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

/** Liste de lignes dans une carte. */
export function ResourceList({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("adm-card overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)", className)}>{children}</div>;
}
