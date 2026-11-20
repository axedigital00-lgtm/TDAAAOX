import { PageLegale } from "@/components/marketing/site/Blocs";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = {
  title: "Politique Cookies",
};

// Liste vérifiée dans le code (cookies posés par Auth.js, proxy.ts, app/api/**, LangueSelecteur, DeviseVitrine…).
const COOKIES = [
  { nom: "authjs.session-token", type: "Essentiel", duree: "30 jours", desc: "Maintient votre connexion (préfixé __Secure- en HTTPS)." },
  { nom: "authjs.csrf-token", type: "Essentiel", duree: "Session", desc: "Protège les formulaires de connexion (préfixé __Host- en HTTPS)." },
  { nom: "axso_pos_appareil", type: "Essentiel", duree: "180 jours", desc: "Reconnaît un appareil de caisse autorisé par le marchand." },
  { nom: "axso_oauth_etat", type: "Essentiel", duree: "10 minutes", desc: "Sécurise la connexion d'un outil externe à votre compte." },
  { nom: "langue", type: "Fonctionnel", duree: "1 an", desc: "Mémorise la langue choisie (français ou anglais)." },
  { nom: "axso_pays", type: "Fonctionnel", duree: "1 an", desc: "Mémorise le pays choisi sur une boutique pour afficher les prix dans votre devise." },
  { nom: "axso_apercu", type: "Fonctionnel", duree: "Session", desc: "Affiche l'aperçu de la boutique dans l'éditeur (marchands)." },
  { nom: "axso_brouillon", type: "Fonctionnel", duree: "1 heure", desc: "Donne accès à l'aperçu d'une version brouillon de la boutique (marchands)." },
  { nom: "aff_ref", type: "Mesure", duree: "30 jours (selon le programme)", desc: "Attribue votre commande à l'affilié qui vous a recommandé la boutique." },
  { nom: "axso_xp", type: "Mesure", duree: "1 an", desc: "Nombre aléatoire, sans donnée personnelle, qui fixe la version vue lors d'un test A/B de boutique." },
  { nom: "Pixels Facebook, TikTok, Snapchat, Google", type: "Tiers", duree: "Selon le service", desc: "Ajoutés par certains marchands sur leur boutique uniquement, pour mesurer leurs publicités." },
];

const TYPES: Record<string, { desc: string }> = {
  Essentiel:   { desc: "Indispensables au fonctionnement : connexion et sécurité." },
  Fonctionnel: { desc: "Mémorisent vos choix : langue, pays, aperçus." },
  Mesure:      { desc: "Attribution des ventes aux affiliés et tests A/B des boutiques." },
  Tiers:       { desc: "Déposés par les services publicitaires choisis par un marchand, sur sa boutique seulement." },
};

export default async function CookiesPage() {
  const t = await getT();
  return (
    <PageLegale t={t} actif="/legal/cookies" titre={t("Politique Cookies")} maj={t("Dernière mise à jour : 14 octobre 2026")}>

          <div>
            <div className="axm-legal__sec">
              <h2>{t("Qu'est-ce qu'un cookie ?")}</h2>
              <p className="axm-legal__p">{t("Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d'un site web. AXSO utilise des cookies pour assurer le bon fonctionnement de la plateforme et mémoriser vos préférences.")}</p>
            </div>

            <div className="axm-legal__sec">
              <h2>{t("Types de cookies utilisés")}</h2>
              <div style={{ display: "grid", gap: 12 }}>
                {Object.entries(TYPES).map(([type, info]) => (
                  <div key={type} className="axm-card" style={{ padding: 20 }}>
                    <span className="axm-mock__tag">{t(type)}</span>
                    <p className="axm-legal__p" style={{ marginTop: 8 }}>{t(info.desc)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="axm-legal__sec">
              <h2>{t("Liste détaillée des cookies")}</h2>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      {["Cookie", "Type", "Durée", "Finalité"].map(h => (
                        <th key={h}>{t(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COOKIES.map(c => (
                      <tr key={c.nom}>
                        <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>{t(c.nom)}</td>
                        <td>
                          <span className="axm-mock__tag">{t(c.type)}</span>
                        </td>
                        <td>{t(c.duree)}</td>
                        <td>{t(c.desc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="axm-legal__sec">
              <h2>{t("Gestion de vos préférences")}</h2>
              <p className="axm-legal__p" style={{ marginBottom: 12 }}>
                {t("Vous pouvez gérer vos préférences cookies à tout moment depuis les paramètres de votre navigateur. La désactivation des cookies essentiels peut affecter le fonctionnement de la plateforme.")}
              </p>
              <p className="axm-legal__p">
                {t("Pour plus d'informations :")}{" "}<a href="mailto:privacy@axsoafrica.com" className="axm-link">privacy@axsoafrica.com</a>
              </p>
            </div>
          </div>
    </PageLegale>
  );
}
