"use client";
// Composants simples du design system : Card, Banner, EmptyState, Toggle,
// Field, Tabs, SettingsRow, Divider (MASTERPROMPT §7.3, 7.7, 7.9–7.11, 7.13).
import Link from "next/link";
import { useId } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { EmptyArt, type EmptyIllustration } from "../illustrations/Illustration";

export function Card({ title, actions, padding = "md", children }: { title?: React.ReactNode; actions?: React.ReactNode; padding?: "none" | "md"; children?: React.ReactNode }) {
  return (
    <section className={`axd-card${padding === "md" ? " axd-card--pad" : ""}`}>
      {(title || actions) && (
        <div className="axd-card__head" style={padding === "none" ? { padding: "var(--space-300) var(--space-400) 0" } : undefined}>
          {title && <h2 className="axd-card__title">{title}</h2>}
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
  return (
    <div className={`axd-banner${tone !== "info" ? ` axd-banner--${tone}` : ""}`} role={tone === "critical" ? "alert" : "status"}>
      <Icon name={tone === "success" ? "checkCircle" : "info"} />
      <div className="axd-banner__body">{title && <b>{title} </b>}{children}</div>
      {action}
      {onDismiss && <button type="button" className="axd-icon-btn" onClick={onDismiss} aria-label="Fermer" style={{ color: "inherit" }}><Icon name="x" /></button>}
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
  return (
    <>
      <div className="axd-card"><div className="axd-empty">
        {illustration && <EmptyArt name={illustration} />}
        <h3>{heading}</h3>
        {children && <p>{children}</p>}
        {actions && <div className="axd-empty__actions">{actions}</div>}
      </div></div>
      {footerSubject && (
        <p className="axd-foot-link">En savoir plus sur les {footerHref ? <Link href={footerHref}>{footerSubject}</Link> : <span>{footerSubject}</span>}</p>
      )}
    </>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="axd-toggle" onClick={() => onChange(!checked)} />;
}

export function Field({ label, help, error, children }: { label: string; help?: string; error?: string; children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode }) {
  const id = useId();
  const desc = error ? `${id}-err` : help ? `${id}-help` : undefined;
  return (
    <div className="axd-field">
      <label className="axd-field__label" htmlFor={id}>{label}</label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": desc })}
      {error ? <p id={desc} className="axd-field__error"><Icon name="info" />{error}</p> : help && <p id={desc} className="axd-field__help">{help}</p>}
    </div>
  );
}

export function Tabs({ tabs }: { tabs: { id: string; label: string; href: string; selected: boolean }[] }) {
  return (
    <nav className="axd-tabs" aria-label="Onglets">
      {tabs.map((t) => <Link key={t.id} href={t.href} className="axd-tab" aria-current={t.selected ? "page" : undefined}>{t.label}</Link>)}
    </nav>
  );
}

export function SettingsRow({ icon, title, subtitle, right, href, onClick, chevron = !!(href || onClick) }: {
  icon?: IconName; title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode;
  href?: string; onClick?: () => void; chevron?: boolean;
}) {
  const contenu = (
    <>
      {icon && <Icon name={icon} />}
      <div className="axd-row__body"><div className="axd-row__title">{title}</div>{subtitle && <div className="axd-row__sub">{subtitle}</div>}</div>
      {right}
      {chevron && <span className="axd-row__chev"><Icon name="chevronRight" /></span>}
    </>
  );
  if (href) return <Link href={href} className="axd-row">{contenu}</Link>;
  if (onClick) return <button type="button" className="axd-row" onClick={onClick}>{contenu}</button>;
  return <div className="axd-row">{contenu}</div>;
}
