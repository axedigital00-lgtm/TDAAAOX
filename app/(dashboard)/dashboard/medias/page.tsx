"use client";
// Contenu → Médias : images et vidéos générées par l'IA pour les produits et
// campagnes. Génération dans une fenêtre, suivi automatique des médias en cours.
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Field } from "@/components/dashboard/design-system/components/primitives";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Modal } from "@/components/dashboard/design-system/components/Modal";
import { Icon } from "@/components/dashboard/design-system/icons/Icon";
import { EmptyArt } from "@/components/dashboard/design-system/illustrations/Illustration";

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
const STYLES_VIDEO: [string, string][] = [["product", "Produit"], ["ugc", "Témoignage client"], ["ad", "Publicité"], ["cinematic", "Cinématique"], ["demo", "Démonstration"]];
const STYLES_IMAGE: [string, string][] = [["product_photo", "Photo produit"], ["lifestyle", "Mise en situation"], ["advertisement", "Publicité"], ["minimal", "Minimaliste"], ["artistic", "Artistique"]];
const FILTRES: ["tous" | "image" | "video", string][] = [["tous", "Tous"], ["image", "Images"], ["video", "Vidéos"]];

function Statut({ statut }: { statut: Media["statut"] }) {
  const tr = useT();
  if (statut === "pret") return <Badge tone="success">{tr("Prêt")}</Badge>;
  if (statut === "en_cours") return <Badge tone="info" progress="partial">{tr("En cours")}</Badge>;
  return <Badge tone="critical">{tr("Erreur")}</Badge>;
}

function CarteMedia({ media, onDelete, onCopy }: { media: Media; onDelete: (id: string) => void; onCopy: (url: string) => void }) {
  const tr = useT();
  const url = media.videoUrl ?? media.thumbnailUrl;
  const estVideo = !!media.videoUrl;
  return (
    <article className="axd-media">
      <div className="axd-media__apercu">
        {media.statut === "en_cours" ? (
          <span className="axd-media__etat">{tr("Génération en cours…")}</span>
        ) : media.statut === "erreur" ? (
          <span className="axd-media__etat" style={{ color: "var(--color-critical-text)" }}>{tr(media.erreur) || tr("Erreur de génération")}</span>
        ) : url && estVideo ? (
          <video src={url} muted loop controls preload="metadata" />
        ) : url ? (
          <img src={url} alt={media.prompt} loading="lazy" />
        ) : null}
        <span className="axd-media__type">{estVideo ? tr("Vidéo") : tr("Image")}</span>
      </div>
      <div className="axd-media__corps">
        <p className="axd-media__prompt" title={media.prompt}>{media.prompt}</p>
        <div className="axd-media__pied">
          <Statut statut={media.statut} />
          <span>{new Date(media.createdAt).toLocaleDateString(tr.loc, { day: "numeric", month: "short" })}</span>
        </div>
        <div className="axd-media__actions">
          {url && media.statut === "pret" && (
            <>
              <Button size="sm" href={url} external>{tr("Télécharger")}</Button>
              <Button size="sm" variant="plain" onClick={() => onCopy(url)}>{tr("Copier le lien")}</Button>
            </>
          )}
          <button type="button" className="axd-icon-btn" style={{ marginLeft: "auto" }} onClick={() => onDelete(media.id)} aria-label={tr("Supprimer")} title={tr("Supprimer")}><Icon name="x" /></button>
        </div>
      </div>
    </article>
  );
}

