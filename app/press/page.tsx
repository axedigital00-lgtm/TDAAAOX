// Espace presse : contact et logos à télécharger.
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";
import { PageAxm, HeroPage, Section } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = {
  title: "Presse",
  description: "Contact presse AXSO : demandes d'interviews et informations sur la plateforme.",
};

export default async function PressPage() {
  const t = await getT();
  return (
    <PageAxm>
      <HeroPage surtitre={t("Espace presse")} titre={t("Ressources pour les médias")}
        lead={t("Une demande d'interview, de logo ou d'information ? Écrivez-nous, nous vous répondrons directement.")} />
      <Section serre>
        <div className="axm-grid axm-g2">
          <div className="axm-card" style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 240 }}>
            <h2 className="axm-h4" style={{ fontSize: 24 }}>{t("Contact presse")}</h2>
            <p className="axm-muted" style={{ lineHeight: 1.55 }}>{t("Demandes d'interviews, citations officielles et informations complémentaires.")}</p>
            <a href="mailto:presse@axsoafrica.com" className="axm-link" style={{ marginTop: "auto" }}>presse@axsoafrica.com →</a>
          </div>
          <div className="axm-card" style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 240 }}>
            <h2 className="axm-h4" style={{ fontSize: 24 }}>{t("Logos")}</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <a href="/logo-dark.png" download style={{ background: "#000", borderRadius: 14, padding: "18px 22px", boxShadow: "inset 0 0 0 1px var(--m-line)" }}><img src="/logo-dark.png" alt="AXSO" style={{ height: 30, display: "block" }} /></a>
              <a href="/logo.png" download style={{ background: "#fff", borderRadius: 14, padding: "18px 22px" }}><img src="/logo.png" alt="AXSO" style={{ height: 30, display: "block" }} /></a>
              <a href="/brand/axia-mark.png" download style={{ background: "#fff", borderRadius: 14, padding: 12 }}><img src="/brand/axia-mark.png" alt="Stella" style={{ height: 42, display: "block" }} /></a>
            </div>
            <p className="axm-muted" style={{ fontSize: 14, marginTop: "auto" }}>{t("Cliquez sur un logo pour le télécharger.")}</p>
          </div>
        </div>
      </Section>
    </PageAxm>
  );
}
