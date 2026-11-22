import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppelFinal, PageAxm } from "@/components/marketing/site/Blocs";
import { ARTICLES } from "@/lib/contenu-site";
import { getT } from "@/lib/i18n/serveur";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return ARTICLES.map((a) => ({ slug: a.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = ARTICLES.find((x) => x.slug === slug);
  return a ? { title: `${a.titre} · Blog AXSO`, description: a.chapo, openGraph: { title: a.titre, description: a.chapo, images: [{ url: a.image }] } } : {};
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = ARTICLES.find((x) => x.slug === slug);
  if (!a) notFound();
  const t = await getT();
  const autres = ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 3);
  return <PageAxm>
    <header className="axm-section axm-wrap" style={{ paddingBottom: 40 }}>
      <p className="axm-eyebrow"><Link href="/blog">{t("Blog")}</Link> · {t(a.tag)} · {a.duree} min</p>
      <h1 className="axm-display" style={{ fontSize: "clamp(38px, 6vw, 80px)", maxWidth: 1040 }}>{t(a.titre)}</h1>
      <p className="axm-lead" style={{ marginTop: 24 }}>{t(a.chapo)}</p>
      <img src={a.image} alt="" className="axm-img axm-hero__image" fetchPriority="high" style={{ width: "100%", maxHeight: 560, objectFit: "cover", marginTop: 44, borderRadius: 24 }} />
    </header>
    <div className="axm-wrap"><div className="axx-doc" style={{ display: "block", maxWidth: 720, margin: "0 auto", paddingTop: 16 }}><article>
      {a.blocs.map((b) => <section key={b.h}><h2>{t(b.h)}</h2>
        {b.p && <p style={{ color: "rgba(255,255,255,.78)", fontSize: 18, lineHeight: 1.7 }}>{t(b.p)}</p>}
        {b.points && <ul className="axx-liste">{b.points.map((e) => <li key={e}>{t(e)}</li>)}</ul>}
      </section>)}
    </article></div></div>
    <section className="axm-section axm-wrap" style={{ paddingTop: 24 }}>
      <h2 className="axm-h3" style={{ marginBottom: 24 }}>{t("À lire ensuite")}</h2>
      <div className="axx-index">{autres.map((x) => <Link key={x.slug} className="axx-lien" href={`/blog/${x.slug}`}><small>{t(x.tag)}</small><b>{t(x.titre)}</b><em>{x.duree} min</em></Link>)}</div>
    </section>
    <AppelFinal titre={t("Passez de la théorie à vos premières ventes")} principal={{ label: t("Démarrer gratuitement"), href: "/inscription" }} secondaire={{ label: t("Outils gratuits"), href: "/outils" }} />
  </PageAxm>;
}