export default function MediasPage() {
  const tr = useT();
  const [medias, setMedias] = useState<Media[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pretes: 0, enCours: 0, erreurs: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"tous" | "video" | "image">("tous");
  const [showModal, setShowModal] = useState(false);

  // Formulaire de génération
  const [type, setType] = useState<"video" | "image">("image");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("recraft-4.1");
  const [style, setStyle] = useState("product_photo");
  const [generating, setGenerating] = useState(false);

  const charger = useCallback(async () => {
    try {
      const url = filter === "tous" ? "/api/medias" : `/api/medias?type=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setMedias(data.medias ?? []);
      setStats(data.stats ?? { total: 0, pretes: 0, enCours: 0, erreurs: 0 });
    } catch {}
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { charger(); }, [charger]);

  // Suivi automatique tant que des médias sont en cours
  useEffect(() => {
    if (!medias.some(m => m.statut === "en_cours")) return;
    const t = setInterval(charger, 5000);
    return () => clearInterval(t);
  }, [medias, charger]);

  // Modèle et style par défaut selon le type
  useEffect(() => {
    setModel(type === "video" ? "kling-3.0" : "recraft-4.1");
    setStyle(type === "video" ? "product" : "product_photo");
  }, [type]);

  async function generer() {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      await fetch("/api/medias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, prompt, model, style }),
      });
      setShowModal(false);
      setPrompt("");
      await charger();
    } catch {}
    finally { setGenerating(false); }
  }

  async function supprimer(id: string) {
    if (!confirm(tr("Supprimer ce média ?"))) return;
    await fetch(`/api/medias?id=${id}`, { method: "DELETE" });
    setMedias(ms => ms.filter(m => m.id !== id));
  }

  function copier(url: string) {
    navigator.clipboard.writeText(url);
    toast.success(tr("Lien copié"));
  }

  const modeles = type === "video" ? MODELES_VIDEO : MODELES_IMAGE;
  const styles = type === "video" ? STYLES_VIDEO : STYLES_IMAGE;

  return (
    <Page>
      <PageHeader
        icon="image"
        title={tr("Médias")}
        secondaryActions={[{ content: tr("Actualiser"), onAction: charger }]}
        primaryAction={{ content: tr("Générer avec l’IA"), onAction: () => setShowModal(true) }}
      />

      <div className="axd-grid axd-g4" style={{ marginBottom: "var(--space-400)" }}>
        {[
          { l: "Total", v: stats.total },
          { l: "Prêts", v: stats.pretes },
          { l: "En cours", v: stats.enCours },
          { l: "Erreurs", v: stats.erreurs },
        ].map((s) => (
          <div key={s.l} className="axd-card axd-card--pad">
            <div className="axd-kpi__t">{tr(s.l)}</div>
            <div className="axd-kpi__v" style={{ marginBottom: 0 }}>{s.v.toLocaleString(tr.loc)}</div>
          </div>
        ))}
      </div>

      <div className="axd-card" style={{ overflow: "hidden" }}>
        <div className="axd-ix-bar">
          <div className="axd-ix-tabs" role="tablist">
            {FILTRES.map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={filter === v} className="axd-ix-tab" onClick={() => setFilter(v)}>{tr(l)}</button>)}
          </div>
        </div>
        {loading ? (
          <p className="axd-fichiers__etat">{tr("Chargement…")}</p>
        ) : medias.length === 0 ? (
          <div className="axd-empty">
            {filter === "video" ? (
              <figure style={{ width: "min(100%, 360px)", margin: "0 auto 20px" }}>
                <video src="/editorial/film-board.mp4" poster="/editorial/film-board.webp" playsInline controls preload="none"
                  aria-label={tr("Exemple de film produit")} style={{ width: "100%", borderRadius: 16 }} />
                <figcaption>{tr("Exemple de film produit")}</figcaption>
              </figure>
            ) : <EmptyArt name="blog" />}
            <h3>{tr("Créez vos premiers visuels avec l’IA")}</h3>
            <p>{tr("Photos produit, mises en situation et vidéos publicitaires, générées à partir d’une simple description.")}</p>
            <div className="axd-empty__actions"><Button variant="primary" onClick={() => setShowModal(true)}>{tr("Générer un média")}</Button></div>
          </div>
        ) : (
          <div className="axd-media-grille">
            {medias.map(m => <CarteMedia key={m.id} media={m} onDelete={supprimer} onCopy={copier} />)}
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={tr("Générer un média")}
        footer={<>
          <Button onClick={() => setShowModal(false)}>{tr("Annuler")}</Button>
          <Button variant="primary" onClick={generer} loading={generating} disabled={!prompt.trim()}>{type === "video" ? tr("Générer la vidéo") : tr("Générer l’image")}</Button>
        </>}
      >
        <div style={{ display: "grid", gap: "var(--space-400)", padding: "var(--space-400)" }}>
          <div className="axd-seg" role="group" aria-label={tr("Type de média")}>
            {(["image", "video"] as const).map((v) => (
              <button key={v} type="button" className="axd-choix" aria-pressed={type === v} onClick={() => setType(v)}>{v === "image" ? tr("Image") : tr("Vidéo")}</button>
            ))}
          </div>

          <Field label={tr("Décrivez ce que vous voulez générer")}>
            {(p) => (
              <textarea {...p} className="axd-input" rows={3} value={prompt} onChange={e => setPrompt(e.target.value)} style={{ height: "auto", padding: "8px 12px", resize: "vertical" }}
                placeholder={type === "video"
                  ? tr("Ex : sac à main en cuir marron, fond blanc, rotation à 360°, lumière studio")
                  : tr("Ex : robe en wax sur fond blanc, photo produit très nette, éclairage studio")} />
            )}
          </Field>

          <div>
            <p className="axd-field__label" style={{ marginBottom: 6 }}>{tr("Modèle")}</p>
            <div style={{ display: "grid", gap: 6 }}>
              {modeles.map(m => (
                <button key={m.id} type="button" className="axd-choix axd-choix--ligne" aria-pressed={model === m.id} onClick={() => setModel(m.id)}>
                  <b>{tr(m.label)}</b><span>{tr(m.desc)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="axd-field__label" style={{ marginBottom: 6 }}>{tr("Style")}</p>
            <div className="axd-chips" style={{ margin: 0 }}>
              {styles.map(([id, l]) => <button key={id} type="button" className="axd-chip" aria-pressed={style === id} onClick={() => setStyle(id)}>{tr(l)}</button>)}
            </div>
          </div>

          <Banner tone="info">
            {tr("Nécessite Higgsfield connecté dans")}{" "}<a href="/dashboard/connecteurs" style={{ textDecoration: "underline" }}>{tr("Connecteurs")}</a>{tr(". Sans connexion, une image placeholder sera générée.")}
          </Banner>
        </div>
      </Modal>
    </Page>
  );
}
