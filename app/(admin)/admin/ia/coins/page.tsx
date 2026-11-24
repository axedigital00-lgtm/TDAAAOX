import { redirect } from "next/navigation";
import { getAdminSessionPour } from "@/lib/admin-auth";
import { EnTetePage } from "@/components/command-center/ui";
import { GainsCoins } from "@/components/command-center/GainsCoins";
import { getT } from "@/lib/i18n/serveur";

export default async function CoinsAdminPage() {
  const a = await getAdminSessionPour("ia");
  if (!a) redirect("/admin?refus=1");
  const t = await getT();
  return <div className="space-y-4"><EnTetePage eyebrow="Axso Command Center" titre={t("Coins et gains IA")} sousTitre={t("Revenus, coûts réels, marge et budget des actions IA premium")} /><GainsCoins peutModifier={a.role === "admin"} /></div>;
}
