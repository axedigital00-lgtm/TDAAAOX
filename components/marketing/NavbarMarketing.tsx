"use client";
// Navigation du site public : logo, menus déroulants, Tarifs, connexion et
// inscription. Menu plein écran sur mobile.
// Au défilement : transparente en haut de page, elle se cache quand on descend
// et revient (fond plein, flou) dès qu'on remonte.
import "@fontsource-variable/inter/wght.css";
import "./site/site.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/components/I18nProvider";

type Lien = { label: string; desc?: string; href: string };
type Menu = { id: string; label: string; titre: string; liens: Lien[] };

const MENUS: Menu[] = [
  {
    id: "pourquoi", label: "Pourquoi AXSO", titre: "Pensé pour vendre en Afrique",
    liens: [
      { label: "Lancer sa boutique", desc: "En ligne en quelques minutes, sans carte bancaire.", href: "/inscription" },
      { label: "Fonctionnalités", desc: "Tout ce qu’AXSO fait pour votre commerce.", href: "/fonctionnalites" },
      { label: "Témoignages", desc: "Des marchands racontent leur croissance.", href: "/temoignages" },
      { label: "À propos", desc: "Notre mission et notre équipe.", href: "/about" },
    ],
  },
  {
    id: "produits", label: "Produits", titre: "Tout pour vendre, partout",
    liens: [
      { label: "Boutique en ligne", desc: "Thèmes prêts à vendre et constructeur visuel.", href: "/themes" },
      { label: "Vente sur WhatsApp", desc: "Commandes WhatsApp reçues dans votre admin.", href: "/fonctionnalites" },
      { label: "Caisse en magasin", desc: "Encaissez en boutique, stock synchronisé.", href: "/fonctionnalites" },
      { label: "Stella, votre assistante IA", desc: "Analyse, fiches produits, relances.", href: "/#axia" },
      { label: "Affiliation", desc: "Faites vendre vos produits par des créateurs.", href: "/affiliation" },
      { label: "Documentation", desc: "Guides et intégrations.", href: "/docs" },
    ],
  },
  {
    id: "ressources", label: "Ressources", titre: "Apprendre et échanger",
    liens: [
      { label: "Blog", desc: "Conseils pour vendre plus.", href: "/blog" },
      { label: "Tutoriels vidéo", desc: "Pas à pas, en quelques minutes.", href: "/tutorials" },
      { label: "Communauté", desc: "Échangez avec d’autres marchands.", href: "/community" },
      { label: "Suivre un colis", desc: "Pour vos clients.", href: "/suivi" },
    ],
  },
];

export function NavbarMarketing() {
  const t = useT();
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const zone = useRef<HTMLElement>(null);
  const [etat, setEtat] = useState<"haut" | "visible" | "cache">("haut");

  useEffect(() => { setOuvert(null); setMobile(false); }, [pathname]);
  useEffect(() => {
    const fermer = (e: MouseEvent) => { if (!zone.current?.contains(e.target as Node)) setOuvert(null); };
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") { setOuvert(null); setMobile(false); } };
    document.addEventListener("mousedown", fermer); document.addEventListener("keydown", echap);
    return () => { document.removeEventListener("mousedown", fermer); document.removeEventListener("keydown", echap); };
  }, []);
  useEffect(() => { document.body.style.overflow = mobile ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [mobile]);
  useEffect(() => {
    let dernier = window.scrollY, attente = false;
    const maj = () => {
      attente = false;
      const y = window.scrollY;
      if (y < 12) setEtat("haut");
      else if (y > dernier + 6 && y > 140) setEtat("cache");
      else if (y < dernier - 6) setEtat("visible");
      dernier = y;
    };
    const onScroll = () => { if (!attente) { attente = true; requestAnimationFrame(maj); } };
    maj();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Menu ouvert : la barre reste affichée.
  const etatAffiche = (ouvert || mobile) && etat === "cache" ? "visible" : etat;

  return (
    <header className="axm axm-nav" ref={zone} data-etat={etatAffiche} data-menu={ouvert || undefined}>
      <div className="axm-wrap axm-nav__in">
        <Link href="/" className="axm-nav__logo" aria-label="AXSO"><img src="/logo-dark.png" alt="AXSO" /></Link>
        <nav className="axm-nav__menu" aria-label={t("Navigation principale")}>
          {MENUS.map((m) => (
            <div key={m.id} className="axm-nav__item" onMouseEnter={() => setOuvert(m.id)} onMouseLeave={() => setOuvert(null)}>
              <button type="button" className="axm-nav__btn" aria-expanded={ouvert === m.id} onClick={() => setOuvert(ouvert === m.id ? null : m.id)}>
                {t(m.label)}
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M5 8l5 5 5-5" /></svg>
              </button>
              {ouvert === m.id && (
                <div className="axm-mega" role="menu">
                  <div className="axm-wrap axm-mega__in">
                    <p className="axm-mega__col-title">{t(m.titre)}</p>
                    <div className="axm-mega__liens">
                      {m.liens.map((l) => (
                        <Link key={l.label} href={l.href} role="menuitem"><b>{t(l.label)}</b>{l.desc && <span>{t(l.desc)}</span>}</Link>
                      ))}
                    </div>
                    <Link href="/inscription" className="axm-mega__une" role="menuitem">
                      <img src={m.id === "ressources" ? "/catalogue-atelier.webp" : m.id === "produits" ? "/theme-noir-atelier.webp" : "/hero-market.webp"} alt="" loading="lazy" />
                      <b>{t("Démarrer gratuitement")}</b>
                      <span>{t("Votre boutique en ligne en quelques minutes.")}</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
          <Link href="/tarifs" className="axm-nav__btn">{t("Tarifs")}</Link>
        </nav>
        <div className="axm-nav__right">
          <Link href="/connexion" className="axm-nav__btn axm-hide-m">{t("Se connecter")}</Link>
          <Link href="/inscription" className="axm-btn axm-btn--primary axm-btn--sm axm-hide-m">{t("Démarrer gratuitement")}</Link>
        </div>
        <button type="button" className="axm-burger" aria-label={mobile ? t("Fermer le menu") : t("Ouvrir le menu")} aria-expanded={mobile} onClick={() => setMobile((v) => !v)}>
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            {mobile ? <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" /> : <path d="M4 6h12M4 10h12M4 14h12" />}
          </svg>
        </button>
      </div>
      {mobile && (
        <div className="axm-drawer">
          {MENUS.map((m) => (
            <details key={m.id}>
              <summary>{t(m.label)}</summary>
              {m.liens.map((l) => <Link key={l.label} href={l.href}>{t(l.label)}</Link>)}
            </details>
          ))}
          <Link href="/tarifs">{t("Tarifs")}</Link>
          <Link href="/connexion">{t("Se connecter")}</Link>
          <div style={{ marginTop: 24 }}><Link href="/inscription" className="axm-btn axm-btn--primary" style={{ width: "100%", borderBottom: 0 }}>{t("Démarrer gratuitement")}</Link></div>
        </div>
      )}
    </header>
  );
}
