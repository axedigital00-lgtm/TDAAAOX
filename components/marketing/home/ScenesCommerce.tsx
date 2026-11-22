"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, MapPin } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { FilmAmbiance } from "./FilmAmbiance";

const marches = [
  { pays: "Cameroun", drapeau: "cm", ville: "Douala", devise: "XAF", prix: "18 500", produit: "Tissu kente", photo: "/visuels/accueil-tissu.webp", lat: 4.05, lng: 9.7 },
  { pays: "Sénégal", drapeau: "sn", ville: "Dakar", devise: "XOF", prix: "6 500", produit: "Huile d’argan", photo: "/visuels/accueil-argan.webp", lat: 14.72, lng: -17.47 },
  { pays: "Côte d’Ivoire", drapeau: "ci", ville: "Abidjan", devise: "XOF", prix: "5 500", produit: "Café en grains", photo: "/visuels/accueil-cafe.webp", lat: 5.34, lng: -4.03 },
];

export function SceneMarches() {
  const t = useT();
  const [index, setIndex] = useState(0);
  const marche = marches[index];
  return <div className="axm-markets">
    <div className="axm-market-options" role="group" aria-label={t("Choisir un marché")}>
      {marches.map((m, i) => <button type="button" key={m.drapeau} aria-pressed={index === i} onClick={() => setIndex(i)}>
        <img src={"/brand/drapeaux/" + m.drapeau + ".png"} alt="" />{t(m.pays)}</button>)}
    </div>
    <div className="axm-market-product" key={marche.photo}>
      <img src={marche.photo} alt={t(marche.produit)} loading="lazy" />
      <p>{t(marche.produit)} <b>{marche.prix} {marche.devise}</b></p>
    </div>
    <div className="axm-market-ticket" aria-live="polite">
      <small>{t("Aperçu de commande")}</small><h3>{t("Récapitulatif")}</h3>
      <dl><div><dt>{t("Article")}</dt><dd>{t(marche.produit)}</dd></div>
        <div><dt>{t("Livraison")}</dt><dd><MapPin size={14}/>{marche.ville}</dd></div>
        <div><dt>{t("Total")}</dt><dd>{marche.prix} {marche.devise}</dd></div></dl>
      <p><Check size={16}/>{t("Paiement à la livraison")}</p>
    </div>
  </div>;
}

export function Campagnes() {
  const t = useT();
  return <section className="axm-section axm-campaigns axm-light axm-clair"><div className="axm-wrap">
    <h2 className="axm-h2">{t("Vendez partout où sont vos clients.")} <em>{t("En ligne, en conversation et en magasin.")}</em></h2>
    <div className="axm-campaign-grid">
      <article className="axm-campaign-main"><FilmAmbiance nom="campagne-mode" description="Collection de mode à la lumière du jour" />
        <Link href="/fonctionnalites/boutique-en-ligne">{t("Boutique en ligne")} <ArrowUpRight/></Link></article>
      <article><img src="/editorial/catalogue-chat.webp" loading="lazy" alt="" />
        <Link href="/fonctionnalites/whatsapp">{t("Vente sur WhatsApp")} <ArrowUpRight/></Link></article>
      <article><img src="/hero-stand.webp" loading="lazy" alt="" />
        <Link href="/fonctionnalites/caisse">{t("Caisse en magasin")} <ArrowUpRight/></Link></article>
    </div>
  </div></section>;
}


export function ApercuStella() {
  const t = useT();
  const [etat, setEtat] = useState<"question" | "brouillon" | "attente">("question");
  return <div className="axm-stella-demo">
    <header><img src="/brand/axia-mark.png" alt="" width={34} height={34}/><strong>Stella</strong><small>{t("Démonstration")}</small></header>
    <p className="axm-stella-question">{t("Quels produits relancer cette semaine ?")}</p>
    <div key={etat} className="axm-stella-reponse" aria-live="polite">{etat === "question"
      ? t("Préparons une offre pour votre collection de sacs. Souhaitez-vous un brouillon de message ?")
      : etat === "brouillon" ? t("Brouillon de message · Découvrez les cabas de notre atelier. La nouvelle collection est disponible en boutique ce vendredi.")
      : t("La proposition est mise de côté.")}</div>
    <div className="axm-stella-actions">{etat === "question" ? <>
      <button type="button" onClick={() => setEtat("brouillon")}>{t("Oui, prépare")}</button>
      <button type="button" onClick={() => setEtat("attente")}>{t("Plus tard")}</button>
    </> : <button type="button" onClick={() => setEtat("question")}>{t("Revoir la proposition")}</button>}</div>
  </div>;
}
