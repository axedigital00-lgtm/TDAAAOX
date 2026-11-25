"use client";
// Composants simples du design system : Card, Banner, EmptyState, Toggle,
// Field, Tabs, SettingsRow, Divider (MASTERPROMPT §7.3, 7.7, 7.9–7.11, 7.13).
import Link from "next/link";
import { useId } from "react";
import { useT } from "@/components/I18nProvider";
import { Icon, type IconName } from "../icons/Icon";
import { EmptyArt, type EmptyIllustration } from "../illustrations/Illustration";

export function Card({ title, actions, padding = "md", children }: { title?: React.ReactNode; actions?: React.ReactNode; padding?: "none" | "md"; children?: React.ReactNode }) {
  const t = useT();
  return (
    <section className={`axd-card${padding === "md" ? " axd-card--pad" : ""}`}>
      {(title || actions) && (
        <div className="axd-card__head" style={padding === "none" ? { padding: "var(--space-300) var(--space-400) 0" } : undefined}>
          {title && <h2 className="axd-card__title">{t(title)}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function CardSection({ children }: { children: React.ReactNode }) {
  return <div className="axd-card__section">{children}</div>;
}

export function Divider() { return <div className="axd-divider" role="separator" />; }

export function Banner({ tone = "info", title, children, action, onDismiss }: {
  tone?: "info" | "warning" | "critical" | "success";
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
}) {
  const t = useT();
  return (
    <div className={`axd-banner${tone !== "info" ? ` axd-banner--${tone}` : ""}`} role={tone === "critical" ? "alert" : "status"}>
      <Icon name={tone === "success" ? "checkCircle" : "info"} />
      <div className="axd-banner__body">{title && <b>{t(title)} </b>}{t(children)}</div>
      {action}
      {onDismiss && <button type="button" className="axd-icon-btn" onClick={onDismiss} aria-label={t("Fermer")} style={{ color: "inherit" }}><Icon name="x" /></button>}
    </div>
  );
}

export function EmptyState({ illustration, heading, children, actions, footerSubject, footerHref }: {
  illustration?: EmptyIllustration;
  heading: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  /** « En savoir plus sur les {sujet} » sous la carte. */
  footerSubject?: string;
  footerHref?: string;
}) {
  const t = useT();
  return (
    <>
      <div className="axd-card"><div className="axd-empty">
        {illustration && <EmptyArt name={illustration} />}
        <h3>{t(heading)}</h3>
        {children && <p>{t(children)}</p>}
        {actions && <div className="axd-empty__actions">{actions}</div>}
      </div></div>
      {footerSubject && (
        <p className="axd-foot-link">{t("En savoir plus sur les")} {footerHref ? <Link href={footerHref}>{t(footerSubject)}</Link> : <span>{t(footerSubject)}</span>}</p>
      )}
    </>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const t = useT();
  return <button type="button" role="switch" aria-checked={checked} aria-label={t(label)} disabled={disabled} className="axd-toggle" onClick={() => onChange(!checked)} />;
}

export function Field({ label, help, error, children }: { label: string; help?: string; error?: string; children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode }) {
  const id = useId();
  const t = useT();
  const desc = error ? `${id}-err` : help ? `${id}-help` : undefined;
  return (
    <div className="axd-field">
      <label className="axd-field__label" htmlFor={id}>{t(label)}</label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": desc })}
      {error ? <p id={desc} className="axd-field__error"><Icon name="info" />{t(error)}</p> : help && <p id={desc} className="axd-field__help">{t(help)}</p>}
    </div>
  );
}

export function Tabs({ tabs }: { tabs: { id: string; label: string; href: string; selected: boolean }[] }) {
  const t = useT();
  return (
    <nav className="axd-tabs" aria-label={t("Onglets")}>
      {tabs.map((o) => <Link key={o.id} href={o.href} className="axd-tab" aria-current={o.selected ? "page" : undefined}>{t(o.label)}</Link>)}
    </nav>
  );
}

export function SettingsRow({ icon, title, subtitle, right, href, onClick, chevron = !!(href || onClick) }: {
  icon?: IconName; title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode;
  href?: string; onClick?: () => void; chevron?: boolean;
}) {
  const t = useT();
  const contenu = (
    <>
      {icon && <Icon name={icon} />}
      <div className="axd-row__body"><div className="axd-row__title">{t(title)}</div>{subtitle && <div className="axd-row__sub">{t(subtitle)}</div>}</div>
      {right}
      {chevron && <span className="axd-row__chev"><Icon name="chevronRight" /></span>}
    </>
  );
  if (href) return <Link href={href} className="axd-row">{contenu}</Link>;
  if (onClick) return <button type="button" className="axd-row" onClick={onClick}>{contenu}</button>;
  return <div className="axd-row">{contenu}</div>;
}
