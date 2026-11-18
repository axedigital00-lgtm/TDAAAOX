"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Film, Image, Loader2, Trash2, Download, Copy,
  RefreshCw, Wand2, CheckCircle2, XCircle, Clock, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Alerte, Badge, Bouton, BoutonIcone, Confirmation, EnTetePage, EtatErreur, EtatVide, Modale, SqueletteListe, ZoneTexte } from "@/components/ui";

interface Media {
  id: string; prompt: string; style: string;
  videoUrl: string | null; thumbnailUrl: string | null;
  statut: "en_cours" | "pret" | "erreur"; erreur: string | null;
  createdAt: string;
}
interface Stats { total: number; pretes: number; enCours: number; erreurs: number }

const MODELES_VIDEO = [
  { id: "kling-3.0", label: "Kling 3.0", desc: "Haute qualité · 10s" },
  { id: "veo-3.1", label: "Veo 3.1", desc: "Google · Cinématique" },
  { id: "wan-2.5", label: "Wan 2.5", desc: "Rapide · Produit" },
];
const MODELES_IMAGE = [
  { id: "recraft-4.1", label: "Modèle HD", desc: "Photo produit ultra HD" },
  { id: "gpt-image", label: "Modèle Créatif", desc: "Créatif publicitaire" },
  { id: "seedream-4.0", label: "Modèle Artistique", desc: "Artistique · Lifestyle" },
];
const STYLES_VIDEO = ["product", "ugc", "ad", "cinematic", "demo"];
const STYLES_IMAGE = ["product_photo", "lifestyle", "advertisement", "minimal", "artistic"];

function StatutBadge({ statut }: { statut: string }) {
  const tr = useT();
  if (statut === "pret") return <Badge ton="succes" icone={<CheckCircle2 aria-hidden />}>{tr("Prêt")}</Badge>;
  if (statut === "en_cours") return <Badge ton="attention" icone={<Loader2 className="animate-spin" aria-hidden />}>{tr("En cours")}</Badge>;
  return <Badge ton="erreur" icone={<XCircle aria-hidden />}>{tr("Échec")}</Badge>;
}

function MediaCard({ media, onDelete, onCopy }: { media: Media; onDelete: (id: string) => Promise<void>; onCopy: (url: string) => void }) {
  const tr = useT();
  const [confirmer, setConfirmer] = useState(false);
  const url = media.videoUrl ?? media.thumbnailUrl;
  const estVideo = !!media.videoUrl;

  return (
    <div className="bg-carte border border-bordure rounded-carte overflow-hidden flex flex-col">
      {/* Aperçu */}
      <div className="relative aspect-video bg-carte-2">
        {media.statut === "en_cours" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" role="status">
            <Loader2 size={28} className="text-primaire animate-spin" aria-hidden />
            <p className="text-xs text-doux">{tr("Génération en cours…")}</p>
          </div>
        ) : media.statut === "erreur" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <XCircle size={24} className="text-erreur" aria-hidden />
            <p className="text-xs text-erreur text-center line-clamp-2">{tr(media.erreur) ?? tr("La génération a échoué. Relancez-la avec une autre description.")}</p>
          </div>
        ) : url && estVideo ? (
          <video src={url} className="w-full h-full object-cover" muted loop controls preload="metadata" />
        ) : url ? (
          <img src={url} alt={media.prompt} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <Wand2 size={24} className="text-discret" />
          </div>
        )}

        {/* Badge type */}
        <div className="absolute top-2 left-2 pointer-events-none">
          <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
            {estVideo ? <Film size={12} aria-hidden /> : <Image size={12} aria-hidden />}
            {estVideo ? tr("Vidéo") : tr("Image")}
          </span>
        </div>
      </div>

      {/* Infos */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="text-sm text-encre line-clamp-2 leading-snug" title={media.prompt}>{tr(media.prompt)}</p>
        <div className="flex items-center justify-between gap-2">
          <StatutBadge statut={media.statut} />
          <span className="text-xs text-doux">
            {new Date(media.createdAt).toLocaleDateString(tr.loc, { day: "numeric", month: "short" })}
          </span>
        </div>
        <div className="mt-auto flex items-center gap-1.5">
          {url && media.statut === "pret" && (
            <>
              <a href={url} download aria-label={tr("Télécharger")} title={tr("Télécharger")}
                className="inline-flex size-10 sm:size-8 items-center justify-center rounded-controle border border-bordure text-encre hover:bg-carte-2">
                <Download size={14} aria-hidden />
              </a>
              <BoutonIcone variante="secondaire" label={tr("Copier le lien")} onClick={() => onCopy(url)} className="sm:size-8 sm:min-h-8">
                <Copy size={14} aria-hidden />
              </BoutonIcone>
            </>
          )}
          <BoutonIcone variante="danger" label={tr("Supprimer")} onClick={() => setConfirmer(true)} className="ml-auto sm:size-8 sm:min-h-8">
            <Trash2 size={14} aria-hidden />
          </BoutonIcone>
        </div>
      </div>
      <Confirmation ouverte={confirmer} onFermer={() => setConfirmer(false)} onConfirmer={() => onDelete(media.id)}
        titre={estVideo ? tr("Supprimer cette vidéo ?") : tr("Supprimer ce média ?")} objet={media.prompt}
        description={tr("Il disparaît de la médiathèque. Les pages qui utilisent son lien ne l'afficheront plus.")}
        libelleConfirmer={tr("Supprimer le média")} />
    </div>
  );
}

