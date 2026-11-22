"use client";
// Portail des sociétés de livraison et des livreurs indépendants.
import "@fontsource-variable/inter/wght.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, MapPin, RefreshCw, ShieldCheck, Truck, Upload, WifiOff, X } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { BADGES, DOCUMENTS, NIVEAUX, STATUTS_COURSE, VEHICULES, VERIFICATION } from "@/lib/logistique/libelles";
import { apercuGain, documentsManquants, etapesTransporteur } from "@/lib/logistique/parcours";
import { formatMontant } from "@/lib/utils";
import { GestionTransporteur } from "./GestionTransporteur";
import { PreuveRemise } from "./PreuveRemise";
import { TourneeTransporteur } from "./TourneeTransporteur";
import "./logistique.css";

const api = async (u: string, m = "GET", b?: unknown) => {
  const r = await fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "Action impossible");
  return d;
};
const SUIVANT: Record<string, [string, string] | undefined> = { acceptee: ["enlevee", "J'ai récupéré le colis"], enlevement_planifie: ["enlevee", "J'ai récupéré le colis"], enlevee: ["en_transit", "Démarrer la livraison"], en_transit: ["proche_destination", "J'arrive"] };
const GPS_ACTIF = ["enlevee", "en_transit", "proche_destination"];
const cleFile = (id: string) => `axso_gps_${id}`;

