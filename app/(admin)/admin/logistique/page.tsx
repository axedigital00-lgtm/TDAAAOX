import { redirect } from "next/navigation";
import { getAdminSessionPour } from "@/lib/admin-auth";
import { EnTetePage } from "@/components/command-center/ui";
import { TourDeControle } from "@/components/logistique/TourDeControle";
import { getT } from "@/lib/i18n/serveur";

export default async function LogistiqueAdminPage() {
  if (!(await getAdminSessionPour("operations"))) redirect("/admin?refus=1");
  const t = await getT();
  return <div className="space-y-4"><EnTetePage eyebrow="Axso Command Center" titre={t("Tour de contrôle logistique")} sousTitre={t("Réseau, risques, finance et décisions automatiques")} /><TourDeControle /></div>;
}