export default function MediasPage() {
  const tr = useT();
  const [medias, setMedias] = useState<Media[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pretes: 0, enCours: 0, erreurs: 0 });
  const [loading, setLoading] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [filter, setFilter] = useState<"tous" | "video" | "image">("tous");
  const [showModal, setShowModal] = useState(false);

  // Formulaire génération
  const [type, setType] = useState<"video" | "image">("image");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("recraft-4.1");
  const [style, setStyle] = useState("product_photo");
  const [generating, setGenerating] = useState(false);

  const charger = useCallback(async () => {
    try {
      const url = filter === "tous" ? "/api/medias" : `/api/medias?type=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMedias(data.medias ?? []);
      setStats(data.stats ?? { total: 0, pretes: 0, enCours: 0, erreurs: 0 });
      setErreurChargement(false);
    } catch { setErreurChargement(true); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { charger(); }, [charger]);

  // Polling auto si des médias sont en cours
  useEffect(() => {
    if (!medias.some(m => m.statut === "en_cours")) return;
    const t = setInterval(charger, 5000);
    return () => clearInterval(t);
  }, [medias, charger]);

  // Changer modèle par défaut selon type
  useEffect(() => {
    setModel(type === "video" ? "kling-3.0" : "recraft-4.1");
    setStyle(type === "video" ? "product" : "product_photo");
  }, [type]);

  async function generer() {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/medias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, prompt, model, style }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error);
      }
      setShowModal(false);
      setPrompt("");
      toast.success(type === "video" ? tr("Génération de la vidéo lancée : elle apparaît dans la liste dès qu'elle est prête.") : tr("Génération de l'image lancée : elle apparaît dans la liste dès qu'elle est prête."));
      await charger();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? tr(e.message) : tr("La génération n'a pas pu être lancée. Réessayez dans un instant."));
    }
    finally { setGenerating(false); }
  }

  // Lève en cas d'échec : la fenêtre de confirmation reste ouverte.
  async function supprimer(id: string) {
    const res = await fetch(`/api/medias?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toast.error(tr("Le média n'a pas pu être supprimé. Réessayez dans un instant.")); throw new Error("suppression"); }
    setMedias(ms => ms.filter(m => m.id !== id));
    toast.success(tr("Média supprimé."));
  }

  function copier(url: string) {
    navigator.clipboard.writeText(url).then(() => toast.success(tr("Lien du média copié."))).catch(() => toast.error(tr("Copie impossible : ouvrez le média et copiez son adresse.")));
  }

  return (
    <div className="space-y-section">
      <EnTetePage
        className="mb-0"
        titre={tr("Médiathèque IA")}
        description={tr("Vidéos et images générées par IA")}
        actions={<>
          <Bouton variante="secondaire" onClick={charger} icone={<RefreshCw size={15} aria-hidden />}>{tr("Actualiser")}</Bouton>
          <Bouton onClick={() => setShowModal(true)} icone={<Wand2 size={15} aria-hidden />}>{tr("Générer un média")}</Bouton>
        </>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Sparkles, cls: "bg-carte-2 text-doux" },
          { label: "Prêts", value: stats.pretes, icon: CheckCircle2, cls: "bg-succes-fond text-succes" },
          { label: "En cours", value: stats.enCours, icon: Clock, cls: "bg-attention-fond text-attention" },
          { label: "Échecs", value: stats.erreurs, icon: XCircle, cls: "bg-erreur-fond text-erreur" },
        ].map(s => (
          <div key={s.label} className="bg-carte border border-bordure rounded-carte p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-controle flex items-center justify-center flex-shrink-0 ${s.cls}`} aria-hidden>
              <s.icon size={16} />
            </div>
            <div>
              <p className="text-xl font-bold text-encre">{tr(s.value)}</p>
              <p className="text-xs text-doux">{tr(s.label)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={tr("Filtrer les médias")}>
        {(["tous", "image", "video"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`flex items-center gap-1.5 px-4 min-h-10 rounded-controle text-sm font-semibold border transition-all ${filter === f ? "bg-secondaire text-carte border-secondaire" : "bg-carte border-bordure text-doux hover:border-bordure-forte"}`}
          >
            {f === "video" && <Film size={14} aria-hidden />}
            {f === "image" && <Image size={14} aria-hidden />}
            {f === "tous" ? tr("Tous les médias") : f === "video" ? tr("Vidéos") : tr("Images")}
          </button>
        ))}
      </div>

      {/* Grille médias */}
      {loading ? (
        <SqueletteListe lignes={3} libelle={tr("Chargement de la médiathèque…")} />
      ) : erreurChargement && medias.length === 0 ? (
        <EtatErreur titre={tr("La médiathèque n'a pas pu être chargée.")} texte={tr("Vérifiez votre connexion puis réessayez.")} onReessayer={charger} />
      ) : medias.length === 0 ? (
        <EtatVide icone={<Wand2 />} titre={filter === "tous" ? tr("Médiathèque vide") : filter === "video" ? tr("Aucune vidéo pour l'instant") : tr("Aucune image pour l'instant")}
          texte={tr("Générez des vidéos et images IA pour vos produits et campagnes")}>
          <Bouton onClick={() => setShowModal(true)} icone={<Sparkles size={15} aria-hidden />}>{tr("Générer mon premier média")}</Bouton>
        </EtatVide>
      ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {medias.map(m => (
            <MediaCard key={m.id} media={m} onDelete={supprimer} onCopy={copier} />
          ))}
        </div>
      )}

      {/* ── Modale Génération ── */}
      <Modale ouverte={showModal} onFermer={() => setShowModal(false)} verrouillee={generating}
        titre={tr("Générer un média IA")} description={tr("Higgsfield · Kling 3.0 · Recraft 4.1 · Veo 3.1")}
        actions={<>
          <Bouton variante="secondaire" onClick={() => setShowModal(false)} disabled={generating}>{tr("Annuler")}</Bouton>
          <Bouton onClick={generer} disabled={!prompt.trim()} charge={generating} texteCharge={tr("Lancement…")} icone={<Wand2 size={15} aria-hidden />}>
            {type === "video" ? tr("Générer la vidéo") : tr("Générer l'image")}
          </Bouton>
        </>}>
        <div className="space-y-5">
          {/* Type */}
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={tr("Type de média")}>
            {(["image", "video"] as const).map(t => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={`flex items-center justify-center gap-2 min-h-12 rounded-controle border-2 font-semibold text-sm transition-all ${type === t ? "border-primaire bg-primaire-fond text-encre" : "border-bordure text-doux hover:border-bordure-forte"}`}
              >
                {t === "image" ? <Image size={16} aria-hidden /> : <Film size={16} aria-hidden />}
                {t === "image" ? tr("Image") : tr("Vidéo")}
              </button>
            ))}
          </div>

          <ZoneTexte label={tr("Décrivez ce que vous voulez générer")} required rows={3} value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder={type === "video"
              ? tr("Ex: Sac à main en cuir marron, fond blanc, rotation 360°, lumière studio professionnelle…")
              : tr("Ex: Photo produit robe wax premium sur fond blanc, ultra HD, éclairage professionnel…")} />

          {/* Modèle */}
          <div className="space-y-1.5">
            <p className="ax-libelle" id="medias-modele">{tr("Modèle")}</p>
            <div className="space-y-1.5" role="radiogroup" aria-labelledby="medias-modele">
              {(type === "video" ? MODELES_VIDEO : MODELES_IMAGE).map(m => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={model === m.id}
                  onClick={() => setModel(m.id)}
                  className={`w-full flex flex-wrap items-center justify-between gap-x-3 px-4 min-h-10 py-2 rounded-controle border transition-all text-sm ${model === m.id ? "border-primaire bg-primaire-fond" : "border-bordure hover:border-bordure-forte"}`}
                >
                  <span className="font-semibold text-encre">{tr(m.label)}</span>
                  <span className="text-xs text-doux">{tr(m.desc)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="space-y-1.5">
            <p className="ax-libelle" id="medias-style">{tr("Style")}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="medias-style">
              {(type === "video" ? STYLES_VIDEO : STYLES_IMAGE).map(s => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={style === s}
                  onClick={() => setStyle(s)}
                  className={`px-3 min-h-10 sm:min-h-8 rounded-controle border text-xs font-medium transition-all capitalize ${style === s ? "border-primaire bg-primaire-fond text-encre" : "border-bordure text-doux hover:border-bordure-forte"}`}
                >
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <Alerte ton="info" titre={tr("Nécessite Higgsfield connecté dans les Connecteurs.")}
            action={<a href="/dashboard/connecteurs" className="text-sm font-semibold underline">{tr("Ouvrir les Connecteurs")}</a>}>
            {tr("Sans connexion, une image placeholder sera générée.")}
          </Alerte>
        </div>
      </Modale>
    </div>
  );
}
