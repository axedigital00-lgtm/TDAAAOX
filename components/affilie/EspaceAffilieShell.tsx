"use client";
// Cadre de l'Espace affilié (/affilie) : barre latérale sur ordinateur, en-tête + onglets flottants
// sur téléphone, dans le style du tableau de bord marchand.
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
    <span className="rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-[#B7791F]"
      style={{ width: taille, height: taille, background: "rgba(245,166,35,0.14)", fontSize: taille * 0.42 }}>
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
    <div className="min-h-dvh bg-[#F5F5F5] text-[#111] md:flex" style={{ fontFamily: "'Poppins','Century Gothic',system-ui,sans-serif" }}>
      <aside className="hidden md:flex flex-col w-[252px] h-screen sticky top-0 bg-white border-r border-gray-100 flex-shrink-0">
        <div className="h-[60px] flex items-center gap-2.5 px-5 border-b border-gray-100">
          <Link href="/" aria-label="Axso"><img src="/logo.png" alt="Axso" className="h-8 w-auto" /></Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-full bg-[#111] text-[#F5A623]">{t("Affilié")}</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {ONGLETS.map((o) => (
            <Link key={o.href} href={o.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${actif(o.href) ? "bg-[#FFF6E6] text-[#111]" : "text-[#666] hover:bg-gray-50"}`}>
              <o.Icon size={16} className={actif(o.href) ? "text-[#F5A623]" : ""} />{t(o.label)}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100 space-y-2">
          <LangueSelecteur />
          <p className="px-2 text-[12px] text-[#999] truncate">{nom}</p>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100">
          <div className="h-14 px-4 flex items-center gap-3">
            <Link href="/" aria-label="Axso" className="flex-shrink-0"><img src="/logo.png" alt="Axso" className="h-7 w-auto" /></Link>
            <p className="flex-1 min-w-0 truncate text-[14px] font-bold">{t(titre)}</p>
            <LangueSelecteur ouvrirVers="bas" aligner="droite" />
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-8 pb-32 md:pb-12">{children}</main>
      </div>

      <nav className="md:hidden fixed z-40 left-2 right-2 flex items-center justify-between gap-1 p-1.5 rounded-[28px] bg-white/97 border border-gray-200/80"
        style={{ bottom: "max(14px, env(safe-area-inset-bottom))", boxShadow: "0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)" }}>
        {ONGLETS.map((o) => (
          <Link key={o.href} href={o.href}
            className={`flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-[22px] transition-colors ${actif(o.href) ? "bg-[#111] text-white" : "text-[#999]"}`}>
            <o.Icon size={19} className={actif(o.href) ? "text-[#F5A623]" : ""} />
            <span className="text-[10px] font-bold leading-none truncate">{t(o.label)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
