// Espace presse : présentation, faits vérifiables, identité et contact.
import type { Metadata } from "next";
import { AppelFinal, HeroPage, PageAxm, Section } from "@/components/marketing/site/Blocs";
import { DOSSIERS } from "@/lib/dossiers-fonctionnalites";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = { title: "Presse", description: "Kit média AXSO : présentation, faits clés, logos, couleurs et contact presse." };

const logo: React.CSSProperties = { display: "grid", placeItems: "center", minHeight: 150, borderRadius: 16 };

export default async function PressPage() {
  const t = await getT();
  const faits = [
    [String(DOSSIERS.length), t("modules réunis dans une seule plateforme")], ["0 %", t("de commission AXSO sur les ventes payées à la livraison")],
    ["15", t("devises d'affichage prises en charge")], ["1", t("stock commun au site, à WhatsApp et au magasin")],
  ];
  return <PageAxm>
    <HeroPage image={{ src: "/visuels/hero-press.webp", alt: "" }} surtitre={t("Espace presse")} titre={t("AXSO, en quelques mots.")} lead={t("Tout ce qu'il faut pour parler de nous avec justesse : présentation, faits, logos et contact direct.")} principal={{ label: t("Contacter la presse"), href: "mailto:presse@axsoafrica.com" }} />
    <Section serre titre={t("Présentation")}>
      <p className="axm-lead" style={{ maxWidth: 860, color: "#fff", fontSize: "clamp(20px, 2.2vw, 28px)", lineHeight: 1.4 }}>{t("AXSO est une plateforme de commerce conçue pour l'Afrique. Elle réunit boutique en ligne, vente sur WhatsApp, caisse en magasin, paiement à la livraison, logistique, produits numériques et assistante IA, pour permettre à chaque commerçant de vendre partout depuis un seul outil.")}</p>
    </Section>
    <Section serre titre={t("Faits clés")}><div className="axm-grid axm-g2">{faits.map(([v, d]) => <div key={d} className="axm-card"><div className="axm-stat">{v}</div><p className="axm-muted" style={{ marginTop: 10, fontSize: 18 }}>{d}</p></div>)}</div></Section>
    <Section serre titre={t("Logos")}>
      <div className="axm-grid axm-g3">
        <a href="/logo-dark.png" download style={{ ...logo, background: "#111", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.14)" }}><img src="/logo-dark.png" alt={t("Logo AXSO sur fond sombre")} style={{ height: 40 }} /></a>
        <a href="/logo.png" download style={{ ...logo, background: "#fff" }}><img src="/logo.png" alt={t("Logo AXSO sur fond clair")} style={{ height: 40 }} /></a>
        <a href="/brand/axia-mark.png" download style={{ ...logo, background: "#fff" }}><img src="/brand/axia-mark.png" alt={t("Emblème de Stella")} style={{ height: 64 }} /></a>
      </div>
      <p className="axm-muted" style={{ marginTop: 14 }}>{t("Cliquez sur un logo pour le télécharger. Merci de ne pas le déformer ni changer ses couleurs.")}</p>
    </Section>
    <Section serre titre={t("Couleurs")}><div className="axm-grid axm-g3">{[["#EBA900", "Jaune AXSO", "#111"], ["#000000", "Noir", "#fff"], ["#FFFFFF", "Blanc", "#111"]].map(([c, n, x]) => <div key={c} style={{ background: c, color: x, borderRadius: 16, padding: 22, minHeight: 130, display: "flex", flexDirection: "column", justifyContent: "flex-end", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.14)" }}><b>{t(n)}</b><span>{c}</span></div>)}</div></Section>
    <AppelFinal titre={t("Une interview, une citation, une information ?")} lead="presse@axsoafrica.com" principal={{ label: t("Écrire à la presse"), href: "mailto:presse@axsoafrica.com" }} />
  </PageAxm>;
}
