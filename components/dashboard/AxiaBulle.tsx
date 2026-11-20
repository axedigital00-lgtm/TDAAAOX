"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X, Volume2, VolumeX, MessageCircle, Check, Loader2, Send } from "lucide-react";
import { AxiaMark } from "@/components/dashboard/design-system/icons/Icon";
import { useT } from "@/components/I18nProvider";
import { useAbonnementOverlay } from "@/components/dashboard/AbonnementOverlayProvider";
import { palierAuMoins } from "@/lib/plans";
import { pageAOuvrir, ouvrirPage } from "@/lib/axia/pages";

// Stella dans le dashboard : Stella y prend la parole d'elle-même (constats sur la
// boutique, rappels) et y demande l'accord du marchand avant toute action
// sensible. Données : app/api/axia/propositions.
// Son panneau latéral (MASTERPROMPT §10) sert à discuter avec Stella sans quitter
// la page. Il s'ouvre par l'évènement « axia:assister » (dock Stella, barre mobile,
// liens contextuels) ; `detail.question` est alors envoyée directement.

type Action = { prompt?: string; lien?: string; libelle?: string; confirmation?: boolean } | null;
interface Proposition { id: string; type: string; message: string; action: Action; statut: string }

export const MESSAGE_PRO = "Stella, ton associée qui surveille ta boutique et te propose des actions, est disponible à partir du Palier Pro.";
const CLE_MUET = "axia_muet";

// Son propre à Stella (trois notes montantes, douces), distinct du carillon
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
  return res.ok ? res.json() : null;
}

