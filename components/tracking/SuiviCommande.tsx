"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Check, ClipboardList, MapPin, Package, Phone, RefreshCw, Truck } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { MapTracking } from "@/components/storefront/MapTracking";
import { useSuivi } from "./useSuivi";
import "@fontsource-variable/inter/wght.css";
import "./suivi.css";

const etapes = [
  ["en_attente", "Commande reçue"], ["confirmee", "Confirmée"], ["en_preparation", "En préparation"],
  ["expediee", "En livraison"], ["livree", "Livrée"],
];

export function CadreSuivi({ children, retour = "/", boutique }: { children: ReactNode; retour?: string; boutique?: string }) {
  const t = useT();
  return <div className="axs-suivi">
    <header className="axs-suivi-nav"><div>
      <Link href={retour}><ArrowLeft size={16} />{boutique || t("Accueil")}</Link>
      <img src="/logo-dark.png" width="72" height="26" alt="AXSO" />
    </div></header>
    <main className="axs-suivi-main">{children}</main>
  </div>;
}

export function SuiviCommande({ url, token, slug, recommencer }: { url: string; token?: string; slug?: string; recommencer?: () => void }) {
  const t = useT();
  // La recherche publique autorise 30 lectures par quart d'heure.
  const { commande: c, actualisation, erreur, verification, actualiser } = useSuivi(url, token ? 8000 : 35000);
  const [trajet, setTrajet] = useState<{ distanceKm: number | null; etaMin: number | null } | null>(null);
  const retour = c?.tenant?.slug || slug;
  const cadre = { retour: retour ? "/" + encodeURIComponent(retour) : "/", boutique: c?.tenant?.nomBoutique || (slug ? t("Boutique") : undefined) };
  if (!c) return <CadreSuivi {...cadre}><section className="axs-suivi-card axs-suivi-state">
    <Package size={30}/><h1>{t("Suivi de commande")}</h1>
    <p role="status">{t(erreur || "Chargement du suivi…")}</p>
    {erreur && (recommencer ? <button onClick={recommencer}>{t("Nouvelle recherche")}</button> : <Link href="/suivi">{t("Rechercher une commande")}</Link>)}
  </section></CadreSuivi>;

  const annulee = c.statut === "annulee", livree = c.statut === "livree", echec = c.statut === "tentative_echouee";
  const idx = etapes.findIndex(([s]) => s === (echec ? "expediee" : c.statut));
  const statut = annulee ? "Commande annulée" : echec ? "Livraison à reprogrammer" : etapes[idx]?.[1] || c.statut;
  const pos = c.livreurPosition;
  const gps = pos?.lat != null && pos.lng != null;
  const carte = gps || (c.latitudeClient != null && c.longitudeClient != null);
  const tel = c.livreurTelephone || c.livreur?.telephone;
  const nom = c.livreurNom || c.livreur?.nom;
  const heure = (date: string | Date) => new Date(date).toLocaleTimeString(t.loc, { hour: "2-digit", minute: "2-digit" });
  const date = (valeur: string) => new Date(valeur).toLocaleString(t.loc, { dateStyle: "medium", timeStyle: "short" });
  const prix = (n: number) => n.toLocaleString(t.loc) + " " + (c.devise || "FCFA");

  return <CadreSuivi {...cadre}>
    <header className="axs-suivi-title">
      <div><p>{c.tenant?.nomBoutique}</p><h1>{t("Suivi de commande")}</h1><span>{c.numero}</span></div>
      {c.tenant?.logoUrl && <img src={c.tenant.logoUrl} alt="" />}
    </header>
    <div className="axs-suivi-grid"><div className="axs-suivi-column">
      <section className="axs-suivi-card"><header className="axs-suivi-cardhead"><h2>{t("Parcours du colis")}</h2>
        <strong role="status" className="axs-suivi-badge" data-tone={annulee || echec ? "warning" : livree ? "success" : "neutral"}>{t(statut)}</strong>
      </header>
      {!annulee && <ol className="axs-suivi-timeline">{etapes.map(([s, label], i) =>
        <li key={s} data-done={i <= idx} aria-current={i === idx ? "step" : undefined}><i>{i < idx || (livree && i === idx) ? <Check size={14}/> : null}</i>{t(label)}</li>)}</ol>}
      {annulee && <p>{t("Cette commande a été annulée. Contactez la boutique pour plus d'informations.")}</p>}
      {echec && <p>{c.echecRaison || t("Tentative de livraison manquée")}</p>}
      {livree && c.livreeAt && <p>{t("Livrée")} · {date(c.livreeAt)}</p>}
      <footer className="axs-suivi-foot">{verification && <span>{t("Dernière vérification")} · {heure(verification)}</span>}
        {!annulee && !livree && <button type="button" disabled={actualisation} onClick={actualiser}><RefreshCw size={14}/>{t("Actualiser")}</button>}
      </footer>{erreur && <p role="status">{t(erreur)}</p>}</section>
      {!livree && !annulee && <section className="axs-suivi-card"><h2><MapPin size={18}/>{t("Position du livreur")}</h2>
        {carte ? <>
          <div className="axs-suivi-map"><MapTracking key={String(c.latitudeClient) + "/" + String(c.longitudeClient) + "/" + gps} livreurLat={pos?.lat} livreurLng={pos?.lng} clientLat={c.latitudeClient} clientLng={c.longitudeClient} livreurNom={nom} onLiveInfo={setTrajet}/></div>
          {gps && pos?.updatedAt && <p>{t("Dernière position")} · {date(pos.updatedAt)}</p>}
          {gps && c.latitudeClient != null && c.longitudeClient != null && trajet?.distanceKm != null && <p>{trajet.distanceKm.toLocaleString(t.loc)} km{trajet.etaMin != null && t(" · ≈ {0} min", trajet.etaMin)}</p>}
        </> : <p>{t("La carte s’affichera dès qu’une position sera disponible.")}</p>}</section>}
    </div><div className="axs-suivi-column">
      {c.codeLivraison && <section className="axs-suivi-card"><h2>{t("Votre code de livraison")}</h2><b className="axs-suivi-code">{c.codeLivraison}</b>
        <p>{t("Donnez-le au livreur uniquement quand vous avez votre colis en main.")}</p></section>}
      <section className="axs-suivi-card"><h2><Truck size={18}/>{t("Livraison")}</h2><dl className="axs-suivi-details">
        {(c.adresseExacte || c.adresseLivraison || c.ville) && <div><dt>{t("Adresse")}</dt><dd>{[c.adresseExacte || c.adresseLivraison,c.ville].filter(Boolean).join(", ")}
          {c.mapsLienClient && <a href={c.mapsLienClient} target="_blank" rel="noreferrer">{t("Voir sur Google Maps")}</a>}</dd></div>}
        {(nom || tel) && <div><dt>{t("Livreur")}</dt><dd>{nom}{tel && <a href={`tel:${tel}`}><Phone size={14}/> {tel}</a>}</dd></div>}
        {(c.transporteur || c.numeroSuivi) && <div><dt>{t("Transporteur")}</dt><dd>{[c.transporteur,c.numeroSuivi].filter(Boolean).join(" · ")}</dd></div>}
        {c.createdAt && <div><dt>{t("Commandé le")}</dt><dd>{date(c.createdAt)}</dd></div>}
        {c.montantTotal != null && <div><dt>{t("Montant total")}</dt><dd>{prix(c.montantTotal)}</dd></div>}
      </dl></section>
      {!!c.lignes?.length && <section className="axs-suivi-card"><h2>{t("Articles")} ({c.lignes.length})</h2>
        <ul className="axs-suivi-items">{c.lignes.map((l,i) => <li key={i}>{l.imageUrl ? <img src={l.imageUrl} alt="" loading="lazy"/> : <Package size={24}/>}
          <div><b>{l.nom}</b><small>{l.variante} × {l.quantite}{!token && l.prix != null && " · " + prix(l.prix * l.quantite)}</small>
          {livree && token && c.tenant?.slug && l.produitId && <Link href={`/${c.tenant.slug}/produits/${l.produitId}`}>{t("Noter « {0} »", l.nom)}</Link>}</div>
        </li>)}</ul></section>}
      {c.tenant?.whatsapp && <a className="axs-suivi-action" target="_blank" rel="noreferrer" href={`https://wa.me/${c.tenant.whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent(t("Commande") + " " + c.numero)}`}><Phone size={16}/>{t("Contacter la boutique")} · WhatsApp</a>}
      {token && c.tenant?.slug && <Link className="axs-suivi-action" href={`/${c.tenant.slug}/mon-compte?lien=${encodeURIComponent(token)}`}><ClipboardList size={16}/>{t("Ouvrir dans mon espace client")}</Link>}
      {recommencer && <button className="axs-suivi-action" onClick={recommencer}>{t("Nouvelle recherche")}</button>}
    </div></div>
  </CadreSuivi>;
}
