"use client";
// Pied de page du site public : quatre colonnes de liens, puis région, langue
// et mentions légales.
import "@fontsource-variable/inter/wght.css";
import "./site/site.css";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { LangueSelecteur } from "@/components/ui/LangueSelecteur";

const COLONNES: { titre: string; liens: { label: string; href: string }[] }[] = [
  { titre: "AXSO", liens: [
    { label: "À propos", href: "/about" }, { label: "Carrières", href: "/jobs" },
    { label: "Presse", href: "/press" }, { label: "Témoignages", href: "/temoignages" },
  ] },
  { titre: "Écosystème", liens: [
    { label: "Thèmes", href: "/themes" }, { label: "Fonctionnalités", href: "/fonctionnalites" },
    { label: "Programme d’affiliation", href: "/affiliation" }, { label: "Documentation", href: "/docs" },
  ] },
  { titre: "Ressources", liens: [
    { label: "Blog", href: "/blog" }, { label: "Tutoriels vidéo", href: "/tutorials" },
    { label: "Tarifs", href: "/tarifs" }, { label: "Outils gratuits", href: "/outils" }, { label: "Suivre un colis", href: "/suivi" },
  ] },
  { titre: "Assistance", liens: [
    { label: "Contact", href: "/contact" }, { label: "Communauté", href: "/community" },
    { label: "Se connecter", href: "/connexion" }, { label: "Créer une boutique", href: "/inscription" },
  ] },
];

const LEGAL = [
  { label: "Conditions d’utilisation", href: "/legal/cgu" },
  { label: "Confidentialité", href: "/legal/privacy" },
  { label: "Cookies", href: "/legal/cookies" },
  { label: "Abonnements", href: "/legal/abonnements" },
  { label: "Politique de prix", href: "/legal/politique-prix" },
];

export function FooterMarketing() {
  const t = useT();
  return (
    <footer className="axm axm-footer">
      <div className="axm-wrap">
        <div className="axm-footer__cols">
          <div>
            <Link href="/" aria-label="AXSO"><img src="/logo-dark.png" alt="AXSO" style={{ height: 34, width: "auto" }} /></Link>
            <p className="axm-muted" style={{ fontSize: 15, marginTop: 16, maxWidth: 260 }}>{t("La plateforme de commerce pensée pour l’Afrique : boutique en ligne, WhatsApp, caisse et livraison au même endroit.")}</p>
          </div>
          {COLONNES.map((c) => (
            <nav key={c.titre} aria-label={t(c.titre)}>
              <h3>{t(c.titre)}</h3>
              <ul>{c.liens.map((l) => <li key={l.href + l.label}><Link href={l.href}>{t(l.label)}</Link></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className="axm-footer__bottom">
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span>© {new Date().getFullYear()} AXSO · {t("Afrique")}</span>
            <LangueSelecteur ouvrirVers="haut" />
          </div>
          <nav className="axm-footer__legal" aria-label={t("Mentions légales")}>
            {LEGAL.map((l) => <Link key={l.href} href={l.href}>{t(l.label)}</Link>)}
          </nav>
        </div>
      </div>
    </footer>
  );
}