export function AxiaBulle() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { palier, openAbonnement } = useAbonnementOverlay();
  // Palier Essentiel : Stella est réservé au Pro — la bulle ne fait qu'inviter à passer au Pro.
  const pro = palierAuMoins(palier, "palier1");
  const [liste, setListe] = useState<Proposition[]>([]);
  const [bulle, setBulle] = useState<Proposition | null>(null); // prise de parole affichée
  const [panneau, setPanneau] = useState(false);
  const [muet, setMuet] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [retour, setRetour] = useState<{ succes: boolean; texte: string } | null>(null);
  const annonces = useRef(new Set<string>());
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [saisie, setSaisie] = useState("");
  const [reflechit, setReflechit] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  // Le Constructeur a sa propre bulle Stella au même endroit : ici, seules les demandes
  // d'accord s'affichent (au-dessus d'elle) ; les constats attendent la sortie du Constructeur.
  const surConstructeur = !!pathname?.startsWith("/dashboard/builder");
  const constructeurRef = useRef(surConstructeur);
  useEffect(() => { constructeurRef.current = surConstructeur; }, [surConstructeur]);

  useEffect(() => { setMuet(lireMuet()); }, []);

  const charger = useCallback(async () => {
    try {
      const res = await fetch("/api/axia/propositions");
      if (!res.ok) return;
      const { propositions } = (await res.json()) as { propositions: Proposition[] };
      setListe(propositions);
      const nouvelle = propositions.find((p) => p.statut === "nouveau" && !annonces.current.has(p.id)
        && (!constructeurRef.current || p.type === "confirmation"));
      if (!nouvelle) return;
      propositions.forEach((p) => { if (!constructeurRef.current || p.type === "confirmation") annonces.current.add(p.id); });
      setRetour(null);
      setBulle(nouvelle);
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

  // Compteur pour le bouton Stella de la barre du bas (mobile).
  useEffect(() => { window.dispatchEvent(new CustomEvent("axia:compte", { detail: liste.length })); }, [liste]);

  const envoyerRef = useRef<(texte?: string) => void>(() => {});
  useEffect(() => {
    const assister = (e: Event) => {
      if (!pro) return openAbonnement("palier1", MESSAGE_PRO);
      setPanneau(true);
      setBulle(null);
      const question = (e as CustomEvent<{ question?: string } | undefined>).detail?.question;
      if (question?.trim()) envoyerRef.current(question);
    };
    window.addEventListener("axia:assister", assister);
    return () => window.removeEventListener("axia:assister", assister);
  }, [pro, openAbonnement]);

  useEffect(() => { finRef.current?.scrollIntoView({ block: "end" }); }, [messages, reflechit, panneau]);
  // Le cadre de l'admin (DashboardShell) réserve la place du panneau et réduit la barre latérale.
  useEffect(() => { window.dispatchEvent(new CustomEvent("axia:panneau", { detail: panneau })); }, [panneau]);

  async function envoyer(texte?: string) {
    const contenu = (texte ?? saisie).trim();
    if (!contenu || reflechit) return;
    const historique = [...messages, { role: "user" as const, content: contenu }];
    setMessages(historique);
    setSaisie("");
    setReflechit(true);
    try {
      const envoyes = historique.map((m, i) => i === historique.length - 1
        ? { ...m, content: `[Contexte : le marchand est sur la page ${pathname} du dashboard et te parle depuis la fenêtre Stella, sans la quitter.] ${m.content}` }
        : m);
      const res = await fetch("/api/ai/axia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: envoyes, stream: false, fast: false }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reponse || t("Je n'ai pas pu traiter cette demande.") }]);
      // Stella a pu agir (produit, promo…) : la page et les propositions se mettent à jour.
      router.refresh();
      charger();
      // ouvrir_page : Stella amène le marchand sur la page demandée, la fenêtre reste ouverte.
      const lien = pageAOuvrir(data.actions);
      if (lien) ouvrirPage(lien, router.push);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: t("Stella a rencontré une erreur momentanée — réessaie dans un instant.") }]);
    } finally {
      setReflechit(false);
    }
  }
  envoyerRef.current = envoyer;

  function retirer(id: string) {
    setListe((l) => l.filter((p) => p.id !== id));
    setBulle((b) => (b?.id === id ? null : b));
  }

  function demanderAxia(prompt: string) {
    if (pathname === "/dashboard") window.dispatchEvent(new CustomEvent("axia:demander", { detail: prompt }));
    else router.push(`/dashboard?axia=${encodeURIComponent(prompt)}`);
  }

  async function accepter(p: Proposition) {
    setEnCours(p.id);
    const r = await decider(p.id, "accepter").catch(() => null);
    setEnCours(null);
    if (p.action?.confirmation) {
      const succes = !!r?.succes;
      setRetour({ succes, texte: succes ? t("C'est fait.") : r?.resultat || t("L'action n'a pas pu être faite.") });
      setListe((l) => l.filter((x) => x.id !== p.id));
      return;
    }
    retirer(p.id);
    setPanneau(false);
    if (p.action?.prompt) demanderAxia(p.action.prompt);
    // tel:, wa.me… : hors de l'application, le routeur ne sait pas les ouvrir
    else if (p.action?.lien) p.action.lien.startsWith("/") ? router.push(p.action.lien) : window.open(p.action.lien, "_blank", "noopener");
  }

  function refuser(p: Proposition) {
    retirer(p.id);
    decider(p.id, "refuser").catch(() => {});
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
    const oui = confirmation ? t("Autoriser") : p.action?.prompt ? t("Oui, vas-y") : p.action?.lien ? t(p.action.libelle || "Voir") : null;
    return (
      <div key={p.id} className="axd-axia-card" data-confirmation={confirmation || undefined}>
        {confirmation && <p className="axd-axia-card__tag">{t("Ton accord est nécessaire")}</p>}
        <p style={{ margin: 0, color: "var(--color-text-strong)" }}>{p.message}</p>
        <div className="axd-axia-card__actions">
          {oui && (
            <button onClick={() => accepter(p)} disabled={occupe} className="axd-btn axd-btn--primary axd-btn--sm">
              {occupe ? <Loader2 size={12} className="animate-spin" /> : confirmation && <Check size={12} />}{oui}
            </button>
          )}
          <button onClick={() => (oui && !confirmation ? (setBulle(null), setPanneau(false)) : refuser(p))} disabled={occupe}
            className="axd-btn axd-btn--ghost axd-btn--sm">
            {confirmation ? t("Refuser") : oui ? t("Plus tard") : t("Merci")}
          </button>
          {oui && !confirmation && (
            <button onClick={() => refuser(p)} className="axd-icon-btn" style={{ marginLeft: "auto" }} aria-label={t("Ignorer")} title={t("Ignorer")}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    );
  };

  if (surConstructeur) {
    if (!(retour || bulle?.action?.confirmation)) return null;
    return (
      <div className="ax-admin axd-axia-bubble" style={{ bottom: 96 }} role="status" aria-live="polite">
        <button onClick={() => { setBulle(null); setRetour(null); }} className="axd-icon-btn axd-axia-bubble__x" aria-label={t("Fermer")}><X size={12} /></button>
        {retour
          ? <p className="axd-axia-retour" data-succes={retour.succes}>{retour.texte}</p>
          : bulle && carte(bulle)}
      </div>
    );
  }

  return (
    <div className="ax-admin">
      {panneau && (
        <aside className="axd-axia-drawer" aria-label="Stella">
          <div className="axd-axia-drawer__head">
            <AxiaMark />
            <span style={{ flex: 1 }}>Stella</span>
            <button onClick={basculerSon} className="axd-icon-btn" aria-label={muet ? t("Activer le son") : t("Couper le son")} title={muet ? t("Activer le son") : t("Couper le son")}>
              {muet ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button onClick={() => setPanneau(false)} className="axd-icon-btn" aria-label={t("Fermer")}><X size={16} /></button>
          </div>
          <div className="axd-axia-drawer__msgs" aria-live="polite">
            {retour && <p className="axd-axia-retour" data-succes={retour.succes}>{retour.texte}</p>}
            {liste.map(carte)}
            {!liste.length && !messages.length && <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>{t("Rien à signaler pour le moment. Pose-moi une question ou demande-moi d'agir, sans quitter cette page.")}</p>}
            {messages.map((m, i) => (
              <div key={i} className={`axd-axia-msg axd-axia-msg--${m.role === "user" ? "me" : "ai"}`}>{m.content}</div>
            ))}
            {reflechit && <div className="axd-axia-msg axd-axia-msg--ai" style={{ color: "var(--color-text-subdued)" }}><Loader2 size={13} className="animate-spin" style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />{t("Stella analyse…")}</div>}
            <div ref={finRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); envoyer(); }} className="axd-axia-drawer__in">
            <textarea value={saisie} onChange={(e) => setSaisie(e.target.value)} disabled={reflechit} autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
              placeholder={t("Demandez à Stella…")} aria-label={t("Message pour Stella")} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              {pathname !== "/dashboard" && (
                <button type="button" className="axd-btn axd-btn--plain axd-btn--sm" onClick={() => { setPanneau(false); if (pro) router.push("/dashboard"); else openAbonnement("palier1", MESSAGE_PRO); }}>
                  <MessageCircle size={13} /> {t("Ouvrir en plein écran")}
                </button>
              )}
              <button type="submit" disabled={reflechit || !saisie.trim()} className="axd-btn axd-btn--primary axd-btn--sm" style={{ marginLeft: "auto" }}>
                <Send size={13} />{t("Envoyer")}
              </button>
            </div>
          </form>
        </aside>
      )}
      {!panneau && (bulle || retour) && (
        <div className="axd-axia-bubble" role="status" aria-live="polite">
          <button onClick={() => { setBulle(null); setRetour(null); }} className="axd-icon-btn axd-axia-bubble__x" aria-label={t("Fermer")}><X size={12} /></button>
          {retour
            ? <p className="axd-axia-retour" data-succes={retour.succes}>{retour.texte}</p>
            : bulle && carte(bulle)}
        </div>
      )}
    </div>
  );
}
