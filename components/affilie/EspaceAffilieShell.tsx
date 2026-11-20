"use client";
// Cadre de l'Espace affilié (/affilie) : même cadre que l'admin marchand (bordure noire,
// barre latérale sombre, zone blanche arrondie) ; en-tête + onglets flottants sur téléphone.
import "@/components/dashboard/design-system/tokens/tokens.css";
import "@/components/dashboard/design-system/ds.css";
import "@/components/dashboard/design-system/legacy.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Link2, Wallet, User, type LucideIcon } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { LangueSelecteur } from "@/components/ui/LangueSelecteur";

const ONGLETS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/affilie", label: "Accueil", Icon: Home },
  { href: "/affilie/catalogue", label: "Catalogue", Icon: Search },
  { href: "/affilie/liens", label: "Mes liens", Icon: Link2 },
  { href: "/affilie/gains", label: "Gains", Icon: Wallet },
  { href: "/affilie/profil", label: "Profil", Icon: User },
];

export function Initiale({ nom, logoUrl, taille = 28 }: { nom: string; logoUrl?: string | null; taille?: number }) {
  return logoUrl ? (
    <img src={logoUrl} alt="" className="rounded-lg object-cover flex-shrink-0 bg-white" style={{ width: taille, height: taille }} />
  ) : (
    <span className="rounded-lg flex items-center justify-center flex-shrink-0 font-semibold"
      style={{ width: taille, height: taille, background: "var(--color-brand, #EBA900)", color: "var(--color-brand-ink, #0A1A33)", fontSize: taille * 0.42 }}>
      {nom.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function EspaceAffilieShell({ nom, children }: { nom: string; children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname() ?? "";
  const actif = (href: string) => (href === "/affilie" ? pathname === href : pathname.startsWith(href));
  const titre = ONGLETS.find((o) => actif(o.href))?.label ?? "Espace affilié";

  return (
    <div className="ax-admin axd-shell axd-affilie">
      <aside className="axd-nav" aria-label={t("Navigation")}>
        <div className="axd-nav__top">
          <Link href="/" className="axd-logo" aria-label="Axso"><img src="/logo-dark.png" alt="Axso" /></Link>
          <span className="axd-affilie__tag">{t("Affilié")}</span>
        </div>
        <nav className="axd-nav__scroll">
          {ONGLETS.map((o) => (
            <Link key={o.href} href={o.href} className="axd-nav-item" aria-current={actif(o.href) ? "page" : undefined}>
              <o.Icon size={18} /><span className="axd-nav-item__label">{t(o.label)}</span>
            </Link>
          ))}
        </nav>
        <div className="axd-nav__bottom" style={{ display: "grid", gap: 6 }}>
          <div className="axd-affilie__langue"><LangueSelecteur /></div>
          <div className="axd-store-chip"><span className="axd-store-av">{nom.trim().charAt(0).toUpperCase() || "A"}</span><span className="axd-store-chip__name">{nom}</span></div>
        </div>
      </aside>

      <div className="axd-main">
        <header className="axd-affilie__mtop">
          <Link href="/" aria-label="Axso" style={{ flex: "none" }}><img src="/logo-dark.png" alt="Axso" style={{ height: 24, width: "auto", display: "block" }} /></Link>
          <p style={{ flex: 1, minWidth: 0, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, color: "#fff" }}>{t(titre)}</p>
          <LangueSelecteur ouvrirVers="bas" aligner="droite" />
        </header>
        <main className="axd-content axd-content--legacy" style={{ maxWidth: 1000 }}>{children}</main>
      </div>

      <nav className="axd-affilie__tabs" aria-label={t("Navigation")}>
        {ONGLETS.map((o) => (
          <Link key={o.href} href={o.href} aria-current={actif(o.href) ? "page" : undefined}>
            <o.Icon size={19} />
            <span>{t(o.label)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