/** Partage GPS : file locale si le réseau coupe, envoi par lots, arrêt automatique en fin de course. */
function useGps(courseId: string | null) {
  const [etat, setEtat] = useState<"arret" | "actif" | "hors_ligne" | "refuse">("arret");
  const watch = useRef<number | null>(null);
  const envoi = useRef(false);
  const delai = useRef(5000);
  const vider = useCallback(async () => {
    if (!courseId || envoi.current) return;
    let file: any[] = [];
    try { file = JSON.parse(localStorage.getItem(cleFile(courseId)) ?? "[]"); } catch { /* stockage indisponible */ }
    if (!file.length) return;
    envoi.current = true;
    const lot = file.slice(0, 50);
    try {
      const r = await fetch(`/api/logistique/courses/${courseId}/positions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points: lot }) });
      if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429)) {
        const reste = (JSON.parse(localStorage.getItem(cleFile(courseId)) ?? "[]") as any[]).filter((p) => !lot.some((x) => x.id === p.id));
        localStorage.setItem(cleFile(courseId), JSON.stringify(reste)); delai.current = 5000; setEtat((e) => (e === "hors_ligne" ? "actif" : e));
      } else throw new Error();
    } catch { delai.current = Math.min(delai.current * 2, 120_000); setEtat((e) => (e === "actif" ? "hors_ligne" : e)); }
    finally { envoi.current = false; }
  }, [courseId]);
  const arreter = useCallback(() => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); watch.current = null; setEtat("arret"); }, []);
  const demarrer = useCallback(() => {
    if (!courseId || !("geolocation" in navigator)) return setEtat("refuse");
    if (watch.current != null) return;
    let dernier = 0;
    setEtat("actif");
    watch.current = navigator.geolocation.watchPosition((p) => {
      const mouvement = (p.coords.speed ?? 1) > .7, pas = mouvement ? 8000 : 30000;
      if (Date.now() - dernier < pas) return;
      dernier = Date.now();
      const point = { id: crypto.randomUUID(), lat: p.coords.latitude, lng: p.coords.longitude, captureLe: new Date(p.timestamp).toISOString(), precisionM: p.coords.accuracy, vitesseMs: p.coords.speed ?? null, capDeg: p.coords.heading ?? null };
      try { const f = JSON.parse(localStorage.getItem(cleFile(courseId)) ?? "[]"); f.push(point); localStorage.setItem(cleFile(courseId), JSON.stringify(f.slice(-300))); } catch { /* stockage indisponible */ }
      vider();
    }, (e) => { if (e.code === 1) { arreter(); setEtat("refuse"); } }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  }, [courseId, vider, arreter]);
  useEffect(() => { arreter(); return arreter; }, [courseId, arreter]);
  useEffect(() => {
    if (!courseId) return;
    let fin = false, t: ReturnType<typeof setTimeout>;
    const boucle = async () => { await vider(); if (!fin) t = setTimeout(boucle, delai.current); };
    boucle();
    const reprise = () => { delai.current = 5000; vider(); };
    window.addEventListener("online", reprise);
    return () => { fin = true; clearTimeout(t); window.removeEventListener("online", reprise); };
  }, [courseId, vider]);
  return { etat, demarrer, arreter };
}

function Inscription({ onFait, compte }: { onFait: () => void; compte: any }) {
  const t = useT();
  const [f, setF] = useState({ type: compte?.type ?? "livreur", nom: compte?.nom ?? "", raisonSociale: "", registre: "", identifiantFiscal: "", adresseLegale: "", adresseOperation: "", telephone: compte?.telephone ?? "", email: compte?.email ?? "", capaciteMax: compte?.type === "societe" ? "5" : "2", villes: (compte?.zone ?? "") as string, vehicules: [compte?.vehicule && compte.vehicule in VEHICULES ? compte.vehicule : "moto"] as string[], base: "1500", parKm: "100", enlevement: "0", expressPct: "50", reglement: "" });
  const [envoi, setEnvoi] = useState(false);
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const champ = (k: keyof typeof f, l: string, type = "text") => <label><span>{t(l)}</span><input type={type} value={f[k] as string} onChange={(e) => set(k, e.target.value)} /></label>;
  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault(); setEnvoi(true);
    try {
      await api("/api/logistique/fournisseurs", "POST", { type: f.type, nom: f.nom, raisonSociale: f.raisonSociale || null, registre: f.registre || null, identifiantFiscal: f.identifiantFiscal || null, adresseLegale: f.adresseLegale || null, adresseOperation: f.adresseOperation || null, telephone: f.telephone, email: f.email || null, capaciteMax: Number(f.capaciteMax) || 1, vehicules: f.vehicules, zones: f.villes.split(",").map((v) => v.trim()).filter(Boolean).map((ville) => ({ ville })), reglement: f.reglement || null, tarif: { modele: "hybride", base: Number(f.base) || 0, parKm: Number(f.parKm) || 0, enlevement: Number(f.enlevement) || 0, expressPct: Number(f.expressPct) || 0 } });
      toast.success(t("Profil créé. Ajoutez maintenant vos documents.")); onFait();
    } catch (x: any) { toast.error(t(x.message)); } finally { setEnvoi(false); }
  };
  const gain = apercuGain({ base: Number(f.base) || 0, parKm: Number(f.parKm) || 0, enlevement: Number(f.enlevement) || 0 });
  return <form className="axl-carte axl-form axl-profil" onSubmit={envoyer}>
    <header>
      <small>{t("Dernière étape avant vos documents")}</small>
      <h2>{t("Complétez votre profil")}</h2>
      <p className="axl-doux">{t("Ces informations servent à vous proposer des courses dans vos zones.")}</p>
    </header>
    {compte?.role !== "livreur" && compte?.role !== "transporteur" && <div className="axl-choix" role="radiogroup" aria-label={t("Type de compte")}>{[["societe", "Société de livraison"], ["livreur", "Livreur indépendant"]].map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={f.type === v} onClick={() => set("type", v)}>{t(l)}</button>)}</div>}
    <section>
      <h3>{t(f.type === "societe" ? "Votre société" : "Vos coordonnées")}</h3>
      <div className="axl-grille">
        {champ("nom", f.type === "societe" ? "Nom commercial" : "Nom complet")}{champ("telephone", "Téléphone", "tel")}{champ("email", "E-mail", "email")}
        {f.type === "societe" && <>{champ("raisonSociale", "Raison sociale")}{champ("registre", "N° de registre de commerce")}{champ("identifiantFiscal", "Identifiant fiscal (NIU, NINEA…)")}{champ("adresseLegale", "Adresse légale")}{champ("adresseOperation", "Adresse d'exploitation")}</>}
      </div>
    </section>
    <section>
      <h3>{t("Où et comment vous livrez")}</h3>
      <div className="axl-grille">{champ("villes", "Villes desservies (séparées par des virgules)")}{champ("capaciteMax", "Courses simultanées maximum", "number")}</div>
      <fieldset><legend>{t("Véhicules")}</legend><div className="axl-puces">{Object.entries(VEHICULES).map(([v, l]) => <label key={v} className="axl-puce"><input type="checkbox" checked={f.vehicules.includes(v)} onChange={(e) => set("vehicules", e.target.checked ? [...f.vehicules, v] : f.vehicules.filter((x) => x !== v))} /><span>{t(l)}</span></label>)}</div></fieldset>
    </section>
    <section>
      <h3>{t("Vos tarifs")}</h3>
      <div className="axl-grille">{champ("base", "Prix de base (FCFA)", "number")}{champ("parKm", "Prix par km (FCFA)", "number")}{champ("enlevement", "Frais d'enlèvement (FCFA)", "number")}{champ("expressPct", "Supplément express (%)", "number")}</div>
      <p className="axl-apercu"><span>{t("Exemple pour {0} km", String(gain.km))}</span><b>{formatMontant(gain.prix, "XAF")}</b><span>{t("Vous recevez")} <b>{formatMontant(gain.net, "XAF")}</b></span></p>
    </section>
    <section>
      <h3>{t("Vos versements")}</h3>
      <div className="axl-grille">{champ("reglement", "Numéro Mobile Money de versement")}</div>
      <p className="axl-doux">{t("Indiquez l'opérateur et le numéro, par exemple : MTN 690000000. Ce numéro est chiffré.")}</p>
    </section>
    <div className="axl-envoi"><p>{t("Vous pourrez tout modifier plus tard.")}</p><button className="axl-btn axl-btn--fort" disabled={envoi || !f.nom.trim() || f.telephone.trim().length < 8 || !f.villes.trim() || !f.vehicules.length}>{envoi ? t("Envoi…") : t("Enregistrer et continuer")}</button></div>
  </form>;
}

function Course({ c, onChange }: { c: any; onChange: () => void }) {
  const t = useT();
  const gps = useGps(GPS_ACTIF.includes(c.statut) ? c.id : null);
  const [fiche, setFiche] = useState<any>(null);
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { fetch(`/api/logistique/courses/${c.id}`).then((r) => r.json()).then((d) => setFiche(d.course ?? null)).catch(() => {}); }, [c.id, c.statut]);
  const agir = async (b: object, ok: string) => { setEnvoi(true); try { await api(`/api/logistique/courses/${c.id}`, "POST", b); toast.success(t(ok)); onChange(); } catch (e: any) { toast.error(t(e.message)); } finally { setEnvoi(false); } };
  const s = SUIVANT[c.statut];
  const enRoute = ["en_transit", "proche_destination"].includes(c.statut);
  const nav = fiche?.suivi?.arrivee ? `https://www.google.com/maps/dir/?api=1&destination=${fiche.suivi.arrivee.lat},${fiche.suivi.arrivee.lng}` : null;
  return <article className="axl-course">
    <header><b>{c.reference}</b><span className="axl-etat" data-tone={STATUTS_COURSE[c.statut]?.tone}>{t(STATUTS_COURSE[c.statut]?.l ?? c.statut)}</span></header>
    {fiche?.commande && <p>{fiche.commande.clientNom} · {fiche.commande.adresse}, {fiche.commande.ville}{fiche.commande.telephone ? <> · <a href={`tel:${fiche.commande.telephone}`}>{fiche.commande.telephone}</a></> : null}</p>}
    {GPS_ACTIF.includes(c.statut) && <div className="axl-gps" data-etat={gps.etat}>
      {gps.etat === "hors_ligne" ? <WifiOff size={15} /> : <MapPin size={15} />}
      <span>{gps.etat === "actif" ? t("Position partagée pendant cette course") : gps.etat === "hors_ligne" ? t("Connexion interrompue : positions conservées, envoi au retour du réseau") : gps.etat === "refuse" ? t("Localisation refusée sur cet appareil") : t("Position non partagée")}</span>
      {gps.etat === "arret" || gps.etat === "refuse" ? <button type="button" onClick={gps.demarrer}>{t("Partager")}</button> : <button type="button" onClick={gps.arreter}>{t("Arrêter")}</button>}
    </div>}
    <div className="axl-actions">
      {s && <button className="axl-btn axl-btn--fort" disabled={envoi} onClick={() => agir({ action: "statut", statut: s[0] }, "Statut mis à jour")}>{t(s[1])}</button>}
      {nav && enRoute && <a className="axl-btn" href={nav} target="_blank" rel="noopener noreferrer">{t("Itinéraire")}</a>}
      {enRoute && <button className="axl-btn" disabled={envoi} onClick={() => { const motif = window.prompt(t("Motif de l'échec")); if (motif) agir({ action: "statut", statut: "echec", motif }, "Échec signalé"); }}>{t("Échec")}</button>}
      {!["livree", "annulee"].includes(c.statut) && <button className="axl-btn" onClick={() => { const description = window.prompt(t("Décrivez l'incident")); if (description) agir({ action: "incident", type: "incident", description }, "Incident signalé"); }}>{t("Incident")}</button>}
      {["livree", "echec"].includes(c.statut) && <button className="axl-btn" onClick={() => { const description = window.prompt(t("Pourquoi contestez-vous ce résultat ?")); if (description) agir({ action: "incident", type: "contestation", description }, "Contestation envoyée"); }}>{t("Contester")}</button>}
    </div>
    {enRoute && fiche && <PreuveRemise requises={fiche.preuvesRequises} envoi={envoi} onConfirmer={(p) => agir({ action: "livrer", ...p }, "Livraison confirmée")} />}
  </article>;
}

function Activation({ f }: { f: any }) {
  const t = useT();
  const { etapes, prochaine } = etapesTransporteur(f);
  if (!prochaine) return null;
  const aide: Record<string, string> = { documents: "Envoyez vos documents obligatoires dans la section Vérification.", validation: "AXSO vérifie votre dossier. Vous serez activé dès sa validation.", disponible: "Passez sur Disponible pour commencer à recevoir des courses." };
  return <section className="axl-carte">
    <h2>{t("Activez votre compte")}</h2>
    <ol className="axl-etapes">{etapes.map((e) => <li key={e.id} data-etat={e.fait ? "fait" : e.id === prochaine ? "actuelle" : "attente"}><i aria-hidden="true">{e.fait ? <Check size={13} /> : null}</i><span>{t(e.libelle)}</span></li>)}</ol>
    <p className="axl-doux">{t(aide[prochaine])}</p>
  </section>;
}

function Documents({ f, onChange }: { f: any; onChange: () => void }) {
  const t = useT();
  const [type, setType] = useState(documentsManquants(f)[0] ?? (f.type === "societe" ? "registre_commerce" : "piece_identite"));
  const [expire, setExpire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const deposer = (fichier?: File) => {
    if (!fichier) return;
    if (fichier.size > 2_000_000) return void toast.error(t("Fichier trop lourd : 2 Mo maximum"));
    const r = new FileReader();
    r.onload = async () => {
      setEnvoi(true);
      try { await api(`/api/logistique/fournisseurs/${f.id}/documents`, "POST", { type, nomFichier: fichier.name, mime: fichier.type, base64: String(r.result).split(",")[1], expireLe: expire ? new Date(expire).toISOString() : null }); toast.success(t("Document envoyé en revue")); onChange(); }
      catch (e: any) { toast.error(t(e.message)); } finally { setEnvoi(false); }
    };
    r.readAsDataURL(fichier);
  };
  return <section className="axl-carte"><h2><ShieldCheck size={18} /> {t("Vérification")} <span className="axl-etat" data-tone={f.statutLegal === "verifie" ? "success" : ["rejete", "suspendu"].includes(f.statutLegal) ? "critical" : "warning"}>{t(VERIFICATION[f.statutLegal])}</span></h2>
    <p className="axl-doux">{t("Vos documents sont chiffrés et ne sont jamais montrés aux marchands.")}</p>
    <ul className="axl-liste">{f.documents.map((d: any) => <li key={d.id}><span>{t(DOCUMENTS[d.type] ?? d.type)}{d.expireLe ? ` · ${t("expire le")} ${new Date(d.expireLe).toLocaleDateString(t.loc)}` : ""}{d.motifRejet ? ` · ${d.motifRejet}` : ""}</span><span className="axl-etat" data-tone={d.statut === "verifie" ? "success" : d.statut === "rejete" ? "critical" : "warning"}>{t(VERIFICATION[d.statut])}</span></li>)}</ul>
    <div className="axl-grille">
      <label><span>{t("Document")}</span><select value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(DOCUMENTS).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></label>
      <label><span>{t("Date d'expiration")}</span><input type="date" value={expire} onChange={(e) => setExpire(e.target.value)} /></label>
      <label className="axl-btn axl-depot"><Upload size={15} /> {envoi ? t("Envoi…") : t("Choisir un fichier")}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden disabled={envoi} onChange={(e) => { deposer(e.target.files?.[0]); e.target.value = ""; }} /></label>
    </div>
  </section>;
}

export function PortailTransporteur() {
  const t = useT();
  const [liste, setListe] = useState<any[] | null>(null);
  const [actif, setActif] = useState(0);
  const [vue, setVue] = useState<any>(null);
  const [compte, setCompte] = useState<any>(null);
  const f = liste?.[actif];
  const charger = useCallback(async () => {
    const d = await api("/api/logistique/fournisseurs"); setCompte(d.compte); setListe(d.fournisseurs);
    const x = d.fournisseurs[actif];
    if (x) setVue(await api(`/api/logistique/fournisseurs/${x.id}`));
  }, [actif]);
  useEffect(() => { charger().catch((e) => toast.error(t(e.message))); const i = setInterval(() => { if (!document.hidden) charger().catch(() => {}); }, 15_000); return () => clearInterval(i); }, [charger, t]);
  const repondre = async (id: string, accepter: boolean) => { try { await api(`/api/logistique/assignations/${id}`, "POST", { accepter, motif: accepter ? null : "Indisponible" }); toast.success(t(accepter ? "Course acceptée" : "Course refusée")); charger(); } catch (e: any) { toast.error(t(e.message)); charger(); } };
  const dispo = async () => { try { await api(`/api/logistique/fournisseurs/${f.id}`, "PATCH", { disponible: !f.disponible }); charger(); } catch (e: any) { toast.error(t(e.message)); } };

  return <main className="axl"><div className="axl-page">
    <header className="axl-tete"><div><img src="/logo.png" alt="AXSO" /><h1>{f ? f.nom : t("Portail transporteur")}</h1></div>{compte?.role === "livreur" && !f && <a className="axl-btn" href="/livreur">{t("Mes livraisons")}</a>}{f && <div className="axl-tete__a">{compte?.role === "livreur" && <a className="axl-btn" href="/livreur">{t("Mes livraisons")}</a>}<button type="button" className="axl-dispo" aria-pressed={f.disponible} onClick={dispo}><i />{t(f.disponible ? "Disponible" : "Hors service")}</button><button type="button" className="axl-icone" aria-label={t("Actualiser")} onClick={() => charger()}><RefreshCw size={16} /></button></div>}</header>
    {liste === null ? <p className="axl-doux">{t("Chargement…")}</p> : !f ? <Inscription key={compte?.email ?? "x"} compte={compte} onFait={charger} /> : <>
      {liste.length > 1 && <div className="axl-choix">{liste.map((x, i) => <button key={x.id} type="button" aria-checked={i === actif} role="radio" onClick={() => setActif(i)}>{x.nom}</button>)}</div>}
      {f.suspendu && <p className="axl-alerte">{t("Compte suspendu")} : {f.motifSuspension}</p>}
      <Activation f={f} />
      <div className="axl-kpis">
        <div><small>{t("Score AXSO")}</small><b>{f.score?.probation === false ? f.score.global : "—"}</b><span>{f.score?.niveau ? NIVEAUX[f.score.niveau] : t("Période d'essai")}</span></div>
        <div><small>{t("Livraisons")}</small><b>{f.score?.volume ?? 0}</b><span>{f.score?.tauxReussite != null ? `${Math.round(f.score.tauxReussite * 100)} % ${t("réussies")}` : t("Pas encore de données")}</span></div>
        <div><small>{t("Gains")}</small><b>{formatMontant(vue?.gains.total ?? 0, f.devise)}</b><span>{formatMontant(vue?.gains.aRegler ?? 0, f.devise)} {t("à recevoir")}</span></div>
        <div><small>{t("Avis")}</small><b>{vue?.avis.moyenne ? vue.avis.moyenne.toFixed(1) : "—"}</b><span>{vue?.avis.nombre ?? 0} {t("avis")}</span></div>
      </div>
      {f.score?.badges?.length > 0 && <div className="axl-badges">{f.score.badges.map((b: string) => <span key={b}>{t(BADGES[b])}</span>)}</div>}
      <section className="axl-carte"><h2><Truck size={18} /> {t("Courses proposées")}</h2>{!vue?.assignations.length ? <p className="axl-doux">{t("Aucune course en attente.")}</p> : vue.assignations.map((a: any) => <article key={a.id} className="axl-course"><header><b>{a.course.reference}</b>{a.course.versement != null && <b>{formatMontant(a.course.versement, a.course.devise)}</b>}</header><p>{a.course.ville ?? "—"}{a.course.poidsKg ? ` · ${a.course.poidsKg} kg` : ""}{a.course.express ? ` · ${t("Express")}` : ""} · {t("répondre avant")} {new Date(a.expireLe).toLocaleTimeString(t.loc, { hour: "2-digit", minute: "2-digit" })}</p><div className="axl-actions"><button className="axl-btn axl-btn--fort" onClick={() => repondre(a.id, true)}><Check size={15} /> {t("Accepter")}</button><button className="axl-btn" onClick={() => repondre(a.id, false)}><X size={15} /> {t("Refuser")}</button></div></article>)}</section>
      <section className="axl-carte"><h2>{t("Mes courses")}</h2>{!vue?.courses.length ? <p className="axl-doux">{t("Vos courses apparaîtront ici.")}</p> : vue.courses.map((c: any) => <Course key={c.id} c={c} onChange={charger} />)}</section>
      <TourneeTransporteur fournisseurId={f.id} version={(vue?.courses ?? []).map((c: any) => `${c.id}:${c.statut}`).join("|")} />
      <Documents f={f} onChange={charger} />
      <GestionTransporteur key={f.id} f={f} />
      <section className="axl-carte"><h2>{t("Règlements")}</h2>{!vue?.lots.length ? <p className="axl-doux">{t("Aucun règlement pour l'instant.")}</p> : <ul className="axl-liste">{vue.lots.map((l: any) => <li key={l.id}><span>{new Date(l.createdAt).toLocaleDateString(t.loc)} · {formatMontant(l.total, l.devise)}</span><span className="axl-etat" data-tone={l.statut === "paye" ? "success" : "warning"}>{t(l.statut === "paye" ? "Payé" : "En préparation")}</span></li>)}</ul>}</section>
    </>}
  </div></main>;
}
