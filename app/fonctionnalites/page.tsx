import type { Metadata } from "next";
import Link from "next/link";
import { AppelFinal, Faq, PageAxm } from "@/components/marketing/site/Blocs";
import { familles, lienSolution, solutions, texte } from "@/lib/catalogue-fonctionnalites";
import { getLangue, getT } from "@/lib/i18n/serveur";
import { AnnuaireModules } from "@/components/marketing/motion/Sections";
import styles from "./[solution]/solution.module.css";

const titre = texte("Les outils de votre commerce", "Tools for your commerce");
const description = texte(
  "De la première vitrine au dernier colis, découvrez comment vendre sur WhatsApp, encaisser au comptoir et suivre votre activité avec AXSO.",
  "From your first storefront to your latest delivery, explore how to sell on WhatsApp, take payment at the counter and track your business with AXSO.",
);

export async function generateMetadata(): Promise<Metadata> {
  const l = await getLangue();
  return { title: titre[l], description: description[l], alternates: { canonical: "/fonctionnalites" },
    openGraph: { title: titre[l], description: description[l], images: ["/visuels/plateforme.webp"] } };
}

export default async function FonctionnalitesPage() {
  const [l, t] = await Promise.all([getLangue(), getT()]);
  return <PageAxm>
    <section className={`axm-wrap ${styles.hero}`}>
      <div>
        <p className={styles.kicker}>{texte("Fonctionnalités", "Features")[l]}</p>
        <h1>{titre[l]}</h1>
        <p className="axm-lead">{description[l]}</p>
        <div className={styles.actions}>
          <Link href="/inscription" className="axm-btn axm-btn--primary">{texte("Démarrer gratuitement", "Start for free")[l]}</Link>
          <Link href="/tarifs" className="axm-link">{texte("Voir les forfaits", "View plans")[l]}</Link>
        </div>
      </div>
      <img className={styles.heroImage} src="/visuels/plateforme.webp" alt={texte("Vue aérienne d’un atelier de création", "Aerial view of a design workshop")[l]} fetchPriority="high" />
    </section>
    <div className="axm-wrap">
      <nav className={styles.jumpLinks} aria-label={texte("Familles de produits", "Product families")[l]}>
        {familles.map(f => <a key={f.id} href={`#${f.id}`}>{f.nom[l]}</a>)}
      </nav>
      {familles.map(f => <section className={styles.family} id={f.id} key={f.id}>
        <div>
          <h2>{f.nom[l]}</h2>
          {f.id === "construire" && <Link href="/themes" className="axm-link">{texte("Découvrir les thèmes", "Explore themes")[l]}</Link>}
          {f.id === "livrer" && <Link href="/suivi" className="axm-link">{texte("Suivre un colis", "Track a parcel")[l]}</Link>}
          {f.id === "encaisser" && <Link href="/legal/politique-prix" className="axm-link">{texte("Politique de prix", "Pricing policy")[l]}</Link>}
          {f.id === "developper" && <Link href="/affiliation" className="axm-link">{texte("Programme d’affiliation", "Affiliate program")[l]}</Link>}
        </div>
        <ul className={styles.directory}>
          {solutions.filter(s => s.famille === f.id).map(s => <li key={s.slug} id={s.slug === "stock" ? "gerer" : undefined}>
            <Link href={lienSolution(s.slug)}>
              <img loading="lazy" src={`/visuels/annuaire-${s.slug}.webp`} alt="" />
              <div><h3>{s.nom[l]}</h3><p>{s.description[l]}</p></div>
            </Link>
          </li>)}
        </ul>
      </section>)}
      </div>
      <AnnuaireModules t={t} langue={l} />
      <div className="axm-wrap">
      <section className={styles.faq}>
        <Faq titre={texte("Questions fréquentes", "Frequently asked questions")[l]} items={[
          { q: texte("Faut-il des compétences techniques ?", "Do I need technical skills?")[l], r: texte("Vous pouvez choisir un thème et modifier vos pages depuis le constructeur visuel.", "Choose a theme and edit your pages in the visual builder.")[l] },
          { q: texte("Puis-je vendre en ligne et en magasin ?", "Can I sell online and in store?")[l], r: texte("Oui. La caisse et la boutique en ligne partagent le même stock.", "Yes. The register and online store share inventory.")[l] },
          { q: texte("AXSO prend-il une commission ?", "Does AXSO charge a commission?")[l], r: <>{texte("AXSO ne prélève aucune commission sur les ventes payées à la livraison.", "AXSO charges no commission on sales paid on delivery.")[l]} <Link href="/legal/politique-prix" className="axm-link">{texte("Lire la politique de prix", "Read the pricing policy")[l]}</Link></> },
          { q: texte("Puis-je commencer gratuitement ?", "Can I start for free?")[l], r: texte("Le forfait de départ est gratuit et aucune carte bancaire n’est demandée.", "The starter plan is free and requires no bank card.")[l] },
        ]} />
      </section>
    </div>
    <AppelFinal titre={texte("Créez votre boutique", "Create your store")[l]}
      principal={{ label: texte("Démarrer gratuitement", "Start for free")[l], href: "/inscription" }}
      secondaire={{ label: texte("Voir les forfaits", "View plans")[l], href: "/tarifs" }} />
  </PageAxm>;
}
