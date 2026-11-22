"use client";

import "@fontsource-variable/inter/wght.css";
import "./site/site.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { familles, lienSolution, solutions, texte } from "@/lib/catalogue-fonctionnalites";
import styles from "@/app/fonctionnalites/[solution]/solution.module.css";

const lien = (href: string, fr: string, en: string) => ({ href, nom: texte(fr, en) });
type Groupe = { nom: ReturnType<typeof texte>; liens: ReturnType<typeof lien>[] };

const menus = [
  {
    id: "pourquoi", nom: texte("Pourquoi AXSO", "Why AXSO"),
    groupes: [{
      nom: texte("Découvrir AXSO", "Discover AXSO"),
      liens: [
        lien("/inscription", "Lancer sa boutique", "Launch a store"),
        lien("/migration", "Migrer vers AXSO", "Switch to AXSO"),
        lien("/fonctionnalites", "Fonctionnalités", "Features"),
        lien("/temoignages", "Témoignages", "Merchant stories"),
        lien("/about", "À propos", "About AXSO"),
        lien("/#axia", "Stella sur la page d’accueil", "Stella on the homepage"),
      ],
    }],
  },
  {
    id: "produits", nom: texte("Produits", "Products"),
    groupes: familles.map(famille => {
      const liens = solutions.filter(s => s.famille === famille.id).map(s => ({ href: lienSolution(s.slug), nom: s.nom }));
      if (famille.id === "construire") liens.push(lien("/themes", "Galerie de thèmes", "Theme gallery"));
      if (famille.id === "developper") liens.push(lien("/affiliation", "Affiliation", "Affiliate program"));
      return { nom: famille.nom, liens };
    }),
  },
  {
    id: "ressources", nom: texte("Ressources", "Resources"),
    groupes: [{
      nom: texte("Apprendre et échanger", "Learn and connect"),
      liens: [
        lien("/docs", "Documentation", "Documentation"),
        lien("/blog", "Blog", "Blog"),
        lien("/tutorials", "Tutoriels vidéo", "Video tutorials"),
        lien("/community", "Communauté", "Community"),
        lien("/suivi", "Suivre un colis", "Track a parcel"),
      ],
    }],
  },
] satisfies { id: string; nom: ReturnType<typeof texte>; groupes: Groupe[] }[];

export function NavbarMarketing() {
  const { langue } = useT();
  const pathname = usePathname();
  const id = useId();
  const header = useRef<HTMLElement>(null);
  const burger = useRef<HTMLButtonElement>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);

  function fermer() {
    setMobile(false);
    setOuvert(null);
  }

  useEffect(fermer, [pathname]);
  useEffect(() => {
    const breakpoint = matchMedia("(max-width: 1199px)");
    breakpoint.addEventListener("change", fermer);
    return () => breakpoint.removeEventListener("change", fermer);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = avant; };
  }, [mobile]);
  useEffect(() => {
    if (!ouvert && !mobile) return;
    function dehors(e: PointerEvent) {
      if (!header.current?.contains(e.target as Node)) fermer();
    }
    function echap(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (ouvert) {
        document.getElementById(`${id}-btn-${ouvert}`)?.focus();
        setOuvert(null);
      } else {
        burger.current?.focus();
        fermer();
      }
    }
    document.addEventListener("pointerdown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("pointerdown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert, mobile, id]);

  const navLien = (item: ReturnType<typeof lien>, classe?: string) => (
    <Link key={item.href} href={item.href} className={classe} onClick={fermer}
      aria-current={pathname === item.href ? "page" : undefined}>{item.nom[langue]}</Link>
  );
  const compte = <>
    {navLien(lien("/connexion", "Se connecter", "Log in"), "axm-nav__btn")}
    {navLien(lien("/inscription", "Démarrer gratuitement", "Start for free"), "axm-btn axm-btn--primary axm-btn--sm")}
  </>;

  return <div className={styles.navSpace}>
    <header ref={header} className={`axm axm-nav ${styles.header}`}
      onBlur={e => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) fermer(); }}>
      <div className="axm-wrap axm-nav__in">
        <Link href="/" onClick={fermer} className="axm-nav__logo" aria-label="AXSO"><img src="/logo-dark.png" alt="AXSO" /></Link>
        <button type="button" ref={burger} className="axm-burger" aria-expanded={mobile} aria-controls={id}
          aria-label={(mobile ? texte("Fermer le menu", "Close menu") : texte("Ouvrir le menu", "Open menu"))[langue]}
          onClick={() => { setOuvert(null); setMobile(!mobile); }}>
          {mobile ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
        <nav id={id} aria-label={texte("Navigation principale", "Main navigation")[langue]}
          className={styles.navigation} data-open={mobile}>
          {menus.map(menu => <div key={menu.id} className={styles.menuItem}
            onBlur={e => {
              if (!mobile && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOuvert(null);
            }}>
            <button type="button" className="axm-nav__btn" id={`${id}-btn-${menu.id}`}
              aria-expanded={ouvert === menu.id} aria-controls={`${id}-panel-${menu.id}`}
              onClick={() => setOuvert(ouvert === menu.id ? null : menu.id)}>
              {menu.nom[langue]}<ChevronDown size={15} aria-hidden />
            </button>
            <div id={`${id}-panel-${menu.id}`} hidden={ouvert !== menu.id} className={styles.panel}>
              <div className={`axm-wrap ${styles.menuGrid}`}>
                {menu.groupes.map(g => <div className={styles.linkGroup} key={g.nom.fr}>
                  <p>{g.nom[langue]}</p>
                  <ul>{g.liens.map(item => <li key={item.href}>{navLien(item)}</li>)}</ul>
                </div>)}
                {menu.id === "produits" && <div className={styles.allFeatures}>
                  {navLien(lien("/fonctionnalites", "Toutes les fonctionnalités", "Explore all features"))}
                </div>}
              </div>
            </div>
          </div>)}
          {navLien(lien("/tarifs", "Tarifs", "Pricing"), "axm-nav__btn")}
          {navLien(lien("/entreprises", "Entreprises", "Enterprise"), "axm-nav__btn")}
          {navLien(lien("/nouveautes", "Nouveautés", "What’s new"), "axm-nav__btn")}
          <div className={styles.mobileAccount}>{compte}</div>
        </nav>
        <div className={styles.desktopAccount}>{compte}</div>
      </div>
    </header>
  </div>;
}
