"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, Volume2, VolumeX, Check, Loader2, AlertTriangle, ScrollText } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { useAbonnementOverlay } from "@/components/dashboard/AbonnementOverlayProvider";
import { AxiaConversation } from "@/components/dashboard/AxiaConversation";
import { MESSAGE_PRO } from "@/components/dashboard/AxiaBulle";
import { Bouton } from "@/components/ui";
import { palierAuMoins } from "@/lib/plans";

// Panneau AXIA (modèle : Shopify Sidekick), monté une fois dans DashboardShell : colonne de droite
// qui pousse le contenu sur ordinateur (≥ lg), feuille plein écran en dessous. Ouvert par le bouton
// AXIA de l'en-tête, le bouton central de la barre du bas, Ctrl/⌘+J, ouvrirAxia(question) ou un
// lien ?axia=<question> sur n'importe quelle page du dashboard (liens externes, notifications).
// En tête : les propositions d'AXIA (constats, rappels) et ses demandes d'accord avant toute action
// sensible (app/api/axia/propositions). Conversation réservée au Palier Pro et plus.

type Action = { prompt?: string; lien?: string; libelle?: string; confirmation?: boolean } | null;
interface Proposition { id: string; type: string; message: string; action: Action; statut: string }

const CLE_OUVERT = "axia_panneau";
const CLE_MUET = "axia_muet";
const BOUTON_ICONE = "w-10 h-10 rounded-controle flex items-center justify-center flex-shrink-0 text-doux hover:bg-carte-2 hover:text-encre transition-colors";

// ─── État partagé (bouton de l'en-tête, barre du bas) ────────────────────────
type EtatAxia = { ouvert: boolean; compte: number };
const ETAT_INITIAL: EtatAxia = { ouvert: false, compte: 0 };
let etat = ETAT_INITIAL;
const abonnes = new Set<() => void>();
function publier(p: Partial<EtatAxia>) {
  etat = { ...etat, ...p };
  abonnes.forEach((f) => f());
}
/** Panneau ouvert ? Nombre de propositions en attente (pastille). */
export function useEtatAxia() {
  return useSyncExternalStore(
    (f) => { abonnes.add(f); return () => { abonnes.delete(f); }; },
    () => etat,
    () => ETAT_INITIAL,
  );
}
/** Ouvre le panneau AXIA ; avec une question, elle est envoyée tout de suite. */
export function ouvrirAxia(question?: string) {
  window.dispatchEvent(new CustomEvent("axia:ouvrir", { detail: { question } }));
}
export function basculerAxia() {
  window.dispatchEvent(new CustomEvent("axia:ouvrir", { detail: { basculer: true } }));
}

// Son propre à AXIA (trois notes montantes, douces), distinct du carillon
// des notifications et du son de commande.
function sonAxia() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [1047, 1319, 1568].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.4);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch { /* audio indisponible ou bloqué avant toute interaction */ }
}

function lireMuet() {
  try { return localStorage.getItem(CLE_MUET) === "1"; } catch { return false; }
}

