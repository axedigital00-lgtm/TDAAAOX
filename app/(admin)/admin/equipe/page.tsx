import { redirect } from "next/navigation";
import { getAdminSessionPour, estAdminComplet } from "@/lib/admin-auth";
import { AdminEquipePanel } from "@/components/admin/AdminEquipePanel";
import { getT } from "@/lib/i18n/serveur";
import { EnTetePage } from "@/components/command-center/ui";

export default async function AdminEquipePage() {
  const t = await getT();
  const session = await getAdminSessionPour("equipe");
  if (!session) redirect("/admin?refus=1");

  return (
    <div className="space-y-5">
      <EnTetePage titre={t("Équipe")} sousTitre={t("Membres ayant accès au panneau d'administration Axso")} />
      <AdminEquipePanel peutInviter={estAdminComplet(session)} monId={session.userId} />
    </div>
  );
}
