// Blog : conseils pratiques pour vendre en ligne en Afrique.
import type { Metadata } from "next";
import Link from "next/link";
import { AppelFinal, HeroPage, PageAxm, Section } from "@/components/marketing/site/Blocs";
import { ARTICLES } from "@/lib/contenu-site";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = { title: "Blog", description: "Le blog AXSO : stratégie, paiement, livraison, IA et WhatsApp pour les entrepreneurs africains." };

export default async function BlogPage() {
  const t = await getT();
  const [une, ...autres] = ARTICLES;
  return <PageAxm>
    <HeroPage surtitre={t("Blog AXSO")} titre={t("Vendre mieux, ici et maintenant.")} lead={t("Des méthodes concrètes pour lancer, livrer et faire grandir votre commerce en Afrique.")} />
    <Section serre>
      <Link href={`/blog/${une.slug}`} className="axm-edition" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 32, alignItems: "center", color: "inherit", textDecoration: "none" }}>
        <img src={`/visuels/index-${une.slug}.webp`} alt="" className="axm-img" style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover", borderRadius: 22 }} />
        <div><p className="axm-eyebrow">{t("À la une")} · {t(une.tag)} · {une.duree} min</p><h2 className="axm-h2" style={{ fontSize: "clamp(30px, 4vw, 52px)" }}>{t(une.titre)}</h2><p className="axm-lead" style={{ marginTop: 16 }}>{t(une.chapo)}</p></div>
      </Link>
      <div className="axx-index" style={{ marginTop: 56 }}>
        {autres.map((a) => <Link key={a.slug} href={`/blog/${a.slug}`} className="axx-lien" style={{ padding: 0, overflow: "hidden" }}>
          <img src={`/visuels/index-${a.slug}.webp`} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover" }} />
          <div style={{ display: "grid", gap: 8, padding: "16px 20px 20px" }}><small>{t(a.tag)}</small><b>{t(a.titre)}</b><span>{t(a.chapo)}</span><em>{a.duree} min</em></div>
        </Link>)}
      </div>
    </Section>
    <AppelFinal titre={t("Mettez ces conseils en pratique")} principal={{ label: t("Démarrer gratuitement"), href: "/inscription" }} secondaire={{ label: t("Outils gratuits"), href: "/outils" }} />
  </PageAxm>;
}
