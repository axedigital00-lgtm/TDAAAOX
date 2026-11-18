"use client";
// Fiche d'une course (livreur) : où aller, qui contacter, quoi encaisser, puis l'action du moment
// (démarrer → confirmer la remise ou signaler un échec) dans une barre fixe au pouce.
import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Package, CheckCircle, Navigation, MessageCircle, XCircle, Banknote, CircleCheck, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { formatMontant } from "@/lib/utils";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useT } from "@/components/I18nProvider";
import { useConfirmation } from "@/components/ui";
import { statutLivreur, encaissement, adresseCourse, lienItineraire } from "@/components/livreur/statuts";

const MapLivraison = dynamic(() => import("@/components/livreur/MapLivraison").then(m => m.MapLivraison), { ssr: false });

type Commande = {
  id: string; numero: string; clientNom: string; clientTelephone: string;
  adresseLivraison: string; adresseExacte: string | null; mapsLienClient: string | null;
  latitudeClient: number | null; longitudeClient: number | null; ville: string; pays: string;
  montantTotal: number; montantLivraison: number; devise: string;
  methodePaiement: string; paiementStatut: string; echecRaison: string | null;
  statut: string; noteClient: string | null; aCodeLivraison?: boolean;
  lignes: { nom: string; prix: number; quantite: number; imageUrl: string | null }[];
  livreur?: { id: string; latitude: number | null; longitude: number | null };
};

// Étapes de la barre de progression (libellés : components/livreur/statuts.ts).
const ETAPES = ["confirmee", "en_preparation", "expediee", "livree"];

// Raisons proposées au livreur — texte libre stocké tel quel dans Commande.echecRaison
const RAISONS_ECHEC = ["Client absent", "Client injoignable", "Refus du colis", "Adresse introuvable"];

const carte = "bg-gradient-to-br from-[#141414] to-[#0d0d0d] border border-white/5 rounded-3xl p-5";
const actionContact = "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-12 rounded-xl text-xs sm:text-sm";