async function decider(id: string, decision: "vu" | "accepter" | "refuser") {
  const res = await fetch("/api/axia/propositions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, decision }),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? data : { ...data, refus: res.status };
}

const ecranLarge = () => window.matchMedia("(min-width: 1024px)").matches;

export function AxiaPanneau() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { palier, openAbonnement } = useAbonnementOverlay();
  const pro = palierAuMoins(palier, "palier1");
  // Le Constructeur a son propre panneau AXIA (AxiaBuilderPanel) : pas de second panneau ici,
  // seules les demandes d'accord s'y affichent, en petite carte.
  const surConstructeur = !!pathname?.startsWith("/dashboard/builder");
  const constructeurRef = useRef(surConstructeur);
  useEffect(() => { constructeurRef.current = surConstructeur; }, [surConstructeur]);

  const [ouvert, setOuvert] = useState(false);
  const [monte, setMonte] = useState(false); // la conversation reste montée une fois ouverte
  const [question, setQuestion] = useState<string | null>(null);
  const [liste, setListe] = useState<Proposition[]>([]);
  const [bulle, setBulle] = useState<Proposition | null>(null); // demande d'accord, sur le Constructeur
  const [muet, setMuet] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [retour, setRetour] = useState<{ succes: boolean; texte: string } | null>(null);
  const annonces = useRef(new Set<string>());

  // État mémorisé sur ordinateur seulement : sur téléphone, la feuille couvrirait chaque page au chargement.
  useEffect(() => {
    setMuet(lireMuet());
    try { if (ecranLarge() && localStorage.getItem(CLE_OUVERT) === "1") setOuvert(true); } catch { /* stockage indisponible */ }
  }, []);
  useEffect(() => {
    publier({ ouvert });
    if (ouvert) setMonte(true);
    try { localStorage.setItem(CLE_OUVERT, ouvert ? "1" : "0"); } catch { /* stockage indisponible */ }
  }, [ouvert]);
  useEffect(() => { publier({ compte: liste.length }); }, [liste]);

  // Ouverture : évènement (ouvrirAxia, boutons), Ctrl/⌘+J, Échap pour fermer la feuille.
  useEffect(() => {
    const surOuvrir = (e: Event) => {
      if (constructeurRef.current) return;
      const d = (e as CustomEvent<{ question?: string; basculer?: boolean }>).detail ?? {};
      if (d.basculer) return setOuvert((v) => !v);
      setOuvert(true);
      if (d.question) setQuestion(d.question);
    };
    const clavier = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "j" && !constructeurRef.current) {
        e.preventDefault();
        setOuvert((v) => !v);
      } else if (e.key === "Escape" && !ecranLarge() && !e.defaultPrevented) setOuvert(false);
    };
    window.addEventListener("axia:ouvrir", surOuvrir);
    window.addEventListener("keydown", clavier);
    return () => { window.removeEventListener("axia:ouvrir", surOuvrir); window.removeEventListener("keydown", clavier); };
  }, []);

  // Sur téléphone, une page ouverte (lien, ouvrir_page d'AXIA, menu) referme la feuille pour la montrer.
  const pageRef = useRef(pathname);
  useEffect(() => {
    if (pageRef.current !== pathname && !ecranLarge()) setOuvert(false);
    pageRef.current = pathname;
  }, [pathname]);

  // Compatibilité des liens ?axia=<question> (notifications, liens externes, pages serveur).
  useEffect(() => {
    const demande = searchParams.get("axia");
    if (demande === null || constructeurRef.current) return;
    setOuvert(true);
    if (demande && demande !== "pro") setQuestion(demande);
    const reste = new URLSearchParams(searchParams.toString());
    reste.delete("axia");
    window.history.replaceState(null, "", reste.size ? `${pathname}?${reste}` : pathname);
  }, [searchParams, pathname]);

  const questionTraitee = useCallback(() => setQuestion(null), []);

  // ─── Propositions d'AXIA ────────────────────────────────────────────────────
  const charger = useCallback(async () => {
    try {
      const res = await fetch("/api/axia/propositions");
      if (!res.ok) return;
      const { propositions } = (await res.json()) as { propositions: Proposition[] };
      setListe(propositions);
      const nouvelle = propositions.find((p) => p.statut === "nouveau" && !annonces.current.has(p.id));
      if (!nouvelle) return;
      propositions.forEach((p) => annonces.current.add(p.id));
      if (constructeurRef.current && nouvelle.action?.confirmation) { setRetour(null); setBulle(nouvelle); }
      if (!lireMuet()) sonAxia();
      decider(nouvelle.id, "vu").catch(() => {});
    } catch { /* réseau : prochain tour */ }
  }, []);

  useEffect(() => {
    charger();
    const id = setInterval(charger, 60_000);
    const rafraichir = () => charger();
    const auRetour = () => { if (!document.hidden) charger(); };
    window.addEventListener("axia:rafraichir", rafraichir);
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      clearInterval(id);
      window.removeEventListener("axia:rafraichir", rafraichir);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [charger]);

  function retirer(id: string) {
    setListe((l) => l.filter((p) => p.id !== id));
    setBulle((b) => (b?.id === id ? null : b));
  }

  async function accepter(p: Proposition) {
    setEnCours(p.id);
    setRetour(null);
    const r = await decider(p.id, "accepter").catch(() => null);
    setEnCours(null);
    if (p.action?.confirmation) {
      const succes = !!r?.succes;
      // Le retour dit ce qui a été fait (ou pourquoi ce n'est pas fait) : le message de la demande nomme l'action et l'élément.
      setRetour({
        succes,
        texte: succes ? t("C'est fait : {0}", p.message)
          : r?.refus === 409 ? t("Cette demande a déjà été traitée (autre onglet ou double clic).")
          : !r ? t("Pas de connexion : l'action n'a pas été faite. Réessaie dans un instant.")
          : t("L'action n'a pas été faite : {0}", r.resultat || r.error || t("raison inconnue")),
      });
      setListe((l) => l.filter((x) => x.id !== p.id));
      router.refresh();
      return;
    }
    retirer(p.id);
    if (p.action?.prompt) { setOuvert(true); setQuestion(p.action.prompt); }
    // tel:, wa.me… : hors de l'application, le routeur ne sait pas les ouvrir
    else if (p.action?.lien) p.action.lien.startsWith("/") ? router.push(p.action.lien) : window.open(p.action.lien, "_blank", "noopener");
  }

  function refuser(p: Proposition) {
    retirer(p.id);
    decider(p.id, "refuser").catch(() => {});
    // Une demande d'accord refusée : on confirme que rien n'a bougé.
    if (p.action?.confirmation) setRetour({ succes: true, texte: t("Refusé : rien n'a été modifié.") });
  }

  function basculerSon() {
    const v = !muet;
    setMuet(v);
    try { localStorage.setItem(CLE_MUET, v ? "1" : "0"); } catch { /* stockage indisponible */ }
    if (!v) sonAxia();
  }

  const carte = (p: Proposition) => {
    const confirmation = !!p.action?.confirmation;
    const occupe = enCours === p.id;
    const oui = confirmation ? t("Autoriser l'action") : p.action?.prompt ? t("Oui, vas-y") : p.action?.lien ? t(p.action.libelle || "Voir") : null;
    return (
      <div key={p.id} className={`rounded-controle p-3 border ${confirmation ? "bg-attention-fond border-attention-bordure" : "bg-carte border-bordure"}`}>
        {confirmation
          ? <p className="text-[11px] font-bold uppercase tracking-wide mb-1 text-attention">{t("Ton accord est nécessaire — rien n'est encore fait")}</p>
          : <p className="text-[11px] font-bold uppercase tracking-wide mb-1 text-doux">{t("Suggestion d'AXIA")}</p>}
        <p className="text-[13px] leading-snug text-encre">{p.message}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          {oui && (
            <button onClick={() => accepter(p)} disabled={occupe}
              className="flex min-h-10 items-center gap-1.5 px-3 rounded-lg text-[12.5px] font-semibold bg-primaire text-sur-primaire hover:bg-primaire-hover disabled:opacity-60">
              {occupe ? <Loader2 size={13} className="animate-spin" /> : confirmation && <Check size={13} />}{occupe ? t("En cours…") : oui}
            </button>
          )}
          {/* Hors demande d'accord, « Plus tard » laisse la suggestion dans la liste. */}
          {(confirmation || !oui) && (
            <button onClick={() => refuser(p)} disabled={occupe}
              className="min-h-10 px-3 rounded-lg text-[12.5px] font-semibold text-doux hover:bg-black/5">
              {confirmation ? t("Refuser") : t("Merci")}
            </button>
          )}
          {oui && !confirmation && (
            <button onClick={() => refuser(p)} className="ml-auto w-10 h-10 flex items-center justify-center rounded-lg text-doux hover:bg-black/5" aria-label={t("Ignorer cette suggestion")} title={t("Ignorer cette suggestion")}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const messageRetour = retour && (
    <p role="status" className={`flex items-start gap-1.5 text-[12.5px] px-1 ${retour.succes ? "text-succes" : "text-erreur"}`}>
      {retour.succes ? <Check size={13} className="mt-0.5 flex-shrink-0" aria-hidden /> : <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" aria-hidden />}{retour.texte}
    </p>
  );

  // Constructeur : seulement la demande d'accord (ou son retour), au-dessus de son propre panneau AXIA.
  if (surConstructeur) {
    if (!(retour || bulle)) return null;
    return (
      <div className="fixed right-5 bottom-24 z-[60] w-[320px] max-w-[calc(100vw-2rem)] rounded-carte bg-carte shadow-flottante border border-bordure p-2" role="status" aria-live="polite">
        <button onClick={() => { setBulle(null); setRetour(null); }} className="absolute top-1 right-1 w-9 h-9 flex items-center justify-center rounded-md text-doux hover:bg-black/5 z-10" aria-label={t("Fermer")}><X size={13} /></button>
        {retour ? <div className="p-2 pr-8">{messageRetour}</div> : bulle && carte(bulle)}
      </div>
    );
  }

  const propositions = (liste.length > 0 || retour) && (
    <details open className="flex-shrink-0 border-b border-bordure bg-carte-2 max-h-[40vh] overflow-y-auto">
      <summary className="flex items-center gap-2 min-h-11 px-3 cursor-pointer select-none text-[12.5px] font-semibold text-encre">
        <span className="flex-1">{t("AXIA te propose")}</span>
        {liste.length > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-erreur text-white text-[11px] font-bold flex items-center justify-center">{liste.length}</span>}
        <button type="button" onClick={(e) => { e.preventDefault(); basculerSon(); }} className={BOUTON_ICONE}
          aria-label={muet ? t("Activer le son des propositions") : t("Couper le son des propositions")} title={muet ? t("Activer le son des propositions") : t("Couper le son des propositions")}>
          {muet ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </summary>
      <div className="px-3 pb-3 space-y-2" aria-live="polite">
        {messageRetour}
        {liste.map(carte)}
      </div>
    </details>
  );

  const fermer = (
    <>
      <Link href="/dashboard/axia/journal" className={BOUTON_ICONE} title={t("Journal des actions d'AXIA")} aria-label={t("Journal des actions d'AXIA")}>
        <ScrollText size={16} />
      </Link>
      <button onClick={() => setOuvert(false)} className={BOUTON_ICONE} title={t("Fermer AXIA (Ctrl+J)")} aria-label={t("Fermer AXIA")}>
        <X size={18} />
      </button>
    </>
  );

  return (
    <aside aria-label={t("AXIA, ton assistante")}
      className={`${ouvert ? "flex" : "hidden"} flex-col bg-carte fixed inset-0 z-[60] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:static lg:z-auto lg:p-0 lg:w-[380px] xl:w-[400px] lg:flex-shrink-0 lg:border-l lg:border-bordure`}>
      {pro ? (
        monte && <AxiaConversation question={question} onQuestionTraitee={questionTraitee} ouvert={ouvert} entete={fermer} propositions={propositions} />
      ) : (
        <>
          <div className="flex-shrink-0 flex items-center gap-2 px-2 pl-3 h-14 border-b border-bordure">
            <img src="/axia-icon.png" alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
            <span className="flex-1 text-encre font-bold text-sm">AXIA</span>
            {fermer}
          </div>
          {propositions}
          <div className="p-4 space-y-3">
            <p className="ax-texte">{t(MESSAGE_PRO)}</p>
            <Bouton onClick={() => openAbonnement("palier1", MESSAGE_PRO)}>{t("Passer au Palier Pro")}</Bouton>
          </div>
        </>
      )}
    </aside>
  );
}
