// Blocs communs des pages publiques (charte `.axm`) : enveloppe de page,
// hero, en-tête de section, liste cochée, section texte + visuel, FAQ et
// appel final. Les textes arrivent déjà traduits par la page.
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { NavbarMarketing } from "@/components/marketing/NavbarMarketing";
import { FooterMarketing } from "@/components/marketing/FooterMarketing";
import { Reveal } from "@/components/marketing/home/Reveal";

export function PageAxm({ children }: { children: ReactNode }) {
  return (
    <main className="overflow-x-clip" style={{ background: "#000" }}>
      <NavbarMarketing />
      <div className="axm axm-page">
        <Reveal />
        {children}
      </div>
      <FooterMarketing />
    </main>
  );
}

type Action = { label: string; href: string };

export function HeroPage({ surtitre, titre, lead, principal, secondaire, note, children, centre, image }: {
  surtitre?: string; titre: ReactNode; lead?: ReactNode; principal?: Action; secondaire?: Action;
  note?: string; children?: ReactNode; centre?: boolean;
  /** Grande image sous le texte du hero. */
  image?: { src: string; alt?: string };
}) {
  return (
    <section className="axm-section axm-hero" style={{ paddingTop: "clamp(64px, 10vw, 136px)" }}>
      <div className="axm-wrap" style={centre ? { textAlign: "center" } : undefined}>
        {surtitre && <p className="axm-eyebrow">{surtitre}</p>}
        <h1 className="axm-display" style={{ fontSize: "clamp(42px, 7vw, 96px)", maxWidth: centre ? undefined : 1040, marginInline: centre ? "auto" : undefined }}>{titre}</h1>
        {lead && <p className="axm-lead" style={{ marginTop: 28, marginInline: centre ? "auto" : undefined }}>{lead}</p>}
        {(principal || secondaire) && (
          <div style={{ display: "flex", gap: 12, marginTop: 36, flexWrap: "wrap", justifyContent: centre ? "center" : undefined }}>
            {principal && <Link href={principal.href} className="axm-btn axm-btn--primary">{principal.label}</Link>}
            {secondaire && <Link href={secondaire.href} className="axm-btn axm-btn--secondary">{secondaire.label}</Link>}
          </div>
        )}
        {note && <p className="axm-muted" style={{ fontSize: 14, marginTop: 16 }}>{note}</p>}
        {image && <img src={image.src} alt={image.alt ?? ""} className="axm-img axm-hero__image" />}
        {children}
      </div>
    </section>
  );
}

export function Section({ titre, lead, children, clair, serre, id, style }: {
  titre?: ReactNode; lead?: ReactNode; children?: ReactNode; clair?: boolean; serre?: boolean; id?: string; style?: CSSProperties;
}) {
  return (
    <section id={id} className={`axm-section${clair ? " axm-light" : ""}`} style={serre ? { paddingTop: 0, ...style } : style}>
      <div className="axm-wrap">
        {titre && <h2 className="axm-h2" style={{ maxWidth: 920 }}>{titre}</h2>}
        {lead && <p className="axm-lead" style={{ marginTop: 20 }}>{lead}</p>}
        {children && <div style={titre || lead ? { marginTop: 48 } : undefined}>{children}</div>}
      </div>
    </section>
  );
}

