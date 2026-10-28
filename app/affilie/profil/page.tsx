// Profil de l'affilié : compte, mot de passe, déconnexion (et retour au tableau de bord pour un marchand).
import Link from "next/link";
import { compteAffilie } from "@/app/affilie/session";
import { getT } from "@/lib/i18n/serveur";
import { BoutonDeconnexion } from "@/components/affilie/BoutonDeconnexion";
import { KeyRound, LayoutDashboard, HelpCircle } from "lucide-react";

export default async function ProfilAffilie() {
  const t = await getT();
  const compte = await compteAffilie();
  const user = compte;
  const ligne = "flex items-center gap-3 px-4 py-3.5 text-[13.5px] font-semibold hover:bg-gray-50";

  return (
    <>
      <h1 className="text-[20px] md:text-[24px] font-bold mb-4">{t("Profil")}</h1>
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
        <p className="text-[16px] font-bold">{user.name}</p>
        <p className="text-[13px] text-[#888]">{user.email}</p>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100 overflow-hidden">
        {user.role !== "affilie" && (
          <Link href="/dashboard" className={ligne}><LayoutDashboard size={17} className="text-[#F5A623]" />{t("Retour à mon tableau de bord marchand")}</Link>
        )}
        <Link href="/mot-de-passe-oublie" className={ligne}><KeyRound size={17} className="text-[#F5A623]" />{t("Changer de mot de passe")}</Link>
        <Link href="/affiliation" className={ligne}><HelpCircle size={17} className="text-[#F5A623]" />{t("Comment ça marche")}</Link>
        <BoutonDeconnexion className={`${ligne} w-full text-red-600`} />
      </div>
    </>
  );
}
