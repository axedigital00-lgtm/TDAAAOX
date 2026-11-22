// Sections réutilisées par les sous-pages : annuaire des modules, récits en deux colonnes.
import Link from "next/link";
import { familles } from "@/lib/catalogue-fonctionnalites";
import { DOSSIERS } from "@/lib/dossiers-fonctionnalites";
import { Scene, type TypeScene } from "./Scenes";

type T = (s: string) => string;

export function AnnuaireModules({ t, langue, titre }: { t: T; langue: "fr" | "en"; titre?: string }) {
  const total = DOSSIERS.reduce((n, d) => n + d.chapitres.reduce((m, c) => m + c.details.length, 0), 0);
  return <section className="axm-section" id="tous-les-modules"><div className="axm-wrap">
    <p className="axm-eyebrow">{t("{0} modules · {1} capacités détaillées").replace("{0}", String(DOSSIERS.length)).replace("{1}", String(total))}</p>
    <h2 className="axm-h2">{titre ?? t("Tout ce qu'AXSO sait faire.")}</h2>
    <nav className="axx-familles" aria-label={t("Familles de modules")}>{familles.map((f) => <a key={f.id} href={`#m-${f.id}`}>{f.nom[langue]}</a>)}</nav>
    {familles.map((f) => {
      const liste = DOSSIERS.filter((d) => d.famille === f.id);
      return <div key={f.id} id={`m-${f.id}`} style={{ marginTop: 56, scrollMarginTop: 90 }}>
        <h3 className="axm-h3" style={{ marginBottom: 20 }}>{f.nom[langue]}</h3>
        <div className="axx-index">{liste.map((d) => <Link key={d.slug} href={`/fonctionnalites/${d.slug}`} className="axx-lien"><b>{t(d.nom)}</b><span>{t(d.promesse)}</span><em>{d.chapitres.reduce((n, c) => n + c.details.length, 0)} {t("capacités")} →</em></Link>)}</div>
      </div>;
    })}
  </div></section>;
}

export type Recit = { photo: string; titre: string; texte: string; scene: TypeScene; points: string[]; lien?: [string, string] };

export function Recits({ t, items }: { t: T; items: Recit[] }) {
  return <section className="axm-section"><div className="axm-wrap">
    {items.map((r, i) => <div key={r.titre} className={`axx-duo${i % 2 ? " axx-duo--inverse" : ""}`}>
      <div>
        <h2 className="axm-h2" style={{ fontSize: "clamp(30px, 4vw, 54px)" }}>{t(r.titre)}</h2>
        <p className="axm-lead" style={{ marginTop: 16 }}>{t(r.texte)}</p>
        <ul className="axx-liste">{r.points.map((p) => <li key={p}>{t(p)}</li>)}</ul>
        {r.lien && <p style={{ marginTop: 20 }}><Link className="axm-link" href={r.lien[1]}>{t(r.lien[0])} →</Link></p>}
      </div>
      <Scene type={r.scene} t={t} photo={r.photo} />
    </div>)}
  </div></section>;
}

export function Etapes({ t, titre, items }: { t: T; titre: string; items: [string, string][] }) {
  return <section className="axm-section" style={{ paddingTop: 0 }}><div className="axm-wrap">
    <h2 className="axm-h2" style={{ marginBottom: 36 }}>{t(titre)}</h2>
    <ol className="axx-etapes">{items.map(([a, b]) => <li key={a}><h3>{t(a)}</h3><p>{t(b)}</p></li>)}</ol>
  </div></section>;
}
