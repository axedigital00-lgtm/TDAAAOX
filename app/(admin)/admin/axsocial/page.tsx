import { redirect } from "next/navigation";
import { getAdminSessionPour, estAdminComplet } from "@/lib/admin-auth";
import { AdminAxsocialPanel } from "@/components/admin/AdminAxsocialPanel";
import { getT } from "@/lib/i18n/serveur";
import { EnTetePage } from "@/components/command-center/ui";

export default async function AdminAxsocialPage() {
  const t = await getT();
  const session = await getAdminSessionPour("axsocial");
  if (!session) redirect("/admin?refus=1");

  return (
    <div className="space-y-5">
      <EnTetePage titre={t("Axsocial — Publications Axso")} sousTitre={t("Diffuse une annonce officielle à tous les marchands, visible dans leur fil Axsocial")} />
      <AdminAxsocialPanel peutPublier={estAdminComplet(session)} />
    </div>
  );
}
