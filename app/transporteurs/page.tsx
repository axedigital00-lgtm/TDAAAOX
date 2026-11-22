// Annuaire public des transporteurs : données de performance réelles, aucun document ni contact personnel.
import { seoPage } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { AppelFinal, HeroPage, PageAxm, Section } from "@/components/marketing/site/Blocs";
import { BADGES, NIVEAUX, VEHICULES } from "@/lib/logistique/libelles";
import { annuaire } from "@/lib/logistique/vues";
import { getT } from "@/lib/i18n/serveur";

export const dynamic = "force-dynamic";
export const metadata: Metadata = seoPage("/transporteurs");

export default async function TransporteursPage({ searchParams }: { searchParams: Promise<{ ville?: string }> }) {
  const t = await getT();
  const ville = (await searchParams).ville?.trim().slice(0, 80) || null;
  const liste = await annuaire(ville).catch(() => []);
  return <PageAxm>
    <HeroPage surtitre={t("Réseau logistique")} titre={t("Des transporteurs vérifiés, choisis sur leurs résultats.")} lead={t("Chaque transporteur est évalué sur ses livraisons réelles. La vérification légale et la performance sont affichées séparément.")} principal={{ label: t("Rejoindre le réseau"), href: "/inscription/livreur" }} secondaire={{ label: t("Je suis marchand"), href: "/inscription" }} />
    <Section serre>
      <form style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        <input name="ville" defaultValue={ville ?? ""} aria-label={t("Ville")} placeholder={t("Rechercher une ville")} style={{ flex: "1 1 220px", height: 52, borderRadius: 999, border: "1px solid var(--m-line)", background: "#111", color: "#fff", padding: "0 22px", fontSize: 16 }} />
        <button className="axm-btn axm-btn--secondary">{t("Rechercher")}</button>
      </form>
      {liste.length === 0 ? <div className="axm-card"><h2 className="axm-h4">{t("Le réseau s'ouvre.")}</h2><p className="axm-muted" style={{ marginTop: 8 }}>{t("Aucun transporteur n'est encore listé ici. Soyez parmi les premiers à rejoindre AXSO.")}</p></div> : <div className="axx-index">
        {liste.map((f) => <article key={f.id} className="axx-lien" style={{ minHeight: 230 }}>
          <small>{t(f.type === "societe" ? "Société de livraison" : "Livreur indépendant")}{f.verifie ? ` · ${t("Vérifié")}` : ""}</small>
          <b>{f.nom}</b>
          {f.description && <span>{f.description}</span>}
          <span>{f.probation ? t("Nouveau sur le réseau") : `${f.niveau ? NIVEAUX[f.niveau] : ""} · ${f.global}/100 · ${f.volume} ${t("livraisons")}`}</span>
          <span>{f.zones.slice(0, 4).join(", ")}</span>
          <span>{f.vehicules.map((v) => t(VEHICULES[v] ?? v)).join(", ")}</span>
          {f.badges.length > 0 && <span style={{ color: "#EDA900" }}>{f.badges.slice(0, 3).map((b) => t(BADGES[b])).join(" · ")}</span>}
          <em>{t(f.disponible ? "Disponible" : "Indisponible")}</em>
        </article>)}
      </div>}
    </Section>
    <AppelFinal titre={t("Vous livrez ? Recevez des courses.")} lead={t("Inscrivez votre société ou votre activité de livreur, faites vérifier vos documents, puis recevez des courses dans vos zones.")} principal={{ label: t("Rejoindre le réseau"), href: "/inscription/livreur" }} secondaire={{ label: t("Découvrir la livraison"), href: "/fonctionnalites/livraison" }} />
  </PageAxm>;
}
