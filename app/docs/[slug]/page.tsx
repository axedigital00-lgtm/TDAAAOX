import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppelFinal, PageAxm } from "@/components/marketing/site/Blocs";
import { Scene } from "@/components/marketing/motion/Scenes";
import { GUIDES, RUBRIQUES } from "@/lib/contenu-site";
import { getT } from "@/lib/i18n/serveur";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return GUIDES.map((g) => ({ slug: g.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const g = GUIDES.find((x) => x.slug === slug);
  return g ? { title: `${g.titre} · Documentation`, description: g.resume } : {};
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) notFound();
  const t = await getT();
  const i = GUIDES.indexOf(g), suivant = GUIDES[i + 1];
  return <PageAxm>
    <div className="axm-wrap axx-doc">
      <aside aria-label={t("Sommaire de la documentation")}>
        <Link href="/docs">{t("Toute la documentation")}</Link>
        {RUBRIQUES.map((r) => <div key={r} style={{ display: "contents" }}><b>{t(r)}</b>
          {GUIDES.filter((x) => x.rubrique === r).map((x) => <Link key={x.slug} href={`/docs/${x.slug}`} aria-current={x.slug === g.slug ? "page" : undefined}>{t(x.titre)}</Link>)}</div>)}
      </aside>
      <article>
        <p className="axm-eyebrow">{t(g.rubrique)} · {g.duree} min</p>
        <h1>{t(g.titre)}</h1>
        <p>{t(g.resume)}</p>
        <div style={{ marginTop: 32 }}><Scene type={g.scene} t={t} photo={`/visuels/guide-${g.slug}.webp`} /></div>
        {g.blocs.map((b) => <section key={b.h}><h2>{t(b.h)}</h2>
          {b.p && <p>{t(b.p)}</p>}
          {b.etapes && <ol>{b.etapes.map((e) => <li key={e}>{t(e)}</li>)}</ol>}
          {b.points && <ul className="axx-liste">{b.points.map((e) => <li key={e}>{t(e)}</li>)}</ul>}
        </section>)}
        {g.note && <aside className="axx-note">{t(g.note)}</aside>}
        {suivant && <p style={{ marginTop: 44 }}><Link className="axm-link" href={`/docs/${suivant.slug}`}>{t("Guide suivant")} : {t(suivant.titre)} →</Link></p>}
      </article>
    </div>
    <AppelFinal titre={t("Prêt à essayer ?")} principal={{ label: t("Démarrer gratuitement"), href: "/inscription" }} secondaire={{ label: t("Nous contacter"), href: "/contact" }} />
  </PageAxm>;
}
