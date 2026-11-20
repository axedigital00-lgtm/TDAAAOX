import Link from "next/link";
import { Palette } from "lucide-react";
import { MANIFESTE_LIBRAIRIE } from "@/lib/axso-design-manifest";
import { getT } from "@/lib/i18n/serveur";
import { famillesTheme } from "@/lib/themes-familles";
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
  familles: famillesTheme(e.ambiance),
  popular: i === 0,
}));

/**
 * Cartes des designs — partagées par la landing (6 premiers) et /themes (tous).
 * `captures` (landing) : image légère (public/themes-apercu, capture de l'aperçu réel) au lieu
 * du design chargé en direct, carrousel au doigt sur mobile, carte entière cliquable.
 */
export async function GrilleThemes({ limite, captures, famille }: { limite?: number; captures?: boolean; famille?: string }) {
  const t = await getT();
  return (
    <div className="axm-grid axm-g3" style={{ gap: "40px 20px" }}>
      {THEMES.filter((th) => !famille || th.familles.includes(famille)).slice(0, limite).map(theme => (
        <Link key={theme.id} href="/inscription" className="axm-theme">
          {/* Aperçu réel du design (mêmes cartes de démo que la vitrine sans produit) */}
          <div className="axm-theme__img" style={{ background: theme.bg }}>
            {/* iframe à 400 % puis réduite à 25 % : rendu « bureau » qui suit la largeur de la carte */}
            {captures ? (
              <img src={`/themes-apercu/${theme.id.replace(/\.[a-z]+$/i, "")}.jpg`} alt={t(theme.nom)} loading="lazy" decoding="async" width={640} height={480} />
            ) : <iframe
              src={`/api/preview-theme?fichier=${encodeURIComponent(theme.id)}&nom=${encodeURIComponent(theme.nom)}`}
              title={theme.nom} loading="lazy" scrolling="no" tabIndex={-1}
              sandbox="allow-same-origin allow-scripts"
              style={{ width: "400%", height: "400%", transform: "scale(0.25)", transformOrigin: "top left", pointerEvents: "none" }}
            />}
            {theme.popular && <span className="axm-theme__badge">{t("Populaire")}</span>}
          </div>
          <div className="axm-theme__body">
            <div>
              <h3 className="axm-h4">{t(theme.nom)}</h3>
              <p className="axm-muted" style={{ fontSize: 15, marginTop: 4 }}>{theme.tags.map((tag) => t(tag)).join(" · ")}</p>
            </div>
            <span aria-hidden style={{ width: 16, height: 16, borderRadius: "50%", background: theme.accent, flex: "none", marginTop: 4, boxShadow: "0 0 0 1px rgba(255,255,255,.2)" }} />
          </div>
        </Link>
      ))}
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
