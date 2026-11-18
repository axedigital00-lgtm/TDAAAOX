"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, History, Sparkles, Plus, Volume2, VolumeX, Phone, Paperclip, X, Copy, Check, RotateCcw, Square } from "lucide-react";
import { renderMarkdown, parseContent } from "@/lib/axia-format";
import { useAxiaConversations } from "@/hooks/useAxiaConversations";
import { AxiaConversationSidebar } from "@/components/dashboard/AxiaConversationSidebar";
import { useT } from "@/components/I18nProvider";
import { usePathname, useRouter } from "next/navigation";
import { pageAOuvrir, ouvrirPage } from "@/lib/axia/pages";
import { ActionsAxia } from "@/components/dashboard/AxiaBulle";

interface Msg {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  imageUrl?: string;
  images?: string[];
  videos?: string[];
  audios?: string[];
  actions?: string[];
}

type VoicePhase = "idle" | "listening" | "thinking" | "speaking";

const SUGGESTIONS = [
  "Fais un rapport complet de mes ventes",
  "Quels produits risquent d'être en rupture ?",
  "Génère un post Instagram pour mes produits",
  "Quels clients relancer aujourd'hui ?",
  "Crée un code promo flash de 20% pendant 24h",
  "Résume l'activité d'aujourd'hui",
];

const THINKING_MSGS = [
  "AXIA réfléchit…",
  "AXIA analyse les données…",
  "AXIA vérifie ta boutique…",
  "AXIA prépare sa réponse…",
  "AXIA compare les options…",
  "AXIA consulte le catalogue…",
];

const THINKING_VOICE_FILLERS = [
  "Laisse-moi vérifier ça.",
  "Un instant, je regarde tes données.",
  "Je consulte ta boutique.",
  "Je jette un œil à ça tout de suite.",
];

const WAVE_HEIGHTS = Array.from({ length: 20 }, () => 8 + Math.floor(Math.random() * 28));

const PHASE_CONFIG: Record<VoicePhase, { orbGrad: string; orbShadow: string; ringColor: string }> = {
  idle:      { orbGrad: "radial-gradient(circle at 35% 35%, #333333, #111111)", orbShadow: "0 0 40px rgba(17,17,17,0.5), inset 0 1px 1px rgba(255,255,255,0.12)", ringColor: "#666666" },
  listening: { orbGrad: "radial-gradient(circle at 35% 35%, #444444, #111111)", orbShadow: "0 0 90px rgba(17,17,17,0.75), 0 0 180px rgba(17,17,17,0.35), inset 0 1px 1px rgba(255,255,255,0.2)", ringColor: "#F5A623" },
  thinking:  { orbGrad: "radial-gradient(circle at 35% 35%, #F5A623, #D4911A)", orbShadow: "0 0 60px rgba(245,166,35,0.45)", ringColor: "#F5A623" },
  speaking:  { orbGrad: "radial-gradient(circle at 35% 35%, #10b981, #059669)", orbShadow: "0 0 90px rgba(16,185,129,0.55)", ringColor: "#10b981" },
};

const BOUTON_ICONE = "w-10 h-10 rounded-controle flex items-center justify-center flex-shrink-0 text-doux hover:bg-carte-2 hover:text-encre transition-colors";

