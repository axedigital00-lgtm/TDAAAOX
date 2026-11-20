"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { CadreSuivi } from "@/components/tracking/SuiviCommande";
import { Bike, MapPin, Navigation, Radio, Square, XCircle, CheckCircle, Phone, MessageCircle } from "lucide-react";
import { useT } from "@/components/I18nProvider";

export default function LivreurPage() {
  const { token } = useParams<{ token: string }>();
  return <CourseLivreur key={token} token={token} />;
}

function CourseLivreur({ token }: { token: string }) {
  const t = useT();
  const [commande, setCommande] = useState<any>(null);
  const [erreur, setErreur] = useState<string | null>(null); // lien terminé ou invalide
  const [status, setStatus] = useState<"idle"|"tracking"|"error"|"done">("idle");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [lastPos, setLastPos] = useState<{lat:number;lng:number}|null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [envoi, setEnvoi] = useState(false);
  const [code, setCode] = useState("");
  const [echecOuvert, setEchecOuvert] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const watchRef = useRef<number|null>(null);
  const intervalRef = useRef<NodeJS.Timeout|null>(null);

  const generationGps = useRef(0);
  function couperGPS() {
    generationGps.current++;
    if (watchRef.current !== null) navigator.geolocation?.clearWatch(watchRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    watchRef.current = null;
    intervalRef.current = null;
  }

  useEffect(() => {
    fetch(`/api/tracking/${token}`)
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (d.commande) setCommande(d.commande);
        else setErreur(r.status === 410 && d.error ? d.error : r.status === 404 ? "Lien de livraison invalide." : "Connexion impossible. Vérifiez votre réseau et rechargez la page.");
      })
      .catch(() => setErreur("Connexion impossible. Vérifiez votre réseau et rechargez la page."));
    return () => {
      couperGPS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function sendPos(lat: number, lng: number) {
    const r = await fetch(`/api/tracking/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, nom: nom || undefined, telephone: telephone || undefined }),
    }).catch(() => null);
    if (!r) return; // réseau coupé : le prochain envoi réessaie
    // Course terminée pendant le partage : on arrête d'envoyer la position.
    if (r.status === 410) {
      couperGPS();
      setErreur((await r.json().catch(() => ({}))).error || "Cette course est terminée : ce lien n'est plus actif.");
      return;
    }
    if (!r.ok) return;
    setLastPos({ lat, lng });
    setUpdateCount(c => c + 1);
  }

  function startTracking() {
    couperGPS();
    const generation = generationGps.current;
    const recevoir = (pos: GeolocationPosition) => {
      if (generation === generationGps.current) void sendPos(pos.coords.latitude, pos.coords.longitude);
    };
    const indisponible = () => {
      if (generation !== generationGps.current) return;
      couperGPS(); setStatus("error");
    };
    if (!navigator.geolocation) { setStatus("error"); return; }
    setStatus("tracking");

    function startWatch(highAccuracy: boolean) {
      if (generation !== generationGps.current) return;
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = navigator.geolocation.watchPosition(
        recevoir,
        err => {
          // Code 3 = TIMEOUT — iOS Safari cold GPS; fallback to low accuracy
          if (err.code === 3 && highAccuracy) startWatch(false);
          if (err.code === 1) indisponible();
        },
        { enableHighAccuracy: highAccuracy, maximumAge: 5000, timeout: 15000 }
      );
    }

    // First fix: get position immediately with timeout so iOS Safari doesn't hang
    navigator.geolocation.getCurrentPosition(
      recevoir,
      err => {
        if (err.code === 3) {
          // TIMEOUT on high accuracy — retry with low accuracy before giving up
          navigator.geolocation.getCurrentPosition(
            recevoir,
            indisponible,
            { enableHighAccuracy: false, timeout: 10000 }
          );
        } else {
          indisponible();
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );

    startWatch(true);

    // 30s periodic backup (catches gaps in watchPosition on some iOS versions)
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        recevoir,
        () => {},
        { enableHighAccuracy: false, timeout: 10000 }
      );
    }, 30000);
  }

  // Même circuit que l'appli livreur (lib/cycle-livraison.ts) : démarrer, livrer avec le code du client, signaler un échec.
  async function changerStatut(statut: "expediee" | "livree" | "tentative_echouee", echecRaison?: string) {
    setEnvoi(true); setMessage(null);
    const r = await fetch(`/api/tracking/${token}/statut`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut, echecRaison, code: statut === "livree" ? code : undefined }),
    }).catch(() => null);
    setEnvoi(false);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) {
      setMessage(t(d.error) || t("Connexion impossible. Vérifiez votre réseau et réessayez."));
      if (d.code === "code_incorrect") setCode("");
      return;
    }
    setCommande((c: any) => ({ ...c, statut }));
    setEchecOuvert(false);
    if (statut === "expediee") { if (status !== "tracking") startTracking(); return; }
    stopTracking();
  }

  function stopTracking() {
    couperGPS();
    setStatus("done");
  }

  const destination = commande?.latitudeClient != null && commande.longitudeClient != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${commande.latitudeClient},${commande.longitudeClient}` : commande?.mapsLienClient;
  const terminee = commande?.statut === "livree" || commande?.statut === "annulee";
  return <CadreSuivi boutique={commande?.tenant?.nomBoutique} retour={commande?.tenant?.slug ? "/" + commande.tenant.slug : "/"}>
    <header className="axs-suivi-title"><div><p>{commande?.tenant?.nomBoutique}</p><h1>{t("Mode livreur")}</h1>
      {commande && <span>{commande.numero} · {commande.clientNom}</span>}</div></header>
    {erreur || !commande ? <section role="status" className="axs-suivi-card">{t(erreur || "Chargement du suivi…")}</section> :
      <div className="axs-suivi-grid axs-course"><div className="axs-suivi-column">
        <section className="axs-suivi-card"><h2><MapPin size={18}/>{t("Adresse de livraison")}</h2>
          <p>{[commande.adresseExacte || commande.adresseLivraison || t("À préciser"), commande.ville].filter(Boolean).join(", ")}</p>
          {destination && <a className="axs-suivi-action" href={destination} target="_blank" rel="noreferrer"><Navigation size={16}/>{t("Itinéraire GPS")}</a>}
          {commande.mapsLienClient && destination !== commande.mapsLienClient && <a className="axs-suivi-action" href={commande.mapsLienClient} target="_blank" rel="noreferrer">{t("Ouvrir dans Google Maps")}</a>}
          {commande.clientTelephone && <div className="axs-course-actions"><a href={`tel:${commande.clientTelephone}`}><Phone size={15}/>{t("Appeler le client")}</a>
            <a href={`https://wa.me/${String(commande.clientTelephone).replace(/\D/g,"")}`} target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a></div>}
        </section>
        <section className="axs-suivi-card"><h2><Radio size={18}/>{t("Partage de position")}</h2>
          {status === "idle" && <div className="axs-course-fields">
            <label htmlFor="livreur-nom">{t("Votre nom (optionnel)")}</label><input id="livreur-nom" value={nom} onChange={e => setNom(e.target.value)} />
            <label htmlFor="livreur-tel">{t("Téléphone (optionnel)")}</label><input id="livreur-tel" type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} />
          </div>}
          {status === "tracking" ? <><p role="status">{lastPos ? t("Dernière position") + " · " + lastPos.lat.toFixed(5) + ", " + lastPos.lng.toFixed(5) : t("Recherche de la position…")}</p>
            <p>{updateCount} {t("mise(s) à jour envoyée(s)")}</p><button onClick={stopTracking}><Square size={14}/>{t("Arrêter le partage")}</button></> :
            !terminee && <>{status === "error" && <p role="alert">{t("Géolocalisation refusée")}</p>}
              <button disabled={envoi} onClick={() => commande.statut === "expediee" ? startTracking() : changerStatut("expediee")}>
                <Bike size={16}/>{t(commande.statut === "expediee" ? "Reprendre le partage de position" : "Démarrer la livraison")}</button></>}
          {terminee && <p>{t(commande.statut === "livree" ? "Livraison confirmée" : "Commande annulée")}</p>}
        </section>
      </div><div className="axs-suivi-column">
        {commande.statut === "expediee" && <section className="axs-suivi-card"><h2><CheckCircle size={18}/>{t("Confirmer la livraison")}</h2>
          <form className="axs-course-fields" onSubmit={e => { e.preventDefault(); changerStatut("livree"); }}>
            <label htmlFor="code-livraison">{t("Demandez au client son code de livraison (reçu par WhatsApp)")}</label>
            <input id="code-livraison" value={code} onChange={e => setCode(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" autoComplete="one-time-code" placeholder="• • • •" />
            <button disabled={envoi || code.length !== 4}>{t("Livré")}</button>
          </form>
          <button className="axs-course-secondary" onClick={() => setEchecOuvert(!echecOuvert)} aria-expanded={echecOuvert}><XCircle size={15}/>{t(echecOuvert ? "Annuler" : "Signaler un échec")}</button>
          {echecOuvert && <div className="axs-course-fields">{["Client absent","Client injoignable","Refus du colis","Adresse introuvable"].map(r =>
            <button key={r} disabled={envoi} onClick={() => changerStatut("tentative_echouee", r)}>{t(r)}</button>)}</div>}
        </section>}
        {commande.statut === "tentative_echouee" && <p role="status" className="axs-suivi-card">{t("Tentative de livraison manquée")}</p>}
        {message && <p role="alert" className="axs-suivi-card">{message}</p>}
      </div></div>}
  </CadreSuivi>;
}
