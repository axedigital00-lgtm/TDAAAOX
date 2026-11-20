// Carrières : candidature spontanée (aucun poste ouvert).
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";
import { PageAxm, HeroPage, Section } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = {
  title: "Carrières",
  description: "Rejoignez l'équipe AXSO et construisez l'avenir du commerce africain.",
};

export default async function JobsPage() {
  const t = await getT();
  return (
    <PageAxm>
      <HeroPage surtitre={t("Carrières")} titre={t("Construisons ensemble le commerce africain de demain")}
        lead={t("Envie de construire AXSO avec nous ? Envoyez-nous votre candidature spontanée.")} />
      <Section serre>
        <div className="axm-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap", padding: "clamp(28px, 4vw, 48px)" }}>
          <div>
            <h2 className="axm-h3">{t("Aucun poste ouvert pour le moment.")}</h2>
            <p className="axm-lead" style={{ marginTop: 10 }}>{t("Candidature spontanée")} : jobs@axsoafrica.com</p>
          </div>
          <a href="mailto:jobs@axsoafrica.com" className="axm-btn axm-btn--primary">{t("Envoyer ma candidature")}</a>
        </div>
      </Section>
    </PageAxm>
  );
}