// Conversation AXIA du panneau de droite (components/dashboard/AxiaPanneau.tsx) : texte + voix,
// pièce jointe, historique multi-fils, actions avec leur état. Montée seulement pour un compte
// Palier Pro et plus (le panneau montre MESSAGE_PRO aux autres). Reste montée quand le panneau
// est fermé : la conversation en cours survit d'une page à l'autre.
export function AxiaConversation({ question, onQuestionTraitee, ouvert, entete, propositions }: {
  /** Question à envoyer tout de suite (?axia=… ou ouvrirAxia(question)). */
  question: string | null;
  onQuestionTraitee: () => void;
  ouvert: boolean;
  /** Boutons de droite de la barre (Journal, Fermer), fournis par le panneau. */
  entete: React.ReactNode;
  /** Propositions d'AXIA et demandes d'accord, en tête du panneau. */
  propositions: React.ReactNode;
}) {
  const tr = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [nomBoutique, setNomBoutique] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const [ttsOn, setTtsOn] = useState(true);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [interimText, setInterimText] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [thinkingMsgIdx, setThinkingMsgIdx] = useState(0);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const voiceScrollRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const fileRef        = useRef<HTMLInputElement>(null);
  const recognRef      = useRef<any>(null);
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  // Mode vocal : n° de la lecture en cours (une lecture plus récente rend les anciennes caduques),
  // énoncé gardé en mémoire (Chrome perd onend si l'objet est ramassé), écoute voulue (relance auto).
  const lectureRef     = useRef(0);
  const enonceRef      = useRef<SpeechSynthesisUtterance | null>(null);
  const ecouteRef      = useRef(false);
  const bestVoiceRef   = useRef<SpeechSynthesisVoice | null>(null);
  const premiumTtsFailedRef = useRef(false);
  const abortRef       = useRef<AbortController | null>(null);
  const sendRef        = useRef<(text: string) => void>(() => {});
  const voiceModeRef   = useRef(voiceMode);
  const ttsRef         = useRef(ttsOn);
  const loadingRef     = useRef(loading);
  const messagesRef    = useRef(messages);
  const activeIdRef    = useRef<string | null>(null);
  const pathnameRef    = useRef(pathname);

  const {
    conversations, activeId, loadingList,
    creerConversation, chargerConversation, sauvegarder, renommer, supprimer, setActiveId,
  } = useAxiaConversations();

  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { ttsRef.current = ttsOn; }, [ttsOn]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
  useEffect(() => {
    if (!loading) { setThinkingMsgIdx(0); return; }
    const id = setInterval(() => setThinkingMsgIdx(i => (i + 1) % THINKING_MSGS.length), 2200);
    return () => clearInterval(id);
  }, [loading]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [messages, loading, ouvert]);
  useEffect(() => { voiceScrollRef.current?.scrollTo({ top: 9999, behavior: "smooth" }); }, [messages]);
  // Panneau ouvert sur ordinateur : le curseur est prêt dans la saisie (pas sur téléphone : le clavier masquerait tout).
  useEffect(() => {
    if (ouvert && window.matchMedia("(min-width: 1024px)").matches) inputRef.current?.focus();
  }, [ouvert]);

  useEffect(() => {
    fetch("/api/tenants/moi").then(r => r.json()).then(d => setNomBoutique(d?.nomBoutique ?? null)).catch(() => {});
  }, []);

  // Sélectionne la meilleure voix française du navigateur (fallback si le TTS premium est indisponible)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const pickBestVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const fr = voices.filter(v => v.lang?.toLowerCase().startsWith("fr"));
      if (!fr.length) return;
      const scored = fr.map(v => {
        let score = 0;
        if (/google/i.test(v.name)) score += 3;
        if (/natural|neural|enhanced|premium/i.test(v.name)) score += 3;
        if (/fr-FR/i.test(v.lang)) score += 1;
        if (v.localService === false) score += 1;
        return { v, score };
      }).sort((a, b) => b.score - a.score);
      bestVoiceRef.current = scored[0]?.v ?? fr[0];
    };
    pickBestVoice();
    window.speechSynthesis.onvoiceschanged = pickBestVoice;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Persistance serveur — débouncée dans le hook
  useEffect(() => { if (activeId) sauvegarder(activeId, messages); }, [messages, activeId, sauvegarder]);

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const speakBrowserFallback = useCallback((cleanText: string, onDone?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const texte = cleanText.slice(0, 600);
    const utt = new SpeechSynthesisUtterance(texte);
    utt.lang = "fr-FR"; utt.rate = 1.08; utt.pitch = 1.03;
    if (bestVoiceRef.current) utt.voice = bestVoiceRef.current;
    // Chrome oublie parfois onend (énoncé ramassé, speak juste après cancel) : sans ce filet,
    // l'appel restait bloqué après la première réponse. ponytail: durée estimée (~15 caractères/s).
    const filet = setTimeout(() => onDone?.(), 3000 + texte.length * 70);
    const fin = () => { clearTimeout(filet); onDone?.(); };
    utt.onend = fin;
    utt.onerror = fin;
    enonceRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    const lecture = ++lectureRef.current;
    let fini = false;
    const done = onDone && (() => { if (!fini) { fini = true; onDone(); } });
    if (!ttsRef.current) { done?.(); return; }
    const cleanText = text.replace(/[*_`#>\-]/g, "").trim();
    if (!cleanText) { done?.(); return; }
    if (premiumTtsFailedRef.current) { speakBrowserFallback(cleanText, done); return; }
    (async () => {
      try {
        const res = await fetch("/api/ai/axia/voix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texte: cleanText }),
        });
        if (!res.ok) throw new Error(`tts ${res.status}`);
        const blob = await res.blob();
        // Une lecture plus récente a commencé (ex. la réponse arrive avant la phrase d'attente) :
        // on ne joue pas celle-ci, sinon deux voix se chevauchent ou AXIA parle pendant l'écoute.
        if (lecture !== lectureRef.current) { done?.(); return; }
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { URL.revokeObjectURL(url); done?.(); };
        audio.onerror = () => { URL.revokeObjectURL(url); speakBrowserFallback(cleanText, done); };
        await audio.play();
      } catch {
        premiumTtsFailedRef.current = true;
        if (lecture === lectureRef.current) speakBrowserFallback(cleanText, done);
        else done?.();
      }
    })();
  }, [speakBrowserFallback]);

  const speakThenListen = useCallback((text: string) => {
    setVoicePhase("speaking");
    // Fin de lecture ignorée si une écoute a déjà repris entre-temps (bulle touchée pendant qu'AXIA parle).
    let lecture = -1; // -1 : lecture terminée tout de suite (voix coupée), rien n'a pu la remplacer
    speak(text, () => { if (voiceModeRef.current && (lecture === -1 || lectureRef.current === lecture)) setTimeout(() => startListening(), 250); });
    lecture = lectureRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak]);

  const speakThinkingFiller = useCallback(() => {
    if (!ttsRef.current) return;
    speak(THINKING_VOICE_FILLERS[Math.floor(Math.random() * THINKING_VOICE_FILLERS.length)]);
  }, [speak]);

  // ── Envoi vers l'API (SSE) ─────────────────────────────────────────────────
  const callAI = useCallback(async (_text: string, historyBefore: Msg[], imgUrl?: string | null) => {
    if (loadingRef.current) return;
    setLoading(true);
    setInterimText("");
    abortRef.current = new AbortController();
    let firstToken = true;
    let streamingContent = "";
    let finalActions: string[] = [];

    try {
      // Le panneau est ouvert à côté d'une page : AXIA sait laquelle (seulement dans l'envoi, pas dans l'historique gardé).
      const envoyes = historyBefore.map((m, i) => ({
        role: m.role,
        content: i === historyBefore.length - 1 && m.role === "user"
          ? `[Contexte : le marchand est sur la page ${pathnameRef.current} du dashboard et te parle depuis le panneau AXIA, sans la quitter.] ${m.content}`
          : m.content,
      }));
      const res = await fetch("/api/ai/axia", {
        method: "POST",
        signal: abortRef.current.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: envoyes, imageUrl: imgUrl ?? undefined, fast: false, stream: true }),
      });
      if (!res.ok || !res.body) throw new Error(res.status === 401 ? "session" : "serveur");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let evt: any;
          try { evt = JSON.parse(line.slice(6)); } catch { continue; }
          if (evt.type === "token") {
            streamingContent += evt.text as string;
            if (firstToken) {
              firstToken = false;
              setLoading(false);
              setMessages(prev => [...prev, { role: "assistant", content: streamingContent }]);
            } else {
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], content: streamingContent };
                return next;
              });
            }
          } else if (evt.type === "done") {
            finalActions = (evt.actions as string[]) ?? [];
          } else if (evt.type === "error") {
            throw new Error((evt.text as string) || "Erreur Axia");
          }
        }
      }

      const { text: txt, images, videos, audios } = parseContent(streamingContent || "Je n'ai pas pu répondre.");
      setMessages(prev => {
        const next = [...prev];
        const msg: Msg = { role: "assistant", content: txt, images, videos, audios, actions: finalActions };
        if (!firstToken) next[next.length - 1] = msg;
        else next.push(msg);
        return next;
      });
      if (voiceModeRef.current) speakThenListen(txt);
      // ouvrir_page : AXIA amène le marchand sur la page demandée ; sinon, si elle a agi, la page se met à jour.
      const lien = pageAOuvrir(finalActions);
      if (lien) ouvrirPage(lien, router.push);
      else if (finalActions.length) router.refresh();
    } catch (err: any) {
      if (err?.name === "AbortError") {
        if (streamingContent) {
          const { text: txt, images, videos, audios } = parseContent(streamingContent);
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: txt, images, videos, audios };
            return next;
          });
        }
      } else {
        // Message lisible : ce qui s'est passé + quoi faire (jamais le texte technique brut).
        const texte = err?.message === "session"
          ? "Ta session a expiré : reconnecte-toi puis renvoie ton message."
          : err instanceof TypeError
            ? "Pas de connexion internet : vérifie ton réseau puis renvoie ton message (bouton ↻ sous ce message)."
            : "AXIA n'a pas pu terminer sa réponse. Renvoie ton message dans un instant (bouton ↻ sous ce message).";
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && !last.content) next[next.length - 1] = { role: "assistant", content: texte };
          else next.push({ role: "assistant", content: texte });
          return next;
        });
        if (voiceModeRef.current) speakThenListen("Désolée, je n'ai pas pu répondre. Tu peux répéter ?");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
      // Une action sensible a pu créer une demande d'accord : le panneau la montre tout de suite.
      window.dispatchEvent(new Event("axia:rafraichir"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakThenListen]);

  // ── Envoi utilisateur ─────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string, imgUrl?: string | null) => {
    const t = text.trim();
    if (!t || loadingRef.current) return;
    if (!activeIdRef.current) {
      const id = await creerConversation();
      activeIdRef.current = id;
    }
    const userMsg: Msg = { role: "user", content: t, imageUrl: imgUrl ?? undefined };
    const nextMessages = [...messagesRef.current, userMsg];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    if (voiceModeRef.current) { setVoicePhase("thinking"); speakThinkingFiller(); }
    callAI(t, nextMessages, imgUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callAI, speakThinkingFiller, creerConversation]);

  useEffect(() => { sendRef.current = (t) => sendMessage(t); }, [sendMessage]);

  // Question venue d'ailleurs (lien ?axia=…, « Demander à Axia », proposition acceptée).
  // Garde : un effet rejoué (mode strict en développement) ne doit pas l'envoyer deux fois.
  const questionEnvoyee = useRef<string | null>(null);
  useEffect(() => {
    if (!question) { questionEnvoyee.current = null; return; }
    if (questionEnvoyee.current === question) return;
    questionEnvoyee.current = question;
    sendRef.current(question);
    onQuestionTraitee();
  }, [question, onQuestionTraitee]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const regenerateLast = useCallback(() => {
    setMessages(prev => {
      const lastUser = [...prev].reverse().find(m => m.role === "user");
      if (!lastUser) return prev;
      const lastAssIdx = prev.map(m => m.role).lastIndexOf("assistant");
      const msgs = prev.filter((_, i) => i !== lastAssIdx);
      setTimeout(() => callAI(lastUser.content, msgs), 0);
      return msgs;
    });
  }, [callAI]);

  // ── Reconnaissance vocale ─────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!voiceModeRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setVoicePhase("idle"); return; }
    lectureRef.current++; // toute lecture en cours ou à venir devient caduque
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    try { recognRef.current?.abort(); } catch {}
    const rec = new SR();
    rec.lang = "fr-FR"; rec.continuous = false; rec.interimResults = true;
    ecouteRef.current = true;
    rec.onresult = (e: any) => {
      let interim = "", final = "";
      for (const r of e.results) {
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInterimText(interim || final);
      if (final) { ecouteRef.current = false; setInterimText(""); sendRef.current(final); }
    };
    // Chrome coupe le micro après un silence ou une phrase : tant que l'appel est ouvert et
    // qu'on attend la parole du marchand, l'écoute repart seule (comme un vrai appel).
    rec.onend = () => {
      if (recognRef.current !== rec || !voiceModeRef.current || loadingRef.current) return; // ancienne écoute remplacée
      if (ecouteRef.current) setTimeout(() => { if (ecouteRef.current && voiceModeRef.current) startListening(); }, 300);
      else setVoicePhase(p => (p === "listening" ? "idle" : p));
    };
    // Micro refusé ou absent : inutile de relancer en boucle.
    rec.onerror = (e: any) => { if (e?.error === "not-allowed" || e?.error === "service-not-allowed" || e?.error === "audio-capture") { ecouteRef.current = false; setVoicePhase("idle"); } };
    recognRef.current = rec;
    setVoicePhase("listening");
    setInterimText("");
    try { rec.start(); } catch { /* déjà en cours */ }
  }, []);

  const stopListening = useCallback(() => {
    ecouteRef.current = false;
    recognRef.current?.stop();
    setVoicePhase("idle");
    setInterimText("");
  }, []);

  const openVoiceMode = () => {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    setVoiceMode(true);
    setVoicePhase("idle");
    setTimeout(() => startListening(), 600);
  };
  const closeVoiceMode = () => {
    stopListening();
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    setVoiceMode(false);
    setVoicePhase("idle");
    setInterimText("");
  };
  const handleOrbTap = () => {
    if (voicePhase === "speaking") { window.speechSynthesis?.cancel(); audioRef.current?.pause(); setTimeout(() => startListening(), 200); }
    else if (voicePhase === "listening") stopListening();
    else if (voicePhase === "idle") startListening();
  };

  // ── Pièce jointe ──────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPendingImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const autoGrowInput = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const handleSendChat = () => {
    const t = input.trim();
    if ((!t && !pendingImage) || loading) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    const img = pendingImage;
    setPendingImage(null);
    if (t) sendMessage(t, img);
  };

  // ── Conversations ─────────────────────────────────────────────────────────
  async function ouvrirConversation(id: string) {
    setActiveId(id);
    setHistoriqueOuvert(false);
    const conv = await chargerConversation(id);
    setMessages(conv?.messages ?? []);
  }
  function nouvelleConversation() {
    setActiveId(null);
    setMessages([]);
    setHistoriqueOuvert(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }
  async function supprimerConversation(id: string) {
    await supprimer(id);
    if (activeIdRef.current === id) { setActiveId(null); setMessages([]); }
  }

  const isEmpty = messages.length === 0;
  const phase = PHASE_CONFIG[voicePhase];
  const isOrb = voicePhase === "listening" || voicePhase === "speaking";

  return (
    <div className="relative flex-1 flex flex-col min-h-0">

      {/* ── Mode vocal plein écran ─────────────────────────────────────────── */}
      {voiceMode && (
        <div className="fixed inset-0 z-[9990] flex flex-col select-none"
          style={{ background: "radial-gradient(ellipse at 50% 38%, #2a2a2a 0%, #060606 100%)" }}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            {[180, 260, 340, 430].map((s, i) => (
              <div key={i} className="absolute rounded-full border"
                style={{ width: s, height: s, borderColor: phase.ringColor, opacity: isOrb ? 0.22 - i * 0.04 : 0.06,
                  animation: isOrb ? `axiaRing ${2.4 + i * 0.5}s ${i * 0.3}s ease-in-out infinite` : undefined,
                  transition: "opacity 0.6s" }} />
            ))}
          </div>

          <div className="absolute top-5 right-5 flex gap-2 z-20">
            <button onClick={() => setTtsOn(v => !v)} aria-label={ttsOn ? tr("Couper la voix d'AXIA") : tr("Activer la voix d'AXIA")} aria-pressed={ttsOn}
              className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
              {ttsOn ? <Volume2 size={16} className="text-white/70" /> : <VolumeX size={16} className="text-white/30" />}
            </button>
            <button onClick={closeVoiceMode} type="button" aria-label={tr("Quitter le mode vocal")}
              className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
              <X size={18} className="text-white/70" />
            </button>
          </div>

          {messages.length > 0 && (
            <div ref={voiceScrollRef}
              className="absolute top-0 left-0 right-0 bottom-[380px] overflow-y-auto px-5 pt-16 pb-4 flex flex-col justify-end gap-2 z-10 pointer-events-none">
              {messages.slice(-6).map((m, i) => {
                const { text } = parseContent(m.content);
                if (!text) return null;
                return (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                      style={m.role === "user"
                        ? { background: "rgba(245,166,35,0.18)", color: "rgba(255,255,255,0.92)", border: "1px solid rgba(245,166,35,0.25)" }
                        : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {tr(text)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 h-[380px] flex flex-col items-center justify-center gap-6">
            <div onClick={handleOrbTap} role="button" tabIndex={0} aria-label={tr("Parler ou interrompre AXIA")}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleOrbTap(); } }}
              className="relative w-36 h-36 rounded-full flex items-center justify-center cursor-pointer p-2"
              style={{ background: phase.orbGrad, boxShadow: phase.orbShadow,
                transform: voicePhase === "listening" ? "scale(1.1)" : voicePhase === "speaking" ? "scale(1.05)" : "scale(1)",
                transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
              {voicePhase === "thinking"
                ? <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                : (
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/25">
                    <img src="/axia-icon.png" alt={tr("Axia")} className="w-full h-full object-cover" />
                  </div>
                )}
              {voicePhase === "listening" && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <Mic size={14} className="text-[#111111]" />
                </div>
              )}
              {voicePhase === "speaking" && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <Volume2 size={14} className="text-emerald-600" />
                </div>
              )}
            </div>

            {voicePhase === "listening" && (
              <div className="flex items-end justify-center gap-[3px] h-12">
                {WAVE_HEIGHTS.map((h, i) => (
                  <div key={i} className="rounded-full"
                    style={{ width: 3, height: h, background: "linear-gradient(to top, #F5A623, #FFD280)",
                      animation: `axiaWave ${0.5 + (i % 4) * 0.2}s ${i * 0.06}s ease-in-out infinite alternate` }} />
                ))}
              </div>
            )}
            {voicePhase === "speaking" && (
              <div className="flex items-center justify-center gap-[4px] h-12">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-full"
                    style={{ width: 4, background: "linear-gradient(to top, #10b981, #6ee7b7)",
                      animation: `axiaSpeak ${0.7 + (i % 3) * 0.3}s ${i * 0.09}s ease-in-out infinite alternate`,
                      height: 8 + (i % 6) * 7 }} />
                ))}
              </div>
            )}

            <p className="text-white/50 text-sm text-center px-8 max-w-sm min-h-[1.5em]">
              {tr(interimText) || (
                voicePhase === "idle" ? tr("Touche l'orbe pour parler")
                : voicePhase === "listening" ? tr("Je t'écoute…")
                : voicePhase === "speaking" ? tr("Touche l'orbe pour interrompre")
                : tr("Traitement en cours…")
              )}
            </p>
          </div>

          <style>{`
            @keyframes axiaRing { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
            @keyframes axiaWave { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
            @keyframes axiaSpeak { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
          `}</style>
        </div>
      )}

      {/* ── Historique des conversations : par-dessus la conversation, dans le panneau ── */}
      {historiqueOuvert && (
        <div className="absolute inset-0 z-20 bg-carte flex flex-col">
          <AxiaConversationSidebar
            conversations={conversations} activeId={activeId} loading={loadingList}
            onSelect={ouvrirConversation} onNew={nouvelleConversation}
            onDelete={supprimerConversation} onRename={renommer} onClose={() => setHistoriqueOuvert(false)}
          />
        </div>
      )}

      {/* Barre du panneau */}
      <div className="flex-shrink-0 flex items-center gap-0.5 px-2 h-14 border-b border-bordure">
        <button onClick={() => setHistoriqueOuvert(true)} className={BOUTON_ICONE}
          title={tr("Historique des conversations")} aria-label={tr("Historique des conversations")} aria-expanded={historiqueOuvert}>
          <History size={17} />
        </button>
        <button onClick={nouvelleConversation} className={BOUTON_ICONE}
          title={tr("Nouvelle conversation")} aria-label={tr("Nouvelle conversation")}>
          <Plus size={17} />
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1 px-1">
          <img src="/axia-icon.png" alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
          <span className="text-encre font-bold text-sm">AXIA</span>
        </div>
        <button onClick={openVoiceMode} className={BOUTON_ICONE}
          title={tr("Parler à AXIA (mode vocal)")} aria-label={tr("Parler à AXIA (mode vocal)")}>
          <Phone size={16} />
        </button>
        {entete}
      </div>

      {propositions}

      {/* ── Conversation ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 min-h-0">
        {isEmpty && (
          <div className="px-1 pt-2">
            <p className="text-base font-bold text-encre">{nomBoutique ? tr("Bonjour, {0}", nomBoutique) : tr("Bonjour")}</p>
            <p className="ax-texte-secondaire mt-0.5 mb-4">{tr("Que veux-tu faire pour ta boutique aujourd'hui ?")}</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="flex items-center gap-2 text-left min-h-10 px-3 py-2 rounded-controle border border-bordure bg-carte text-[13px] text-encre hover:border-bordure-forte hover:bg-carte-2 transition-colors">
                  <Sparkles size={13} className="flex-shrink-0 text-primaire" aria-hidden />
                  {tr(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const { text, images: pImgs, videos: pVids } = parseContent(m.content);
          const allImages = [...(pImgs ?? []), ...(m.images ?? [])];
          const allVideos = [...(pVids ?? []), ...(m.videos ?? [])];
          const isLast = i === messages.length - 1;
          return (
            <div key={i} className={`flex flex-col gap-1.5 min-w-0 break-words ${m.role === "user" ? "items-end" : "items-start"}`}>
              {m.imageUrl && (
                <div className="rounded-controle overflow-hidden border border-bordure" style={{ maxWidth: 180 }}>
                  <img src={m.imageUrl} alt="" className="w-full object-cover" />
                </div>
              )}
              {text && (
                <div className={`rounded-carte px-3.5 py-2.5 text-[13.5px] leading-relaxed max-w-[92%] ${m.role === "user"
                  ? "bg-secondaire text-white rounded-br-md"
                  : "bg-carte-2 border border-bordure text-encre rounded-bl-md"}`}>
                  {m.role === "assistant"
                    ? <div className="axia-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(text || (m.streaming ? "" : m.content)) }} />
                    : <span className="whitespace-pre-wrap">{tr(text)}</span>}
                </div>
              )}
              {allImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allImages.map((src, j) => <img key={j} src={src} alt="" className="rounded-controle max-w-[180px]" loading="lazy" />)}
                </div>
              )}
              {allVideos.map((src, j) => <video key={j} src={src} controls className="rounded-controle max-w-full max-h-56" />)}
              {/* Chaque action avec son état : fait, en attente de ton accord, non fait, page ouverte. */}
              <div className="w-full"><ActionsAxia actions={m.actions} /></div>
              {m.role === "assistant" && text && !m.streaming && (
                <div className="flex gap-1">
                  <button onClick={() => { navigator.clipboard.writeText(text); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1500); }}
                    className={BOUTON_ICONE} title={tr("Copier la réponse")} aria-label={copiedIdx === i ? tr("Réponse copiée") : tr("Copier la réponse")}>
                    {copiedIdx === i ? <Check size={14} className="text-succes" /> : <Copy size={14} />}
                  </button>
                  {isLast && !loading && (
                    <button onClick={regenerateLast} className={BOUTON_ICONE} title={tr("Refaire la réponse")} aria-label={tr("Refaire la réponse")}>
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2.5 rounded-carte px-3.5 py-2.5 bg-carte-2 border border-bordure w-fit" role="status">
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map(j => (
                <div key={j} className="w-1.5 h-1.5 rounded-full bg-primaire" style={{ animation: `xdot 1s ${j * 0.18}s ease-in-out infinite` }} />
              ))}
            </div>
            <span className="text-[12px] text-doux">{tr(THINKING_MSGS[thinkingMsgIdx])}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Saisie — texte, pièce jointe, envoi/stop ── */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-bordure">
        {pendingImage && (
          <div className="mb-2 relative inline-block">
            <img src={pendingImage} alt="" className="h-16 rounded-controle border border-bordure" />
            <button onClick={() => setPendingImage(null)}
              aria-label={tr("Retirer l'image")} className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-secondaire text-white flex items-center justify-center">
              <X size={11} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-1 rounded-carte border border-bordure bg-carte px-1.5 py-1.5 focus-within:border-primaire transition-colors">
          <button onClick={() => fileRef.current?.click()} className={BOUTON_ICONE} title={tr("Joindre une image")} aria-label={tr("Joindre une image")}>
            <Paperclip size={15} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={e => { setInput(e.target.value); autoGrowInput(e.target); }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
            placeholder={tr("Demande n'importe quoi à AXIA…")}
            aria-label={tr("Message pour AXIA")}
            disabled={loading}
            className="flex-1 bg-transparent text-base lg:text-sm text-encre outline-none placeholder:text-discret resize-none py-2 leading-relaxed min-w-0"
            style={{ maxHeight: 140 }}
          />
          {loading ? (
            <button onClick={stopGeneration}
              className="w-10 h-10 rounded-controle flex items-center justify-center flex-shrink-0 bg-erreur text-white" title={tr("Arrêter la réponse")} aria-label={tr("Arrêter la réponse")}>
              <Square size={11} fill="currentColor" />
            </button>
          ) : (
            <button onClick={handleSendChat} disabled={!input.trim() && !pendingImage} aria-label={tr("Envoyer le message")}
              className="w-10 h-10 rounded-controle flex items-center justify-center flex-shrink-0 bg-primaire text-sur-primaire hover:bg-primaire-hover disabled:bg-carte-2 disabled:text-discret transition-colors">
              <Send size={15} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes xdot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}
        .axia-md .axia-p{margin:0 0 8px}
        .axia-md .axia-p:last-child{margin-bottom:0}
        .axia-md .axia-h1,.axia-md .axia-h2,.axia-md .axia-h3{font-weight:700;margin:10px 0 4px;color:var(--ax-encre)}
        .axia-md .axia-ul{margin:4px 0 8px;padding-left:18px}
        .axia-md .axia-li{margin:2px 0}
        .axia-md .axia-link{color:var(--ax-encre);text-decoration:underline;text-decoration-color:var(--ax-primaire);text-underline-offset:2px}
        .axia-md .axia-inline-code{background:rgba(0,0,0,0.06);padding:1px 5px;border-radius:5px;font-size:0.85em}
        .axia-md .axia-pre{background:var(--ax-carte);border:1px solid var(--ax-bordure);border-radius:10px;padding:10px 12px;overflow-x:auto;margin:6px 0}
        .axia-md .axia-bq{border-left:2px solid var(--ax-primaire);padding-left:10px;color:var(--ax-doux);margin:6px 0}
      `}</style>
    </div>
  );
}
