"use client";
import { PageHeader, Tabs, buttonClasses } from "@/components/ui/adm";
import { useState, useRef, useEffect } from "react";
import {
  Video, Mic, FileText, Zap, Loader2, Play, Download,
  Pause, RefreshCw, Sparkles, ChevronDown, Copy, Check,
  Film, Volume2, Camera, Share2, BookOpen, Package, Megaphone
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";

// ─── Types ────────────────────────────────────────────────────────
type TabId = "video" | "voix" | "script" | "ugc";

const TABS: { id: TabId; icon: any; label: string; desc: string }[] = [
  { id: "video",  icon: Film,     label: "Vidéo IA",   desc: "Génère des vidéos produit en quelques secondes" },
  { id: "voix",   icon: Mic,      label: "Voix off IA", desc: "Voix professionnelle pour vos contenus" },
  { id: "script", icon: FileText, label: "Scripts",    desc: "Scripts pub, démo, email et plus" },
  { id: "ugc",    icon: Sparkles, label: "UGC & Ads",  desc: "Contenu authentique style créateur" },
];

const VIDEO_STYLES = [
  { id: "product", label: "Produit", Icon: Package,  desc: "Fond blanc, studio pro" },
  { id: "ugc",     label: "UGC",    Icon: Camera,   desc: "Style créateur authentique" },
  { id: "ad",      label: "Pub",    Icon: Megaphone,desc: "Dynamique, conversion" },
  { id: "demo",    label: "Démo",   Icon: Film,     desc: "Démonstration produit" },
];

const SCRIPT_TYPES = [
  { id: "pub_30s",    label: "Pub 30s",       plateformes: ["instagram", "tiktok"] },
  { id: "pub_15s",    label: "Pub 15s",       plateformes: ["instagram", "tiktok"] },
  { id: "ugc_60s",    label: "UGC 60s",       plateformes: ["tiktok", "youtube"] },
  { id: "demo_produit", label: "Démo produit", plateformes: ["facebook", "youtube"] },
  { id: "email_vente",  label: "Email vente",  plateformes: ["email"] },
  { id: "description",  label: "Description",  plateformes: ["boutique"] },
];

// ─── Tab Vidéo IA ─────────────────────────────────────────────────
function TabVideo() {
  const tr = useT();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("product");
  const [duree, setDuree] = useState<"5s"|"10s">("5s");
  const [ratio, setRatio] = useState<"16:9"|"9:16"|"1:1">("16:9");
  const [generating, setGenerating] = useState(false);
  const [videoId, setVideoId] = useState<string|null>(null);
  const [video, setVideo] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const pollStatus = (id: string) => {
    intervalRef.current = setInterval(async () => {
      const res = await fetch(`/api/ai/video?videoId=${id}`);
      const data = await res.json();
      if (data.progress) setProgress(Math.round(data.progress * 100));
      if (data.statut === "pret") {
        setVideo(data);
        setProgress(100);
        clearInterval(intervalRef.current);
        toast.success(tr("Vidéo générée !"));
      } else if (data.statut === "erreur") {
        toast.error(tr(data.erreur) || tr("Erreur génération"));
        setGenerating(false);
        clearInterval(intervalRef.current);
      }
    }, 4000);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  async function generer() {
    if (!prompt.trim()) { toast.error(tr("Décrivez votre vidéo")); return; }
    setGenerating(true);
    setVideo(null);
    setProgress(5);
    try {
      const res = await fetch("/api/ai/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, duree, ratio }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) {
          toast.error(tr(data.message));
          window.open(data.signup, "_blank");
        } else {
          toast.error(tr(data.message) || tr("Erreur"));
        }
        setGenerating(false);
        return;
      }
      setVideoId(data.videoId);
      pollStatus(data.videoId);
    } catch { toast.error(tr("Erreur réseau")); setGenerating(false); }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Config */}
      <div className="space-y-5">
        <div>
          <label className="text-(--color-text-secondary) text-sm font-medium block mb-2">{tr("Décrivez votre vidéo")}</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
            placeholder={tr("Ex: Sac à main en cuir marron pour femme, montrez les détails du cuir, les coutures et la fermeture dorée...")}
            className="w-full bg-(--color-surface-secondary) border border-(--color-border) rounded-xl px-4 py-3 text-(--color-text-strong) text-sm focus:outline-none focus:border-(--color-border-strong) resize-none" />
        </div>

        <div>
          <label className="text-(--color-text-secondary) text-sm font-medium block mb-2">{tr("Style")}</label>
          <div className="grid grid-cols-2 gap-2">
            {VIDEO_STYLES.map(s => (
              <button key={s.id} onClick={() => setStyle(s.id)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${style === s.id ? "border-(--color-border-strong) bg-(--color-surface-selected)" : "border-(--color-border) bg-(--color-surface) hover:border-(--color-border-input)"}`}>
                <s.Icon size={20} className={style === s.id ? "text-(--color-magic-text)" : "text-(--color-text-subdued)"} />
                <div>
                  <p className="text-sm font-semibold text-(--color-text)">{tr(s.label)}</p>
                  <p className="text-[11px] text-(--color-text-subdued)">{tr(s.desc)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-(--color-text-secondary) text-sm font-medium block mb-2">{tr("Durée")}</label>
            <div className="flex gap-2">
              {(["5s", "10s"] as const).map(d => (
                <button key={d} onClick={() => setDuree(d)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${duree === d ? "bg-(--color-primary) text-white border-(--color-border-strong)" : "bg-(--color-surface) border-(--color-border) text-(--color-text-secondary) hover:border-(--color-border-input)"}`}>
                  {tr(d)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-(--color-text-secondary) text-sm font-medium block mb-2">{tr("Format")}</label>
            <div className="flex gap-2">
              {(["16:9", "9:16", "1:1"] as const).map(r => (
                <button key={r} onClick={() => setRatio(r)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${ratio === r ? "bg-(--color-primary) text-white border-(--color-border-strong)" : "bg-(--color-surface) border-(--color-border) text-(--color-text-secondary) hover:border-(--color-border-input)"}`}>
                  {tr(r)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={generer} disabled={generating || !prompt.trim()}
          className={buttonClasses({ variant: "primary", fullWidth: true, className: "h-10! gap-2" })}>
          {generating ? <><Loader2 size={16} className="animate-spin" />{" "}{tr("Génération en cours…")}</> : <><Film size={16} />{" "}{tr("Générer la vidéo")}</>}
        </button>

        <p className="text-center text-xs text-(--color-text-subdued)">
          {tr("Génération vidéo IA haute définition")}
        </p>
      </div>

      {/* Preview */}
      <div className="flex flex-col">
        <div className="aspect-video bg-(--color-primary) rounded-xl overflow-hidden flex items-center justify-center relative">
          {!generating && !video && (
            <div className="text-center">
              <Film size={40} className="text-(--color-text-secondary) mx-auto mb-3" />
              <p className="text-(--color-text-secondary) text-sm">{tr("Votre vidéo apparaîtra ici")}</p>
            </div>
          )}
          {generating && !video && (
            <div className="text-center space-y-4 px-8 w-full">
              <Loader2 size={40} className="text-(--color-magic-text) animate-spin mx-auto" />
              <div>
                <p className="text-white text-sm font-medium mb-2">{tr("Génération en cours…")}</p>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: "var(--chart-primary)" }} />
                </div>
                <p className="text-(--color-text-subdued) text-xs mt-2">{progress}{tr("% · ~30-60 secondes")}</p>
              </div>
            </div>
          )}
          {video?.videoUrl && (
            <video src={video.videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
          )}
        </div>

        {video?.videoUrl && (
          <div className="mt-4 flex gap-3">
            <a href={video.videoUrl} download target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-(--color-primary) text-white rounded-xl text-sm font-semibold hover:bg-(--color-primary-hover) transition-all">
              <Download size={14} />{" "}{tr("Télécharger")}
            </a>
            <button onClick={() => { setVideo(null); setVideoId(null); setGenerating(false); setProgress(0); }}
              className="px-4 py-2.5 bg-(--color-surface-tertiary) text-(--color-text-secondary) rounded-xl text-sm hover:bg-(--color-tint-hover) transition-all">
              <RefreshCw size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab Voix Off ─────────────────────────────────────────────────
function TabVoixOff() {
  const tr = useT();
  const [texte, setTexte] = useState("");
  const [voixId, setVoixId] = useState("Kore");
  const [voix, setVoix] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string|null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetch("/api/ai/voix-off").then(r => r.json()).then(d => setVoix(d.voix || []));
  }, []);

  async function generer() {
    if (!texte.trim()) { toast.error(tr("Entrez du texte")); return; }
    setGenerating(true);
    setAudioUrl(null);
    try {
      const res = await fetch("/api/ai/voix-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte, voixId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) { toast.error(tr(data.message)); window.open(data.signup, "_blank"); }
        else toast.error(tr(data.message));
        return;
      }
      setAudioUrl(data.audioUrl);
      toast.success(tr("Voix générée !"));
    } catch { toast.error(tr("Erreur réseau")); }
    finally { setGenerating(false); }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-(--color-text-secondary) text-sm font-medium">{tr("Texte à vocaliser")}</label>
            <span className="text-xs text-(--color-text-subdued)">{texte.length}/5000 caractères</span>
          </div>
          <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={6}
            placeholder={tr("Ex: Découvrez notre nouvelle collection de sacs en cuir artisanal. Qualité premium, livraison rapide dans toute l'Afrique de l'Ouest...")}
            className="w-full bg-(--color-surface-secondary) border border-(--color-border) rounded-xl px-4 py-3 text-(--color-text-strong) text-sm focus:outline-none focus:border-(--color-border-strong) resize-none" />
        </div>

        <div>
          <label className="text-(--color-text-secondary) text-sm font-medium block mb-2">{tr("Voix")}</label>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {voix.map(v => (
              <button key={v.id} onClick={() => setVoixId(v.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${voixId === v.id ? "border-(--color-border-strong) bg-(--color-surface-selected)" : "border-(--color-border-secondary) bg-(--color-surface) hover:border-(--color-border)"}`}>
                <div className="w-8 h-8 rounded-full bg-(--color-primary) flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {tr(v.nom[0])}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-(--color-text)">{tr(v.nom)}</p>
                  <p className="text-xs text-(--color-text-subdued)">{v.style} · {v.genre === "F" ? tr("Féminin") : tr("Masculin")}</p>
                </div>
                {voixId === v.id && <span className="text-(--color-magic-text) text-xs font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <button onClick={generer} disabled={generating || !texte.trim()}
          className={buttonClasses({ variant: "primary", fullWidth: true, className: "h-10! gap-2" })}>
          {generating ? <><Loader2 size={16} className="animate-spin" />{" "}{tr("Génération…")}</> : <><Volume2 size={16} />{" "}{tr("Générer la voix")}</>}
        </button>
        <p className="text-center text-xs text-(--color-text-subdued)">
          {tr("Synthèse vocale IA multilingue")}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center">
        <div className="w-full bg-(--color-surface-secondary) border border-(--color-border) rounded-xl p-8 flex flex-col items-center justify-center min-h-48 gap-4">
          {!audioUrl && !generating && (
            <div className="text-center">
              <Mic size={40} className="text-(--color-text-subdued) mx-auto mb-3" />
              <p className="text-(--color-text-subdued) text-sm">{tr("Votre audio apparaîtra ici")}</p>
            </div>
          )}
          {generating && (
            <div className="text-center">
              <Loader2 size={36} className="text-(--color-magic-text) animate-spin mx-auto" />
              <p className="text-(--color-text-secondary) text-sm mt-3">{tr("Synthèse vocale en cours…")}</p>
            </div>
          )}
          {audioUrl && (
            <div className="w-full space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-all hover:scale-110"
                  style={{ background: "var(--color-primary)" }}>
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <div className="flex-1">
                  <div className="h-2 bg-(--color-tint-hover) rounded-full">
                    <div className="h-2 bg-(--chart-primary) rounded-full w-1/3 transition-all" />
                  </div>
                </div>
                <a href={audioUrl} download="voix-off.wav"
                  className="w-9 h-9 rounded-xl bg-(--color-surface-tertiary) flex items-center justify-center text-(--color-text-secondary) hover:bg-(--color-tint-hover) transition-all">
                  <Download size={14} />
                </a>
              </div>
              <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
              <p className="text-xs text-(--color-text-subdued) text-center">{tr("Cliquez sur ▶ pour écouter · Icône ↓ pour télécharger")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab Scripts ──────────────────────────────────────────────────
function TabScript() {
  const tr = useT();
  const [type, setType] = useState(SCRIPT_TYPES[0].id);
  const [produit, setProduit] = useState("");
  const [cible, setCible] = useState("");
  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState("");
  const [copied, setCopied] = useState(false);

  async function genererScript() {
    if (!produit.trim()) { toast.error(tr("Décrivez votre produit")); return; }
    setGenerating(true);
    setScript("");
    const typeInfo = SCRIPT_TYPES.find(t => t.id === type);
    try {
      const res = await fetch("/api/ai/universal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Écris un script ${typeInfo?.label} professionnel pour ce produit :
Produit: ${produit}
Cible: ${cible || "entrepreneurs africains 25-45 ans"}
Type: ${type}

Le script doit être:
- Adapté au marché africain francophone
- Avec un hook fort au début
- CTA clair à la fin
- Formaté avec [Scène 1], [Voix], [Texte écran] si pertinent
- En français naturel et engageant

Réponds UNIQUEMENT avec le script, aucun commentaire avant/après.`,
          }],
        }),
      });
      const data = await res.json();
      setScript(data.reponse || "");
    } catch { toast.error(tr("Erreur IA")); }
    finally { setGenerating(false); }
  }

  function copier() {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(tr("Script copié !"));
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-5">
        <div>
          <label className="text-(--color-text-secondary) text-sm font-medium block mb-2">{tr("Type de contenu")}</label>
          <div className="grid grid-cols-2 gap-2">
            {SCRIPT_TYPES.map(t => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`p-3 rounded-xl border text-left transition-all ${type === t.id ? "border-(--color-border-strong) bg-(--color-surface-selected)" : "border-(--color-border) bg-(--color-surface) hover:border-(--color-border-input)"}`}>
                <p className="text-sm font-semibold text-(--color-text)">{tr(t.label)}</p>
                <div className="flex gap-1 mt-1">
                  {t.plateformes.map(p => (
                    <span key={p} className="text-[10px] bg-(--color-surface-tertiary) text-(--color-text-secondary) px-1.5 py-0.5 rounded">{tr(p)}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-(--color-text-secondary) text-sm font-medium block mb-2">{tr("Produit / Service")}</label>
          <textarea value={produit} onChange={e => setProduit(e.target.value)} rows={3}
            placeholder={tr("Ex: Crème hydratante au karité naturel, 150ml, prix 8000 FCFA...")}
            className="w-full bg-(--color-surface-secondary) border border-(--color-border) rounded-xl px-4 py-3 text-(--color-text-strong) text-sm focus:outline-none focus:border-(--color-border-strong) resize-none" />
        </div>
        <div>
          <label className="text-(--color-text-secondary) text-sm font-medium block mb-2">{tr("Cible (optionnel)")}</label>
          <input value={cible} onChange={e => setCible(e.target.value)}
            placeholder={tr("Ex: Femmes 25-40 ans, Dakar et Abidjan...")}
            className="w-full bg-(--color-surface-secondary) border border-(--color-border) rounded-xl px-4 py-3 text-(--color-text-strong) text-sm focus:outline-none focus:border-(--color-border-strong)" />
        </div>
        <button onClick={genererScript} disabled={generating || !produit.trim()}
          className={buttonClasses({ variant: "primary", fullWidth: true, className: "h-10! gap-2" })}>
          {generating ? <><Loader2 size={16} className="animate-spin" />{" "}{tr("Écriture…")}</> : <><Zap size={16} />{" "}{tr("Générer le script")}</>}
        </button>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <label className="text-(--color-text-secondary) text-sm font-medium">{tr("Script généré")}</label>
          {script && (
            <button onClick={copier}
              className="flex items-center gap-1.5 text-xs text-(--color-magic-text) bg-(--color-surface-selected) px-3 py-1.5 rounded-lg border border-(--color-border-strong) hover:bg-(--color-surface-selected) transition-all">
              {copied ? <><Check size={11} />{" "}{tr("Copié !")}</> : <><Copy size={11} />{" "}{tr("Copier")}</>}
            </button>
          )}
        </div>
        <div className="flex-1 bg-(--color-surface-secondary) border border-(--color-border) rounded-xl p-4 min-h-80 overflow-y-auto">
          {generating ? (
            <div className="flex items-center gap-3 text-(--color-text-subdued) text-sm">
              <Loader2 size={18} className="text-(--color-magic-text) animate-spin flex-shrink-0" />
              <span>{tr("Génération du script…")}</span>
            </div>
          ) : script ? (
            <pre className="text-sm text-(--color-text) whitespace-pre-wrap leading-relaxed font-sans">{tr(script)}</pre>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <BookOpen size={32} className="text-(--color-text-subdued) mx-auto mb-2" />
                <p className="text-(--color-text-subdued) text-sm">{tr("Votre script apparaîtra ici")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab UGC & Ads ────────────────────────────────────────────────
function TabUGC() {
  const tr = useT();
  const [platform, setPlatform] = useState("instagram");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{post: string; hashtags: string[]; imageUrl?: string} | null>(null);
  const [copied, setCopied] = useState(false);

  const PLATFORMS = [
    { id: "instagram", icon: Camera, label: "Instagram", color: "#E1306C" },
    { id: "facebook", icon: Share2, label: "Facebook", color: "#1877F2" },
    { id: "tiktok", icon: Film, label: "TikTok", color: "#000000" },
    { id: "whatsapp", icon: Volume2, label: "WhatsApp", color: "#25D366" },
  ];

  async function generer() {
    if (!prompt.trim()) { toast.error(tr("Décrivez ce que vous voulez promouvoir")); return; }
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/universal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Génère un post ${platform} ultra-engageant pour : "${prompt}".
Réponds en JSON :
{
  "post": "contenu complet du post avec emojis",
  "hashtags": ["tag1", "tag2", ...10 hashtags],
  "conseil": "conseil pour maximiser l'engagement sur ${platform}"
}
Adapté au marché africain francophone. Style authentique et engageant. Réponds UNIQUEMENT en JSON.`,
          }],
        }),
      });
      const data = await res.json();
      const jsonMatch = (data.reponse || "").match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Générer une image pour le post
        const imagePrompt = `${prompt}, social media post visual, ${platform} style, vibrant African aesthetic, professional`;
        const encoded = encodeURIComponent(imagePrompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1080&height=1080&nologo=true&model=flux&seed=${Math.floor(Math.random()*999999)}`;
        setResult({ ...parsed, imageUrl });
      }
    } catch { toast.error(tr("Erreur IA")); }
    finally { setGenerating(false); }
  }

  function copier() {
    if (!result) return;
    navigator.clipboard.writeText(`${result.post}\n\n${result.hashtags.map(h => `#${h}`).join(" ")}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(tr("Post copié !"));
  }

  const platInfo = PLATFORMS.find(p => p.id === platform);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-5">
        <div>
          <label className="text-(--color-text-secondary) text-sm font-medium block mb-2">{tr("Plateforme")}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PLATFORMS.map(p => {
              const Icone = p.icon;
              return (
                <button key={p.id} onClick={() => setPlatform(p.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${platform === p.id ? "border-2" : "border-(--color-border)"}`}
                  style={platform === p.id ? { borderColor: p.color, background: p.color + "10" } : {}}>
                  <Icone size={20} style={{ color: platform === p.id ? p.color : "var(--color-text-subdued)" }} />
                  <span className="text-[11px] font-medium" style={{ color: platform === p.id ? p.color : "var(--color-text-secondary)" }}>{tr(p.label)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-(--color-text-secondary) text-sm font-medium block mb-2">{tr("Que voulez-vous promouvoir ?")}</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
            placeholder={tr("Ex: Notre nouvelle collection de robes wax premium, disponible en 5 couleurs, livraison 24h à Dakar...")}
            className="w-full bg-(--color-surface-secondary) border border-(--color-border) rounded-xl px-4 py-3 text-(--color-text-strong) text-sm focus:outline-none focus:border-(--color-border-strong) resize-none" />
        </div>

        <button onClick={generer} disabled={generating || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
          style={platInfo ? { background: platInfo.color, boxShadow: `0 4px 20px ${platInfo.color}40` } : {}}>
          {generating ? <><Loader2 size={16} className="animate-spin" />{" "}{tr("Création…")}</> : <><Sparkles size={16} />{" "}{tr("Créer le post")}</>}
        </button>
      </div>

      <div className="space-y-4">
        {!result && !generating && (
          <div className="bg-(--color-surface-secondary) border border-dashed border-(--color-border) rounded-xl p-8 text-center">
            <Sparkles size={32} className="text-(--color-text-subdued) mx-auto mb-2" />
            <p className="text-(--color-text-subdued) text-sm">{tr("Votre post + visuel IA apparaîtront ici")}</p>
          </div>
        )}
        {generating && (
          <div className="bg-(--color-surface-secondary) border border-(--color-border) rounded-xl p-8 flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-(--color-magic-text) animate-spin" />
            <p className="text-(--color-text-secondary) text-sm">{tr("Génération du contenu…")}</p>
          </div>
        )}
        {result && (
          <div className="space-y-3">
            {result.imageUrl && (
              <img src={result.imageUrl} alt={tr("Visuel généré")} className="w-full aspect-square object-cover rounded-xl" />
            )}
            <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4 space-y-3">
              <pre className="text-sm text-(--color-text) whitespace-pre-wrap leading-relaxed font-sans">{tr(result.post)}</pre>
              <div className="flex flex-wrap gap-1">
                {result.hashtags?.map((h: string) => (
                  <span key={h} className="text-xs px-2 py-0.5 rounded-full" style={{ background: platInfo?.color + "12", color: platInfo?.color }}>#{tr(h)}</span>
                ))}
              </div>
              <button onClick={copier}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-(--color-border) text-sm font-medium text-(--color-text) hover:bg-(--color-surface-secondary) transition-all">
                {copied ? <><Check size={14} />{" "}{tr("Copié !")}</> : <><Copy size={14} />{" "}{tr("Copier le post")}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────
export default function StudioPage() {
  const tr = useT();
  const [tab, setTab] = useState<TabId>("video");

  return (
    <div className="space-y-4 h-full flex flex-col">
      <PageHeader icon="sparkle" title={tr("Studio de contenu IA")} />
      <p className="m-0 -mt-4 text-(--color-text-secondary)">{tr("Vidéos, voix off, scripts, posts — tout généré par l'IA")}</p>
      <Tabs label={tr("Studio de contenu IA")} selected={tab} onSelect={(id) => setTab(id as TabId)}
        tabs={TABS.map((o) => ({ id: o.id, label: tr(o.label) }))} />

      {/* Content */}
      <div className="flex-1 rounded-(--radius-xl) bg-(--color-surface) p-4 shadow-(--shadow-card) sm:p-6">
        {tab === "video"  && <TabVideo />}
        {tab === "voix"   && <TabVoixOff />}
        {tab === "script" && <TabScript />}
        {tab === "ugc"    && <TabUGC />}
      </div>
    </div>
  );
}
