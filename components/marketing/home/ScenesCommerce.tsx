"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight, Check, MapPin, X } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { FilmAmbiance } from "./FilmAmbiance";

const CarteCommandes = dynamic(() => import("@/components/dashboard/features/analytics/CarteCommandes").then(m => m.CarteCommandes), { ssr: false });
const marches = [
  { pays: "Cameroun", drapeau: "cm", ville: "Douala", devise: "XAF", prix: "18 500", produit: "Tissu kente", photo: "/hero-kente.webp", lat: 4.05, lng: 9.7 },
  { pays: "Sénégal", drapeau: "sn", ville: "Dakar", devise: "XOF", prix: "6 500", produit: "Huile d’argan", photo: "/hero-argan.webp", lat: 14.72, lng: -17.47 },
  { pays: "Côte d’Ivoire", drapeau: "ci", ville: "Abidjan", devise: "XOF", prix: "5 500", produit: "Café en grains", photo: "/hero-coffee.webp", lat: 5.34, lng: -4.03 },
];
const lieux = marches.map(m => ({ nom: m.ville, lat: m.lat, lng: m.lng, total: 1 }));

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

export function SceneMonde() {
  const t = useT();
  const dialogue = useRef<HTMLDialogElement>(null);
  const [ouvert, setOuvert] = useState(false);
  return <section className="axm-world">
    <div className="axm-wrap axm-world-grid">
      <FilmAmbiance nom="terre-nuit" description="Le continent africain de nuit" />
      <div><h2 className="axm-h2">{t("Chaque commande a une destination.")}</h2>
        <p className="axm-lead">{t("De Douala à Dakar, explorez les villes où vos colis prennent la route.")}</p>
        <button className="axm-btn axm-btn--secondary" type="button" onClick={() => { setOuvert(true); dialogue.current?.showModal(); }}>
          {t("Explorer le globe")} <ArrowUpRight size={17}/></button>
      </div>
    </div>
    <dialog ref={dialogue} className="axm-world-dialog" aria-label={t("Explorer le globe")} onClose={() => setOuvert(false)}>
      <div className="axm-world-toolbar"><h3>{t("Exemple de livraisons")}</h3>
        <button type="button" aria-label={t("Fermer")} onClick={() => dialogue.current?.close()}><X size={20}/></button></div>
      {ouvert && <CarteCommandes lieux={lieux}><p>{t("Trois commandes de démonstration en Afrique de l’Ouest et en Afrique centrale.")}</p></CarteCommandes>}
    </dialog>
  </section>;
}

export function Campagnes() {
  const t = useT();
  return <section className="axm-section axm-campaigns"><div className="axm-wrap">
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
