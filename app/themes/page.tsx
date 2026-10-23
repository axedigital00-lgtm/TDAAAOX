import { NavbarMarketing } from "@/components/marketing/NavbarMarketing";
import { FooterMarketing } from "@/components/marketing/FooterMarketing";
import Link from "next/link";
import type { Metadata } from "next";
import { Palette } from "lucide-react";
import { GrilleThemes, NB_THEMES } from "@/components/marketing/ThemesSection";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = {
  title: "Thèmes",
  description: "Choisissez votre design de boutique parmi la bibliothèque AXSO Design — des designs prêts à l'emploi conçus pour l'Afrique.",
};


export default async function ThemesPage() {
  const t = await getT();
  return (
    <main className="bg-white text-[#111111] min-h-screen" style={{ fontFamily: "'Poppins','Century Gothic',system-ui,sans-serif" }}>
      <NavbarMarketing />

      <section className="pt-36 pb-24 px-6 sm:px-10 lg:px-16 xl:px-24 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(245,166,35,0.09) 0%, transparent 65%)" }} />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] mb-5" style={{ color: "#F5A623" }}>
              <Palette size={13} />{" "}{t("Thèmes premium")}
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
              {t("Votre boutique,")}<br />
              <span style={{ background: "linear-gradient(135deg,#F5A623,#d4880d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {t("votre identité")}
              </span>
            </h1>
            <p className="text-[#737373] text-xl max-w-2xl mx-auto">
              {NB_THEMES}{" "}{t("thèmes conçus pour les marchés africains — tous inclus dans votre abonnement.")}
            </p>
          </div>

          <GrilleThemes />

          <div className="mt-14 text-center">
            <p className="text-[#808080] text-sm mb-5">{t("Les designs sont inclus dans tous les plans. À l'inscription, Axia vous en propose 4 adaptés à votre activité : ce sont ceux que vous pourrez ensuite appliquer depuis le Constructeur.")}</p>
            <Link href="/inscription"
              className="inline-block font-bold px-10 py-4 rounded-2xl transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg,#F5A623,#d4880d)", color: "#080808", boxShadow: "0 8px 30px rgba(245,166,35,0.35)" }}>
              {t("Créer ma boutique gratuitement →")}
            </Link>
          </div>
        </div>
      </section>

      <FooterMarketing />
    </main>
  );
}
