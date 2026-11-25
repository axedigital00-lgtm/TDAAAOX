"use client";
// Parties interactives de « Ma boutique » : partage du lien et visite guidée.

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Icon } from "@/components/dashboard/design-system/icons/Icon";
import { VisiteGuidee, relancerVisite } from "@/components/dashboard/VisiteGuidee";

export function PartageBoutique({ lien, nom, enLigne }: { lien: string; nom: string; enLigne: boolean }) {
  const t = useT();
  const [copie, setCopie] = useState(false);
  const message = t("Découvrez ma boutique {0} : {1}", nom, lien);
  const copier = async () => {
    try { await navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* presse-papiers refusé */ }
  };
  const partager = async () => {
    if (navigator.share) { try { await navigator.share({ title: nom, text: message, url: lien }); return; } catch { /* partage annulé */ } }
    copier();
  };
  return (
    <div className="axd-mb__partage" id="partager" data-guide="mb-partage">
      <div className="axd-mb__url">
        <Icon name="link" size={16} />
        <span>{lien.replace(/^https?:\/\//, "")}</span>
        <button type="button" onClick={copier}>{copie ? t("Copié !") : t("Copier")}</button>
      </div>
      <div className="axd-mb__partage-actions">
        <a className="axd-mb__wa" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} />{t("Envoyer sur WhatsApp")}</a>
        <button type="button" onClick={partager}><Icon name="export" size={18} />{t("Partager")}</button>
        {enLigne && <a href={lien} target="_blank" rel="noopener noreferrer"><Icon name="external" size={18} />{t("Voir")}</a>}
      </div>
    </div>
  );
}

/** « Me guider » : ouvre la page de l'étape avec sa visite guidée. */
export function BoutonGuider({ href }: { href: string }) {
  const t = useT();
  return <Link href={href.includes("guide=") ? href : `${href}${href.includes("?") ? "&" : "?"}guide=1`} className="axd-mb__guider"><Icon name="help" size={16} />{t("Me guider pas à pas")}</Link>;
}

export function GuideMaBoutique() {
  const t = useT();
  return (
    <>
      <button type="button" className="axd-mb__revoir" onClick={() => relancerVisite("ma-boutique")}><Icon name="help" size={16} />{t("Visite guidée")}</button>
      <VisiteGuidee cle="ma-boutique" etapes={[
        { titre: "Bienvenue dans Ma boutique", texte: "Ici, vous configurez votre boutique et trouvez tous ses outils. Suivez le guide : en quelques minutes, vous êtes prêt à vendre." },
        { cible: "mb-lancement", titre: "Votre parcours de lancement", texte: "Six étapes simples, dans l'ordre. Chaque étape terminée se coche toute seule." },
        { cible: "mb-prochaine", titre: "Touchez ici pour continuer", texte: "Ce bouton vous emmène directement à la prochaine étape à faire. Pas besoin de chercher dans les menus." },
        { cible: "mb-partage", titre: "Partagez votre boutique", texte: "Copiez le lien ou envoyez-le sur WhatsApp en un geste : c'est comme ça que les premiers clients arrivent." },
        { cible: "mb-fonctions", titre: "Tous les outils de la boutique", texte: "Thèmes, constructeur, livraison, promotions, publicité… tout est rangé ici, par besoin." },
        { cible: "tab-m-boutique", titre: "Revenez ici quand vous voulez", texte: "Cet onglet « Ma boutique » vous ramène sur cette page depuis n'importe où." },
      ]} />
    </>
  );
}
