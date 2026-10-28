import Link from "next/link";
import { ArrowRight, Link2, UserPlus, Wallet } from "lucide-react";
import { getT } from "@/lib/i18n/serveur";
import { SECTION, SURTITRE, TITRE, INTRO, BOUTON_AMBRE } from "./charte";

// Reprise de « Comment ça marche » de /affiliation.
const ETAPES = [
  { Icon: UserPlus, titre: "1. Crée ton compte", texte: "Gratuit, sans boutique : un nom, un e-mail et un mot de passe suffisent." },
  { Icon: Link2, titre: "2. Choisis un produit et copie ton lien", texte: "Parcours le catalogue des boutiques AXSO et partage ton lien personnel où tu veux." },
  { Icon: Wallet, titre: "3. Gagne", texte: "Chaque vente payée en ligne via ton lien te rapporte une commission (10 % minimum, 20 % sur le numérique), versée par AXSO sur Mobile Money." },
];

export async function AffiliationSection() {
  const t = await getT();
  return (
    <section id="affiliation" className={`${SECTION} bg-[#FAFAFA]`}>
      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className={SURTITRE}>{t("Le marketplace d'affiliation d'AXSO")}</span>
            <h2 className={`${TITRE} mb-5`}>
              {t("Gagne de l'argent en")}{" "}<span className="text-[#F5A623]">{t("recommandant des produits")}</span>
            </h2>
            <p className={`${INTRO} max-w-2xl mx-auto`}>{t("Gratuit, sans boutique. AXSO te verse tes commissions sur Mobile Money.")}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {ETAPES.map(({ Icon, titre, texte }) => (
              <div key={titre} className="rounded-3xl p-7 bg-white border border-gray-100 shadow-sm">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[#F5A623]/10">
                  <Icon size={20} className="text-[#F5A623]" />
                </div>
                <p className="font-bold text-[#111111] mb-2">{t(titre)}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{t(texte)}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/affiliation" className={BOUTON_AMBRE}>{t("Devenir affilié")} <ArrowRight size={18} /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
