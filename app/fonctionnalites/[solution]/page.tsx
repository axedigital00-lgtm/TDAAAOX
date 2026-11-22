import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageAxm } from "@/components/marketing/site/Blocs";
import { exemples, familles, lienSolution, solutions, texte } from "@/lib/catalogue-fonctionnalites";
import { getLangue } from "@/lib/i18n/serveur";
import styles from "./solution.module.css";

type Props = { params: Promise<{ solution: string }> };

async function fiche({ params }: Props) {
  const { solution } = await params;
  return solutions.find(item => item.slug === solution) ?? notFound();
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [s, langue] = await Promise.all([fiche(props), getLangue()]);
  const title = s.nom[langue];
  const description = s.description[langue];
  return { title, description, alternates: { canonical: lienSolution(s.slug) },
    openGraph: { title, description, url: lienSolution(s.slug), images: [{ url: s.image, alt: s.alt[langue] }] } };
}

export default async function SolutionPage(props: Props) {
  const [s, langue] = await Promise.all([fiche(props), getLangue()]);
  const famille = familles.find(f => f.id === s.famille)!;
  const exemple = exemples[s.slug];
  return <PageAxm>
    <section className={`axm-wrap ${styles.hero}`}>
      <div>
        <nav className={styles.breadcrumb} aria-label={texte("Fil d’Ariane", "Breadcrumb")[langue]}>
          <Link href="/fonctionnalites">{texte("Fonctionnalités", "Features")[langue]}</Link>
          <span aria-hidden>/</span><span aria-current="page">{s.nom[langue]}</span>
        </nav>
        <h1>{s.titre[langue]}</h1>
        <p className="axm-lead">{s.description[langue]}</p>
        <div className={styles.actions}>
          <Link href="/inscription" className="axm-btn axm-btn--primary">{texte("Créer ma boutique", "Create my store")[langue]}</Link>
          <a className="axm-link" href="#exemple">{texte("Essayer l’exemple", "Try the example")[langue]}</a>
        </div>
      </div>
      <img className={styles.heroImage} src={s.image} alt={s.alt[langue]} fetchPriority="high" />
    </section>

    <section id="exemple" className={styles.exampleBand} aria-labelledby="exemple-titre">
      <div className={`axm-wrap ${styles.exampleLayout}`}>
        <div>
          {s.slug === "stella" && <img src="/brand/axia-mark.png" alt="" width="48" height="48" />}
          <p className={styles.kicker}>{texte("Exemple interactif", "Interactive example")[langue]}</p>
          <h2 id="exemple-titre">{exemple.question[langue]}</h2>
        </div>
        <fieldset className={styles.example}>
          <legend className={styles.srOnly}>{exemple.question[langue]}</legend>
          <div className={styles.options}>
            {exemple.options.map((option, i) => <div key={option.choix.fr} className={styles.option}>
              <label>
                <input type="radio" name="scenario" defaultChecked={i === 0}
                  aria-controls={`resultat-${i}`} aria-describedby={`resultat-${i}`} />
                <span>{option.choix[langue]}</span>
              </label>
              <div id={`resultat-${i}`} className={styles.result}>
                {option.image && <img src={option.image} loading="lazy" alt={option.resultat[langue]} />}
                <strong>{option.resultat[langue]}</strong>
                <p>{option.detail[langue]}</p>
              </div>
            </div>)}
          </div>
        </fieldset>
      </div>
    </section>
    <div className={`axm-wrap ${styles.nextLinks}`}>
      <Link className="axm-link" href={`/fonctionnalites#${famille.id}`}>{famille.nom[langue]}</Link>
      <Link className="axm-link" href="/tarifs">{texte("Voir les forfaits", "View plans")[langue]}</Link>
    </div>
  </PageAxm>;
}