export default function CommandeLivreurPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [commande, setCommande] = useState<Commande | null>(null);
  const [chargement, setChargement] = useState<"en_cours" | "ok" | "introuvable" | "erreur">("en_cours");
  const [isPending, startTransition] = useTransition();
  const [livreurPos, setLivreurPos] = useState<{ lat: number; lng: number } | null>(null);
  const [echecOuvert, setEchecOuvert] = useState(false);
  const [codeOuvert, setCodeOuvert] = useState(false);
  const [code, setCode] = useState("");
  const [erreurCode, setErreurCode] = useState("");
  const { confirmer, dialogue } = useConfirmation();

  const charger = useCallback(() => {
    setChargement("en_cours");
    fetch(`/api/commandes/${id}`)
      .then(async r => {
        if (r.status === 404 || r.status === 403) return setChargement("introuvable");
        if (!r.ok) return setChargement("erreur");
        setCommande((await r.json()).commande);
        setChargement("ok");
      })
      .catch(() => setChargement("erreur"));
  }, [id]);

  useEffect(() => {
    charger();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => setLivreurPos({ lat: coords.latitude, lng: coords.longitude }),
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, [charger]);

  function changerStatut(statut: "expediee" | "livree" | "tentative_echouee", echecRaison?: string) {
    startTransition(async () => {
      let res: Response;
      try {
        res = await fetch(`/api/commandes/${id}/statut`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statut, echecRaison, code: statut === "livree" ? code : undefined }),
        });
      } catch {
        toast.error(t("Connexion impossible. Vérifiez votre réseau et réessayez."));
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        // « Transition invalide : a → b » est un message technique : la course a changé entre-temps.
        const msg = !d.error || String(d.error).startsWith("Transition invalide")
          ? t("Cette course a changé entre-temps. Rechargez la page pour voir son état actuel.")
          : t(d.error);
        if (d.code === "code_incorrect" || d.code === "code_bloque") { setCode(""); setErreurCode(msg); }
        else toast.error(msg);
        return;
      }
      if (statut === "expediee") {
        // Position envoyée tout de suite : le client voit le livreur sans attendre le prochain envoi du GeoTracker (30 s)
        if (livreurPos && commande?.livreur?.id) {
          await fetch(`/api/livreurs/${commande.livreur.id}/position`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: livreurPos.lat, longitude: livreurPos.lng }),
          }).catch(() => {});
        }
        toast.success(t("Livraison démarrée"), { description: t("Le client est prévenu et peut suivre votre position.") });
        setCommande(c => c ? { ...c, statut: "expediee" } : c);
        router.refresh(); // le layout repasse le GeoTracker en suivi continu
        return;
      }
      if (statut === "tentative_echouee") toast.info(t("Échec signalé : {0}", t(echecRaison ?? "")), { description: t("Le client et la boutique sont prévenus. La course reste dans vos courses à retenter.") });
      else toast.success(t("Livraison confirmée"), { description: t("La commande est marquée livrée et les fonds sont libérés automatiquement.") });
      router.push("/livreur");
      router.refresh();
    });
  }

  async function signalerEchec(raison: string) {
    if (!commande) return;
    const ok = await confirmer({
      titre: t("Signaler un échec de livraison ?"),
      objet: t("{0} · « {1} »", t(commande.clientNom), t(raison)),
      description: t("Le client et la boutique sont prévenus. Vous pourrez redémarrer la livraison plus tard."),
      libelleConfirmer: t("Signaler l'échec"),
    });
    if (ok) changerStatut("tentative_echouee", raison);
  }

  async function confirmerSansCode() {
    if (!commande) return;
    const ok = await confirmer({
      titre: t("Confirmer la remise du colis ?"),
      objet: t("{0} · {1}", t(commande.clientNom), formatMontant(commande.montantTotal, commande.devise)),
      description: t("Confirmez seulement si le client a bien reçu son colis : la livraison ne pourra plus être modifiée."),
      libelleConfirmer: t("Confirmer la livraison"),
      destructive: false,
    });
    if (ok) changerStatut("livree");
  }

  const retour = () => (window.history.length > 1 ? router.back() : router.push("/livreur"));

  if (chargement === "en_cours") return (
    <div role="status" aria-live="polite" className="space-y-4 motion-safe:animate-pulse">
      <span className="sr-only">{t("Chargement de la course…")}</span>
      <div className="h-28 rounded-3xl bg-white/5" />
      <div className="h-48 rounded-3xl bg-white/5" />
      <div className="h-32 rounded-3xl bg-white/5" />
    </div>
  );
  if (chargement !== "ok" || !commande) return (
    <div role="alert" className={`${carte} text-center py-10`}>
      <AlertTriangle size={28} className="mx-auto mb-3 text-[#f87171]" aria-hidden />
      <p className="text-white font-semibold">
        {chargement === "introuvable" ? t("Course introuvable") : t("La course n'a pas pu se charger")}
      </p>
      <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
        {chargement === "introuvable"
          ? t("Elle n'existe plus ou a été attribuée à un autre livreur.")
          : t("Vérifiez votre connexion puis réessayez.")}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {chargement === "erreur" && (
          <button type="button" onClick={charger} className="inline-flex items-center gap-2 min-h-11 px-5 rounded-xl bg-[#F5A623] text-black font-semibold text-sm">
            <RefreshCw size={15} aria-hidden />{t("Réessayer")}
          </button>
        )}
        <Link href="/livreur/commandes" className="inline-flex items-center min-h-11 px-5 rounded-xl border border-white/10 text-gray-200 text-sm">{t("Voir mes livraisons")}</Link>
      </div>
    </div>
  );

  const st = statutLivreur(commande.statut);
  // Après un échec, la course reste à l'étape « En livraison » : le livreur peut la relancer.
  const echec = commande.statut === "tentative_echouee";
  const etapeActuelle = ETAPES.indexOf(echec ? "expediee" : commande.statut);
  const peutLivrer = commande.statut === "expediee";
  const peutDemarrer = ["confirmee", "en_preparation", "tentative_echouee"].includes(commande.statut);
  const aEncaisser = encaissement(commande);
  const adresse = adresseCourse(commande);

  return (
    <div className="space-y-4 pb-48 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 lg:items-start">
      {dialogue}
      <button type="button" onClick={retour} className="lg:col-span-2 inline-flex items-center gap-2 min-h-10 text-gray-400 hover:text-white text-sm">
        <ArrowLeft size={16} aria-hidden />{t("Retour")}
      </button>

      {/* En-tête : client, montant, état et ce qu'il faut faire maintenant */}
      <div className={`lg:col-span-2 ${carte}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-gray-500 text-xs font-mono">#{commande.numero}</p>
            <h1 className="text-xl font-bold text-white mt-1 break-words">{t(commande.clientNom)}</h1>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[#F5A623] font-bold text-xl">{formatMontant(commande.montantTotal, commande.devise)}</p>
            <p className="text-gray-500 text-xs mt-0.5">{t("dont livraison {0}", formatMontant(commande.montantLivraison, commande.devise))}</p>
          </div>
        </div>

        {etapeActuelle >= 0 && (
          <div className="flex items-center gap-1 mt-4" aria-hidden>
            {ETAPES.map((e, i) => (
              <div key={e} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: i <= etapeActuelle ? st.color : "#262626" }} />
            ))}
          </div>
        )}
        <p className="text-sm font-semibold mt-3" style={{ color: st.color }}>{t(st.label)}</p>
        {st.aide && <p className="text-gray-400 text-sm mt-1">{t(st.aide)}</p>}
        {echec && commande.echecRaison && (
          <p className="text-gray-400 text-xs mt-1">{t("Motif signalé : {0}", t(commande.echecRaison))}</p>
        )}

        {aEncaisser === "especes" && commande.statut !== "livree" && commande.statut !== "annulee" && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/25 px-3 py-2.5 text-sm text-[#F5A623]">
            <Banknote size={16} className="flex-shrink-0" aria-hidden />{t("À encaisser en espèces : {0}", formatMontant(commande.montantTotal, commande.devise))}
          </p>
        )}
        {aEncaisser === "deja_paye" && commande.statut !== "livree" && commande.statut !== "annulee" && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2.5 text-sm text-green-400">
            <CircleCheck size={16} className="flex-shrink-0" aria-hidden />{t("Déjà payée : n'encaissez rien")}
          </p>
        )}
      </div>

      {/* Carte : affichée quand le client a donné sa position GPS */}
      <MapLivraison
        adresse={adresse}
        ville={commande.ville}
        latitude={commande.latitudeClient}
        longitude={commande.longitudeClient}
        livreurLat={livreurPos?.lat}
        livreurLng={livreurPos?.lng}
      />

      {/* Destinataire : adresse et contact en un toucher */}
      <section aria-labelledby="destinataire" className={`${carte} space-y-4`}>
        <h2 id="destinataire" className="sr-only">{t("Destinataire")}</h2>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F5A623]/10 flex items-center justify-center flex-shrink-0">
            <MapPin size={16} className="text-[#F5A623]" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold break-words">{t(adresse)}</p>
            <p className="text-gray-400 text-sm">{t(commande.ville)}, {t(commande.pays)}</p>
            <a href={`tel:${commande.clientTelephone}`} className="inline-flex items-center gap-1.5 mt-1 min-h-10 text-gray-300 text-sm">
              <Phone size={13} className="text-gray-500" aria-hidden />{commande.clientTelephone}
            </a>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <a href={lienItineraire(commande)} target="_blank" rel="noopener noreferrer" className={`${actionContact} bg-white/5 border border-white/10 text-gray-200`}>
            <Navigation size={16} aria-hidden />{t("Itinéraire")}
          </a>
          <a href={`tel:${commande.clientTelephone}`} className={`${actionContact} bg-white/5 border border-white/10 text-gray-200`}>
            <Phone size={16} aria-hidden />{t("Appeler")}
          </a>
          <a href={`https://wa.me/${commande.clientTelephone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={`${actionContact} bg-green-500/10 border border-green-500/20 text-green-400`}>
            <MessageCircle size={16} aria-hidden />WhatsApp
          </a>
        </div>

        {commande.noteClient && (
          <div className="pt-4 border-t border-white/5">
            <p className="text-gray-500 text-xs mb-1">{t("Note du client")}</p>
            <p className="text-gray-300 text-sm">« {t(commande.noteClient)} »</p>
          </div>
        )}
      </section>

      {/* Articles */}
      <section aria-labelledby="articles" className={`lg:col-span-2 ${carte}`}>
        <h2 id="articles" className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Package size={14} className="text-[#F5A623]" aria-hidden />{t("Articles à remettre ({0})", commande.lignes.reduce((n, l) => n + l.quantite, 0))}
        </h2>
        <div className="space-y-3">
          {commande.lignes.map((ligne, i) => (
            <div key={i} className="flex items-center gap-3">
              {ligne.imageUrl ? (
                <img src={ligne.imageUrl} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-gray-500" aria-hidden />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium break-words">{t(ligne.nom)}</p>
                <p className="text-gray-500 text-xs">{t("Quantité : {0}", ligne.quantite)}</p>
              </div>
              <p className="text-gray-200 text-sm font-semibold whitespace-nowrap">{formatMontant(ligne.prix * ligne.quantite, commande.devise)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Action du moment, au pouce (au-dessus de la barre de navigation mobile) */}
      {(peutDemarrer || peutLivrer) && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-30 p-4 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/5">
          <div className="max-w-2xl mx-auto">
            {peutDemarrer ? (
              <>
                <button type="button" onClick={() => changerStatut("expediee")} disabled={isPending}
                  className="w-full flex items-center justify-center gap-3 min-h-14 bg-[#F5A623] text-black font-bold rounded-2xl text-lg transition-all disabled:opacity-50 shadow-xl shadow-[#F5A623]/20">
                  {isPending ? <Loader2 size={22} className="animate-spin" aria-hidden /> : <Navigation size={22} aria-hidden />}
                  {isPending ? t("Démarrage…") : echec ? t("Redémarrer la livraison") : t("Démarrer la livraison")}
                </button>
                <p className="text-center text-gray-500 text-xs mt-2">{t("Le client sera prévenu et pourra suivre votre position")}</p>
              </>
            ) : codeOuvert ? (
              <form onSubmit={e => { e.preventDefault(); changerStatut("livree"); }} className="space-y-2" noValidate>
                <label htmlFor="code-livraison" className="block text-center text-gray-300 text-sm">{t("Code de livraison du client (4 chiffres, reçu par WhatsApp)")}</label>
                <div className="flex gap-2">
                  <input id="code-livraison" value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setErreurCode(""); }}
                    inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="• • • •"
                    aria-invalid={!!erreurCode} aria-describedby={erreurCode ? "code-erreur" : undefined}
                    className={`flex-1 min-w-0 bg-[#161616] border rounded-2xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono text-white outline-none ${erreurCode ? "border-red-400" : "border-white/10 focus:border-green-500/50"}`} />
                  <button type="submit" disabled={isPending || code.length !== 4}
                    className="flex items-center justify-center gap-2 min-h-14 bg-green-500 text-white font-bold px-4 rounded-2xl disabled:opacity-40">
                    {isPending ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <CheckCircle size={20} aria-hidden />}
                    <span className="hidden min-[400px]:inline">{t("Confirmer la remise")}</span>
                    <span className="min-[400px]:hidden">{t("Confirmer")}</span>
                  </button>
                </div>
                {erreurCode && <p id="code-erreur" role="alert" className="text-center text-sm text-red-300">{erreurCode}</p>}
                <button type="button" onClick={() => { setCodeOuvert(false); setCode(""); setErreurCode(""); }} className="w-full min-h-10 text-xs text-gray-400">{t("Annuler")}</button>
              </form>
            ) : (
              // Commandes parties avant l'ajout du code : confirmation directe, après vérification
              <button type="button" onClick={() => commande.aCodeLivraison ? setCodeOuvert(true) : confirmerSansCode()} disabled={isPending}
                className="w-full flex items-center justify-center gap-3 min-h-14 bg-green-500 text-white font-bold rounded-2xl text-lg hover:bg-green-400 transition-all disabled:opacity-50 shadow-xl shadow-green-500/20">
                {isPending ? <Loader2 size={22} className="animate-spin" aria-hidden /> : <CheckCircle size={22} aria-hidden />}
                {isPending ? t("Confirmation…") : t("Confirmer la livraison")}
              </button>
            )}
            {peutLivrer && !codeOuvert && (echecOuvert ? (
              <fieldset className="mt-3">
                <legend className="text-gray-400 text-xs mb-2">{t("Pourquoi la livraison a-t-elle échoué ?")}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {RAISONS_ECHEC.map(r => (
                    <button type="button" key={r} onClick={() => signalerEchec(r)} disabled={isPending}
                      className="min-h-11 px-2 rounded-xl text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 disabled:opacity-50">
                      {t(r)}
                    </button>
                  ))}
                  <button type="button" onClick={() => setEchecOuvert(false)} className="col-span-2 min-h-10 text-xs text-gray-400">{t("Annuler")}</button>
                </div>
              </fieldset>
            ) : (
              <button type="button" onClick={() => setEchecOuvert(true)} disabled={isPending}
                className="mt-3 w-full flex items-center justify-center gap-2 min-h-11 rounded-xl text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors">
                <XCircle size={15} aria-hidden />{t("Signaler un échec")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
