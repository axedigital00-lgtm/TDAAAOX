// Témoignages : uniquement les avis réels déposés par les marchands depuis
// leur tableau de bord et validés par AXSO (aucun témoignage inventé).
import { seoPage } from "@/lib/seo";
import Link from "next/link";
import type { Metadata } from "next";
import { avisPublies } from "@/lib/avis-plateforme";
import { getT } from "@/lib/i18n/serveur";
import { PageAxm, HeroPage, Section, AppelFinal } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = seoPage("/temoignages");

function Etoiles({ note }: { note: number }) {
  return (
    <span aria-label={`${note} / 5`} style={{ display: "inline-flex", gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 20 20" aria-hidden><path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z" fill={i < note ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2" /></svg>
      ))}
    </span>
  );
}

export default async function TemoignagesPage() {
  const t = await getT();
  const avis = await avisPublies(30);
  const [vedette, ...autres] = avis;
  return (
    <PageAxm>
      <HeroPage image={{ src: "/visuels/hero-temoignages.webp", alt: "" }}
        surtitre={t("Témoignages")}
        titre={t("Ils vendent avec AXSO")}
        lead={t("Des marchands partagent leur expérience. Chaque avis est déposé depuis leur tableau de bord et vérifié par notre équipe.")}
      />

      {vedette ? (
        <>
          <Section serre>
            <figure className="axm-card" style={{ margin: 0, padding: "clamp(32px, 5vw, 64px)" }}>
              <Etoiles note={vedette.note} />
              <blockquote className="axm-h3" style={{ margin: "24px 0 0", fontWeight: 500, maxWidth: 1000 }}>« {vedette.texte} »</blockquote>
              <figcaption className="axm-muted" style={{ marginTop: 28, fontSize: 16 }}>
                <b style={{ color: "#fff" }}>{vedette.auteurNom}</b>
                {[vedette.auteurRole, vedette.ville].filter(Boolean).map((x) => ` · ${x}`).join("")} · <Link href={`/${vedette.slug}`} className="axm-link">{vedette.boutique}</Link>
              </figcaption>
            </figure>
          </Section>
          {autres.length > 0 && (
            <Section serre titre={t("Avis vérifiés")}>
              <div style={{ columns: "320px 3", columnGap: 16 }}>
                {autres.map((a) => (
                  <figure key={a.id} className="axm-card" style={{ margin: "0 0 16px", breakInside: "avoid", padding: 28 }}>
                    <Etoiles note={a.note} />
                    <blockquote style={{ margin: "14px 0 0", lineHeight: 1.6, fontSize: 16 }}>« {a.texte} »</blockquote>
                    <figcaption className="axm-muted" style={{ marginTop: 16, fontSize: 14 }}>
                      <b style={{ color: "#fff" }}>{a.auteurNom}</b>
                      {[a.auteurRole, a.ville].filter(Boolean).map((x) => ` · ${x}`).join("")} · <Link href={`/${a.slug}`} className="axm-link">{a.boutique}</Link>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Section>
          )}
        </>
      ) : (
        <Section serre>
          <div className="axm-card" style={{ textAlign: "center", padding: "clamp(40px, 6vw, 72px)" }}>
            <h2 className="axm-h3">{t("Les premiers avis arrivent bientôt")}</h2>
            <p className="axm-lead" style={{ margin: "14px auto 0" }}>{t("Vous vendez déjà avec AXSO ? Partagez votre expérience depuis votre tableau de bord.")}</p>
          </div>
        </Section>
      )}

      <AppelFinal
        titre={t("Rejoignez-les aujourd’hui")}
        lead={t("Démarrez gratuitement, sans carte bancaire.")}
        principal={{ label: t("Démarrer gratuitement"), href: "/inscription" }}
        secondaire={{ label: t("Parler à l’équipe"), href: "/contact" }}
      />
    </PageAxm>
  );
}
