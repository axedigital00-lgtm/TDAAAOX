"use client";
// En-tête de page collant (masterprompt §7.4, §5.3). En mobile (≤ 820 px), les actions
// secondaires et le débordement passent dans le menu « ⋯ » ouvert en BottomSheet.
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/I18nProvider";
import { Icon, type IconName } from "@/components/ui/icones";
import { Button, IconButton } from "./Button";
import { BottomSheet } from "./Overlays";
import { Menu, Popover, type Action } from "./Popover";

export type PageHeaderProps = {
  icon?: IconName;
  title: React.ReactNode;
  backHref?: string;
  /** Badges, méta (date, canal…). Masqués en mobile. */
  titleMeta?: React.ReactNode;
  primaryAction?: Action & { loading?: boolean };
  secondaryActions?: Action[];
  overflowActions?: Action[];
};

export function PageHeader({ icon, title, backHref, titleMeta, primaryAction, secondaryActions = [], overflowActions = [] }: PageHeaderProps) {
  const t = useT();
  const [more, setMore] = useState(false);
  const [sheet, setSheet] = useState(false);
  const mobileItems = [...secondaryActions, ...overflowActions];
  return (
    <div className={cn(
      "sticky top-0 z-(--z-header) -mx-(--page-padding-x) mb-1 flex min-h-14 items-center gap-2 bg-white/96 px-(--page-padding-x) py-2.5 backdrop-blur-[6px]",
      "max-[820px]:top-[52px] max-[820px]:min-h-[52px] max-[820px]:py-2",
    )}>
      {backHref && <IconButton icon="chevronLeft" href={backHref} aria-label={t("Retour")} />}
      <h1 className="m-0 flex min-w-0 items-center gap-2 text-sm font-[650] text-(--color-text-strong) max-[820px]:text-[15px]">
        {icon && <Icon name={icon} className="text-(--color-icon-header)" />}
        <span className="truncate">{title}</span>
      </h1>
      {titleMeta && <div className="flex items-center gap-2 text-[13px] text-(--color-text-secondary) max-[820px]:hidden">{titleMeta}</div>}
      <div className="flex-1" />
      <div className="flex items-center gap-2 max-[820px]:hidden">
        {secondaryActions.map((a) => (
          <Button key={a.content} icon={a.icon} href={a.href} onClick={a.onAction} disabled={a.disabled} variant={a.destructive ? "critical" : "default"}>{a.content}</Button>
        ))}
        {overflowActions.length > 0 && (
          <Popover open={more} onClose={() => setMore(false)} align="end"
            activator={<Button disclosure aria-haspopup="menu" aria-expanded={more} onClick={() => setMore((v) => !v)}>{t("Plus d'actions")}</Button>}>
            <Menu items={overflowActions} onItem={() => setMore(false)} label={t("Plus d'actions")} />
          </Popover>
        )}
      </div>
      {mobileItems.length > 0 && (
        <span className="hidden max-[820px]:inline-grid">
          <IconButton icon="dots" aria-label={t("Plus d'actions")} aria-haspopup="dialog" onClick={() => setSheet(true)} />
        </span>
      )}
      {primaryAction && (
        <Button variant="primary" icon={primaryAction.icon} href={primaryAction.href} onClick={primaryAction.onAction}
          disabled={primaryAction.disabled} loading={primaryAction.loading}>{primaryAction.content}</Button>
      )}
      {mobileItems.length > 0 && (
        <BottomSheet open={sheet} onClose={() => setSheet(false)} title={t("Actions")}>
          <Menu items={mobileItems} onItem={() => setSheet(false)} label={t("Actions")} />
        </BottomSheet>
      )}
    </div>
  );
}
