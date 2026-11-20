"use client";
// Cadre des écrans de compte : fond sombre, carte blanche centrée avec le logo,
// liens d'aide et mentions sous la carte. Styles : ./auth.css.
import "@fontsource-variable/inter/wght.css";
import "./auth.css";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";

export function AuthCadre({ children, large }: { children: React.ReactNode; large?: boolean }) {
  const t = useT();
  return (
    <div className="axa">
      <div className={`axa-carte${large ? " axa-carte--large" : ""}`}>
        <Link href="/" className="axa-logo" aria-label="AXSO"><img src="/logo.png" alt="AXSO" /></Link>
        {children}
      </div>
      <nav className="axa-pied" aria-label={t("Liens utiles")}>
        <Link href="/contact">{t("Aide")}</Link>
        <Link href="/legal/privacy">{t("Confidentialité")}</Link>
        <Link href="/legal/cgu">{t("Conditions")}</Link>
      </nav>
    </div>
  );
}