export function Coches({ items }: { items: string[] }) {
  return (
    <ul className="axm-checks">
      {items.map((i) => (
        <li key={i}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

/** Section texte + visuel (alternance gauche/droite avec `inverse`). */
export function Bloc({ surtitre, titre, texte, puces, lien, visuel, inverse }: {
  surtitre?: string; titre: ReactNode; texte: ReactNode; puces?: string[]; lien?: Action; visuel: ReactNode; inverse?: boolean;
}) {
  return (
    <div className={`axm-split${inverse ? " axm-split--inv" : ""}`}>
      <div>
        {surtitre && <p className="axm-eyebrow">{surtitre}</p>}
        <h3 className="axm-h3">{titre}</h3>
        <p className="axm-lead" style={{ marginTop: 16 }}>{texte}</p>
        {puces && <div style={{ marginTop: 24 }}><Coches items={puces} /></div>}
        {lien && <p style={{ marginTop: 24 }}><Link href={lien.href} className="axm-link">{lien.label} →</Link></p>}
      </div>
      <div>{visuel}</div>
    </div>
  );
}

export function Faq({ titre, items }: { titre: string; items: { q: string; r: ReactNode }[] }) {
  return (
    <div className="axm-faq-wrap">
      <h2 className="axm-h2">{titre}</h2>
      <div className="axm-faq">
        {items.map((it) => (
          <details key={it.q}>
            <summary>{it.q}<span aria-hidden className="axm-faq__plus" /></summary>
            <div className="axm-faq__r">{it.r}</div>
          </details>
        ))}
      </div>
    </div>
  );
}

export function AppelFinal({ titre, lead, principal, secondaire }: { titre: ReactNode; lead?: ReactNode; principal: Action; secondaire?: Action }) {
  return (
    <section className="axm-section axm-final">
      <div className="axm-wrap" style={{ textAlign: "center" }}>
        <img src="/brand/axso-mark.png" alt="" width={64} height={64} style={{ margin: "0 auto 28px", display: "block" }} />
        <h2 className="axm-h2" style={{ maxWidth: 900, marginInline: "auto" }}>{titre}</h2>
        {lead && <p className="axm-lead" style={{ marginTop: 20, marginInline: "auto" }}>{lead}</p>}
        <div style={{ display: "flex", gap: 12, marginTop: 36, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href={principal.href} className="axm-btn axm-btn--primary">{principal.label}</Link>
          {secondaire && <Link href={secondaire.href} className="axm-btn axm-btn--secondary">{secondaire.label}</Link>}
        </div>
      </div>
    </section>
  );
}

/** Cartes à lien (navigation entre pages). */
export function CartesLiens({ items, colonnes = 3 }: { items: { titre: string; texte: string; href: string; lien: string; externe?: boolean }[]; colonnes?: 2 | 3 | 4 }) {
  return (
    <div className={`axm-grid axm-g${colonnes}`}>
      {items.map((c) => {
        const contenu = (
          <>
            <h3 className="axm-h4">{c.titre}</h3>
            <p className="axm-muted" style={{ marginTop: 10, lineHeight: 1.55 }}>{c.texte}</p>
            <span className="axm-link" style={{ marginTop: "auto", paddingTop: 20 }}>{c.lien} →</span>
          </>
        );
        const style: CSSProperties = { display: "flex", flexDirection: "column", color: "inherit", textDecoration: "none", minHeight: 220 };
        return c.externe
          ? <a key={c.titre} href={c.href} target="_blank" rel="noopener noreferrer" className="axm-card axm-card--lien" style={style}>{contenu}</a>
          : <Link key={c.titre} href={c.href} className="axm-card axm-card--lien" style={style}>{contenu}</Link>;
      })}
    </div>
  );
}

/** Contenus annoncés mais pas encore publiés (blog, tutoriels, guides). */
export function GrilleAVenir({ items, etiquette, image }: { items: { titre: string; tag?: string; detail?: string }[]; etiquette: string; image?: boolean }) {
  return (
    <div className="axm-grid axm-g3">
      {items.map((it) => (
        <div key={it.titre} className="axm-card" style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: image ? undefined : 200, padding: image ? 0 : undefined }}>
          {image && (
            <div style={{ aspectRatio: "16 / 9", background: "var(--m-card-2)", display: "grid", placeItems: "center", position: "relative" }}>
              <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden><circle cx="22" cy="22" r="21" fill="rgba(255,255,255,.12)" /><path d="M18 15l12 7-12 7z" fill="#fff" /></svg>
              <span className="axm-theme__badge">{etiquette}</span>
            </div>
          )}
          <div style={image ? { padding: "8px 24px 24px", display: "grid", gap: 8 } : { display: "contents" }}>
            {it.tag && <p className="axm-muted" style={{ fontSize: 14, fontWeight: 600 }}>{it.tag}</p>}
            <h3 className="axm-h4">{it.titre}</h3>
            {it.detail && <p className="axm-muted" style={{ lineHeight: 1.55 }}>{it.detail}</p>}
            {!image && <span className="axm-mock__tag" style={{ marginTop: "auto", width: "fit-content", background: "rgba(255,255,255,.1)", color: "var(--m-muted)" }}>{etiquette}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

const LEGAL = [
  { href: "/legal/cgu", label: "Conditions d’utilisation" },
  { href: "/legal/privacy", label: "Confidentialité" },
  { href: "/legal/cookies", label: "Cookies" },
  { href: "/legal/abonnements", label: "Abonnements" },
  { href: "/legal/politique-prix", label: "Politique de prix" },
];

/** Pages légales : document sur fond clair, sommaire des autres textes à gauche. */
export function PageLegale({ titre, maj, actif, t, children }: { titre: string; maj: string; actif: string; t: (s: string) => string; children: ReactNode }) {
  return (
    <PageAxm>
      <section className="axm-section axm-light" style={{ paddingTop: "clamp(56px, 8vw, 112px)" }}>
        <div className="axm-wrap">
          <p className="axm-eyebrow">{t("Légal")}</p>
          <h1 className="axm-h2" style={{ maxWidth: 900 }}>{titre}</h1>
          <p className="axm-muted" style={{ marginTop: 16, fontSize: 15 }}>{maj}</p>
          <div className="axm-legal">
            <nav aria-label={t("Documents légaux")} className="axm-legal__nav">
              {LEGAL.map((l) => <Link key={l.href} href={l.href} aria-current={l.href === actif ? "page" : undefined}>{t(l.label)}</Link>)}
            </nav>
            <div className="axm-legal__doc">{children}</div>
          </div>
        </div>
      </section>
    </PageAxm>
  );
}
