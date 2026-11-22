import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageAxm } from "@/components/marketing/site/Blocs";
import { exemples, familles, lienSolution, solutions, texte } from "@/lib/catalogue-fonctionnalites";
import { getLangue, getT } from "@/lib/i18n/serveur";
import { Scene } from "@/components/marketing/motion/Scenes";
import { DETAILS } from "@/lib/contenu-site";
import { dossierDe, DOSSIERS } from "@/lib/dossiers-fonctionnalites";
import { ChapitresDossier, HeroDossier } from "@/components/marketing/motion/DossierFonction";
import { AppelFinal } from "@/components/marketing/site/Blocs";
import styles from "./solution.module.css";

type Props = { params: Promise<{ solution: string }> };

export function generateStaticParams() { return DOSSIERS.map((d) => ({ solution: d.slug })); }

async function fiche({ params }: Props) {
  const { solution } = await params;
  return solutions.find(item => item.slug === solution) ?? null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [s, langue] = await Promise.all([fiche(props), getLangue()]);
  if (!s) {
    const d = dossierDe((await props.params).solution);
    if (!d) return {};
    return { title: d.nom, description: d.promesse, alternates: { canonical: `/fonctionnalites/${d.slug}` }, openGraph: { title: d.titre, description: d.promesse, url: `/fonctionnalites/${d.slug}`, images: [{ url: d.image }] } };
  }
  const title = s.nom[langue];
  const description = s.description[langue];
  return { title, description, alternates: { canonical: lienSolution(s.slug) },
    openGraph: { title, description, url: lienSolution(s.slug), images: [{ url: s.image, alt: s.alt[langue] }] } };
}

export default async function SolutionPage(props: Props) {
  const [s, langue, t] = await Promise.all([fiche(props), getLangue(), getT()]);
  const dossier = dossierDe((await props.params).solution);
  if (!s) {
    if (!dossier) notFound();
    return <PageAxm>
      <HeroDossier d={dossier} t={t} />
      <ChapitresDossier d={dossier} t={t} />
      <AppelFinal titre={t("Essayez-le sur votre boutique")} lead={t("Créez votre boutique gratuitement, sans carte bancaire.")} principal={{ label: t("Démarrer gratuitement"), href: "/inscription" }} secondaire={{ label: t("Voir les forfaits"), href: "/tarifs" }} />
    </PageAxm>;
  }
  const d = DETAILS[s.slug];
  const voisines = solutions.filter((x) => x.famille === s.famille && x.slug !== s.slug).slice(0, 3);
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

    {d && <section className="axm-section"><div className="axm-wrap">
      <div className="axx-duo">
        <div><h2 className="axm-h2">{t("Ce que vous pouvez faire")}</h2>
          <ul className="axx-liste">{d.atouts.map((a) => <li key={a}>{t(a)}</li>)}</ul>
          {d.guide && <p style={{ marginTop: 24 }}><Link className="axm-link" href={`/docs/${d.guide}`}>{t("Lire le guide")} →</Link></p>}
        </div>
        <Scene type={d.scene} t={t} photo={`/visuels/apercu-${s.slug}.webp`} grande />
      </div>
      <h2 className="axm-h3" style={{ margin: "clamp(64px, 8vw, 112px) 0 24px" }}>{t("Comment ça marche")}</h2>
      <ol className="axx-etapes">{d.etapes.map(([a, b]) => <li key={a}><h3>{t(a)}</h3><p>{t(b)}</p></li>)}</ol>
    </div></section>}

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
    {dossier && <ChapitresDossier d={dossier} t={t} />}
    {!dossier && voisines.length > 0 && <section className="axm-section"><div className="axm-wrap">
      <h2 className="axm-h3" style={{ marginBottom: 24 }}>{t("À découvrir aussi")}</h2>
      <div className="axx-index">{voisines.map((v) => <Link key={v.slug} className="axx-lien" href={lienSolution(v.slug)}><small>{famille.nom[langue]}</small><b>{v.nom[langue]}</b><span>{v.titre[langue]}</span></Link>)}</div>
    </div></section>}
    <AppelFinal titre={t("Essayez-le sur votre boutique")} lead={t("Créez votre boutique gratuitement, sans carte bancaire.")} principal={{ label: t("Démarrer gratuitement"), href: "/inscription" }} secondaire={{ label: t("Voir les forfaits"), href: "/tarifs" }} />
    <div className={`axm-wrap ${styles.nextLinks}`}>
      <Link className="axm-link" href={`/fonctionnalites#${famille.id}`}>{famille.nom[langue]}</Link>
      <Link className="axm-link" href="/tarifs">{texte("Voir les forfaits", "View plans")[langue]}</Link>
    </div>
  </PageAxm>;
}
