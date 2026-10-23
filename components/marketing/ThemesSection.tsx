import Link from "next/link";
import { Palette, Star } from "lucide-react";
import { MANIFESTE_LIBRAIRIE } from "@/lib/axso-design-manifest";
import { getT } from "@/lib/i18n/serveur";
import { SECTION, SURTITRE, TITRE, INTRO, BOUTON_NOIR } from "./charte";

/** Nombre réel de designs proposés (bibliothèque Templates/). */
export const NB_THEMES = MANIFESTE_LIBRAIRIE.length;

const THEMES = MANIFESTE_LIBRAIRIE.map((e, i) => ({
  id: e.fichier,
  nom: e.nom,
  desc: `Un design ${e.ambiance.join(", ")} — vos vrais produits déjà branchés dès l'activation.`,
  accent: e.couleurs.accent || "#F5A623",
  bg: e.couleurs.fond || "#0a0a0a",
  tags: e.ambiance.map((a) => a.charAt(0).toUpperCase() + a.slice(1)),
  popular: i === 0,
}));

/**
 * Cartes des designs — partagées par la landing (6 premiers) et /themes (tous).
 * `captures` (landing) : image légère (public/themes-apercu, capture de l'aperçu réel) au lieu
 * du design chargé en direct, carrousel au doigt sur mobile, carte entière cliquable.
 */
export async function GrilleThemes({ limite, captures }: { limite?: number; captures?: boolean }) {
  const t = await getT();
  return (
    <div className={captures
      ? "flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scroll-pl-6 sm:scroll-pl-0 -mx-6 px-6 sm:mx-0 sm:px-0 pb-3 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"}>
      {THEMES.slice(0, limite).map(theme => {
        const Carte = captures ? Link : "div";
        return (
        <Carte key={theme.id} href="/inscription"
          className={`rounded-3xl overflow-hidden border group hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-white ${captures ? "block w-[80%] flex-shrink-0 snap-start sm:w-auto" : ""}`}
          style={{ borderColor: "rgba(0,0,0,0.08)" }}>

          {/* Aperçu réel du design (mêmes cartes de démo que la vitrine sans produit) */}
          <div className="aspect-[4/3] relative overflow-hidden" style={{ background: theme.bg }}>
            {/* iframe à 400 % puis réduite à 25 % : rendu « bureau » qui suit la largeur de la carte */}
            {captures ? (
              <img src={`/themes-apercu/${theme.id.replace(/\.[a-z]+$/i, "")}.jpg`} alt={t(theme.nom)} loading="lazy" decoding="async"
                width={640} height={480} className="absolute inset-0 w-full h-full object-cover object-top" />
            ) : <iframe
              src={`/api/preview-theme?fichier=${encodeURIComponent(theme.id)}&nom=${encodeURIComponent(theme.nom)}`}
              title={theme.nom} loading="lazy" scrolling="no" tabIndex={-1}
              sandbox="allow-same-origin allow-scripts"
              className="absolute top-0 left-0 border-0 pointer-events-none"
              style={{ width: "400%", height: "400%", transform: "scale(0.25)", transformOrigin: "top left" }}
            />}

            {theme.popular && (
              <div className="absolute top-2 right-2 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full z-10 bg-[#F5A623] text-[#111111]">
                <Star size={11} fill="#111111" />{" "}{t("Populaire")}
              </div>
            )}

            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.6)" }}>
              {captures
                ? <span className="font-bold px-5 py-2.5 rounded-2xl text-sm bg-[#F5A623] text-[#111111]">{t("Choisir ce thème →")}</span>
                : <Link href="/inscription"
                    className="font-bold px-5 py-2.5 rounded-2xl text-sm transition-transform hover:scale-105 bg-[#F5A623] text-[#111111]">
                    {t("Choisir ce thème →")}
                  </Link>}
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-[#111111]">{t(theme.nom)}</h3>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: theme.accent, marginTop: 2 }} />
            </div>
            <p className="text-gray-500 text-sm mb-3">{t(theme.desc)}</p>
            <div className="flex flex-wrap gap-1.5">
              {theme.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: `${theme.accent}10`, color: theme.accent, border: `1px solid ${theme.accent}20` }}>
                  {t(tag)}
                </span>
              ))}
            </div>
          </div>
        </Carte>
        );
      })}
    </div>
  );
}

export async function ThemesSection() {
  const t = await getT();
  return (
    <section id="themes" className={`${SECTION} bg-[#FAFAFA]`}>
      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className={`${SURTITRE} inline-flex items-center gap-1.5`}>
              <Palette size={14} />{" "}{t("Thèmes premium")}
            </span>
            <h2 className={`${TITRE} mb-5`}>
              {t("Votre boutique,")}{" "}<span className="text-[#F5A623]">{t("votre identité")}</span>
            </h2>
            <p className={`${INTRO} max-w-2xl mx-auto`}>
              {NB_THEMES}{" "}{t("thèmes conçus pour les marchés africains — tous inclus dans votre abonnement.")}
            </p>
          </div>
          <GrilleThemes limite={6} captures />
          <div className="mt-12 text-center">
            <Link href="/themes" className={BOUTON_NOIR}>{t("Voir tous les thèmes")} →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
