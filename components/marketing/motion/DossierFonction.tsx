// Présentation complète d'une fonctionnalité : chapitres avec mini-film, détails, questions.
import Link from "next/link";
import { Faq } from "@/components/marketing/site/Blocs";
import { DOSSIERS, type Dossier } from "@/lib/dossiers-fonctionnalites";
import { Scene } from "./Scenes";

type T = (s: string) => string;

export function HeroDossier({ d, t }: { d: Dossier; t: T }) {
  return <section className="axm-section axx-hero-dossier"><div className="axm-wrap axx-duo">
    <div>
      <p className="axm-eyebrow"><Link href="/fonctionnalites">{t("Fonctionnalités")}</Link> / {t(d.nom)}</p>
      <h1 className="axm-display" style={{ fontSize: "clamp(40px, 6vw, 84px)" }}>{t(d.titre)}</h1>
      <p className="axm-lead" style={{ marginTop: 22 }}>{t(d.promesse)}</p>
      <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
        <Link href="/inscription" className="axm-btn axm-btn--primary">{t("Démarrer gratuitement")}</Link>
        <a href="#details" className="axm-btn axm-btn--secondary">{t("Tout voir en détail")}</a>
      </div>
    </div>
    <Scene type={d.scene} t={t} photo={d.image} grande />
  </div></section>;
}

export function ChapitresDossier({ d, t }: { d: Dossier; t: T }) {
  const total = d.chapitres.reduce((n, c) => n + c.details.length, 0);
  const voisins = DOSSIERS.filter((x) => x.famille === d.famille && x.slug !== d.slug).slice(0, 6);
  return <>
    <section id="details" className="axm-section"><div className="axm-wrap">
      <p className="axm-eyebrow">{t("{0} capacités dans ce module").replace("{0}", String(total))}</p>
      <nav className="axx-sommaire" aria-label={t("Chapitres")}>{d.chapitres.map((c, i) => <a key={c.titre} href={`#chapitre-${i + 1}`}><span>0{i + 1}</span>{t(c.titre)}</a>)}</nav>
      {d.chapitres.map((c, i) => <div key={c.titre} id={`chapitre-${i + 1}`} className={`axx-duo${i % 2 ? " axx-duo--inverse" : ""}`} style={{ scrollMarginTop: 90 }}>
        <div>
          <p className="axx-numero">{t("Chapitre")} 0{i + 1}</p>
          <h2 className="axm-h2" style={{ fontSize: "clamp(30px, 4vw, 54px)" }}>{t(c.titre)}</h2>
          <p className="axm-lead" style={{ marginTop: 16 }}>{t(c.texte)}</p>
          <ul className="axx-liste">{c.details.map((x) => <li key={x}>{t(x)}</li>)}</ul>
        </div>
        <Scene type={c.scene} t={t} photo={c.photo} />
      </div>)}
    </div></section>
    <div className="axm-wrap"><Faq titre={t("Vos questions sur {0}").replace("{0}", t(d.nom))} items={d.faq.map(([q, r]) => ({ q: t(q), r: t(r) }))} /></div>
    {voisins.length > 0 && <section className="axm-section"><div className="axm-wrap">
      <h2 className="axm-h3" style={{ marginBottom: 24 }}>{t("Ça va très bien avec")}</h2>
      <div className="axx-index">{voisins.map((v) => <Link key={v.slug} className="axx-lien" href={`/fonctionnalites/${v.slug}`}><b>{t(v.nom)}</b><span>{t(v.promesse)}</span></Link>)}</div>
    </div></section>}
  </>;
}
