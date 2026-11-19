"use client";
// Paramètres › Langues (§9.2-17) : langue de l'admin (cookie « langue », comme le sélecteur de l'en-tête).
import { useT } from "@/components/I18nProvider";
import { choisirLangue } from "@/components/ui/LangueSelecteur";
import { Card, Radio } from "@/components/ui/adm";
import { SectionParametres, SousSection } from "../ui";

export default function LanguesPage() {
  const t = useT();
  return (
    <SectionParametres titre={t("Langues")}>
      <SousSection titre={t("Langue de l'administration")} description={t("La langue de votre espace marchand, sur cet appareil.")}>
        <Card>
          <div role="radiogroup" aria-label={t("Langue de l'administration")} className="flex flex-col gap-3">
            <Radio name="langue" label="Français" checked={t.langue === "fr"} onChange={() => choisirLangue("fr")} />
            <Radio name="langue" label="English" checked={t.langue === "en"} onChange={() => choisirLangue("en")} />
          </div>
        </Card>
      </SousSection>
    </SectionParametres>
  );
}
