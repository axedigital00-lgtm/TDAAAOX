"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import {
  Badge, Button, EmptyState, IconButton, IndexTable, Modal, PageHeader, Select, Tabs, TextField, Textarea, Thumbnail,
  type BadgeTone, type Column,
} from "@/components/ui/adm";
import { IllustrationCampagnes } from "@/components/ui/illustrations";
import { Chargement, Chiffres, useConfirmationAdm } from "../marketing/kit-marketing";
import { filtrer } from "../marketing/regles-marketing";

type Statut = "planifie" | "publie" | "annule";

interface Post {
  id: string;
  plateforme: string;
  contenu: string;
  hashtags: string[];
  imageUrl?: string;
  videoUrl?: string;
  planifieLe: string;
  statut: Statut;
  noteInterne?: string;
}

const PLATEFORMES = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook",  label: "Facebook" },
  { id: "tiktok",    label: "TikTok" },
  { id: "whatsapp",  label: "WhatsApp" },
  { id: "twitter",   label: "X/Twitter" },
];

const STATUT_BADGES: Record<Statut, { label: string; tone: BadgeTone }> = {
  planifie: { label: "Planifié", tone: "attention" },
  publie:   { label: "Publié",   tone: "success" },
  annule:   { label: "Annulé",   tone: "neutral" },
};

export default function SchedulerPage() {
  const t = useT();
  const { confirmer, dialogue } = useConfirmationAdm();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [aiMode, setAiMode] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterPlateforme, setFilterPlateforme] = useState("tous");
  const [filterStatut, setFilterStatut] = useState("tous");

  const [form, setForm] = useState({
    plateforme: "instagram",
    contenu: "",
    hashtags: [] as string[],
    imageUrl: "",
    planifieLe: "",
    noteInterne: "",
    aiPrompt: "",
  });

  useEffect(() => { charger(); }, []);

  async function charger() {
    setLoading(true);
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch { toast.error(t("Vos posts n'ont pas pu être chargés. Vérifiez votre connexion et actualisez la page.")); }
    finally { setLoading(false); }
  }

  async function genererAvecIA() {
    if (!form.aiPrompt.trim()) { toast.error(t("Décrivez ce que vous voulez promouvoir")); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/universal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Génère un post ${form.plateforme} professionnel pour : "${form.aiPrompt}".
Réponds en JSON :
{
  "contenu": "texte du post avec emojis",
  "hashtags": ["tag1", ..., 10 tags]
}
Adapté marché africain. UNIQUEMENT le JSON.`,
          }],
        }),
      });
      const data = await res.json();
      const json = (data.reponse || "").match(/\{[\s\S]*\}/);
      if (json) {
        const parsed = JSON.parse(json[0]);

        // Générer visuel IA
        const imgPrompt = `${form.aiPrompt}, ${form.plateforme} post visual, African aesthetic, vibrant, professional`;
        const encoded = encodeURIComponent(imgPrompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1080&height=1080&nologo=true&model=flux&seed=${Math.floor(Math.random()*999999)}`;

        setForm(f => ({ ...f, contenu: parsed.contenu || "", hashtags: parsed.hashtags || [], imageUrl }));
        toast.success(t("Post généré !"));
      }
    } catch { toast.error(t("Le post n'a pas pu être rédigé. Réessayez ou écrivez-le vous-même.")); }
    finally { setGenerating(false); }
  }

  async function sauvegarder() {
    if (!form.contenu.trim() || !form.planifieLe) { toast.error(t("Renseignez le contenu du post et sa date de publication.")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateforme: form.plateforme,
          contenu: form.contenu,
          hashtags: form.hashtags,
          imageUrl: form.imageUrl || undefined,
          planifieLe: new Date(form.planifieLe).toISOString(),
          noteInterne: form.noteInterne || undefined,
        }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success(t("Post planifié !"));
      setShowModal(false);
      setForm({ plateforme: "instagram", contenu: "", hashtags: [], imageUrl: "", planifieLe: "", noteInterne: "", aiPrompt: "" });
      charger();
    } catch { toast.error(t("Le post n'a pas été planifié. Réessayez.")); }
    finally { setSaving(false); }
  }

  async function supprimerPost(id: string) {
    const post = posts.find(x => x.id === id);
    const apercu = post ? `${post.plateforme} · ${post.contenu.slice(0, 60)}${post.contenu.length > 60 ? "…" : ""}` : t("Post");
    if (!(await confirmer({ titre: t("Supprimer ce post ?"), objet: apercu, description: t("Il sera retiré du planning. Cette action est définitive."), libelleConfirmer: t("Supprimer le post") }))) return;
    const res = await fetch(`/api/posts?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toast.error(t("Le post n'a pas été supprimé. Réessayez.")); return; }
    setPosts(p => p.filter(x => x.id !== id));
    toast.success(t("Post supprimé du planning."))
  }

  async function changerStatut(id: string, statut: Statut) {
    const res = await fetch("/api/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, statut }) }).catch(() => null);
    if (!res?.ok) { toast.error(t("Le statut du post n'a pas été modifié. Réessayez.")); return; }
    setPosts(p => p.map(x => x.id === id ? { ...x, statut } : x));
    toast.success(statut === "publie" ? t("Post marqué comme publié.") : t("Statut du post mis à jour."));
  }

  const postsFiltres = filtrer(posts, { plateforme: filterPlateforme, statut: filterStatut });

  const stats = {
    total: posts.length,
    planifies: posts.filter(p => p.statut === "planifie").length,
    publie: posts.filter(p => p.statut === "publie").length,
  };

  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));
  const colonnes: Column<Post>[] = [
    { id: "contenu", header: t("Post"), mobilePrimary: true, cell: (post) => (
      <span className="flex items-center gap-2">
        {post.imageUrl && <Thumbnail src={post.imageUrl} alt="" size={40} />}
        <span className="min-w-0">
          <span className="line-clamp-2 font-normal text-(--color-text)">{t(post.contenu)}</span>
          {post.hashtags?.length > 0 && <span className="block truncate text-xs font-normal text-(--color-text-secondary)">{post.hashtags.slice(0, 4).map(h => `#${t(h)}`).join(" ")}{post.hashtags.length > 4 ? ` +${post.hashtags.length - 4}` : ""}</span>}
        </span>
      </span>
    ) },
    { id: "plateforme", header: t("Plateforme"), cell: (post) => t(PLATEFORMES.find(p => p.id === post.plateforme)?.label ?? post.plateforme) },
    { id: "date", header: t("Publication"), cell: (post) => { const d = new Date(post.planifieLe); return `${d.toLocaleDateString(t.loc, { day: "numeric", month: "short" })} ${t("à")} ${d.toLocaleTimeString(t.loc, { hour: "2-digit", minute: "2-digit" })}`; } },
    { id: "statut", header: t("Statut"), cell: (post) => <Badge tone={STATUT_BADGES[post.statut].tone}>{t(STATUT_BADGES[post.statut].label)}</Badge> },
    { id: "actions", header: "", align: "end", cell: (post) => (
      <span className="inline-flex items-center gap-1">
        {post.statut === "planifie" && <Button size="sm" onClick={() => changerStatut(post.id, "publie")}>{t("Marquer comme publié")}</Button>}
        <IconButton icon="x" aria-label={t("Supprimer ce post")} onClick={() => supprimerPost(post.id)} />
      </span>
    ) },
  ];

  return (
    <div className="space-y-4">
      {dialogue}
      <PageHeader icon="calendar" title={t("Planificateur social")}
        primaryAction={{ content: t("Nouveau post"), icon: "plus", onAction: () => setShowModal(true) }} />

      <Chiffres items={[
        { label: t("Total posts"), value: stats.total },
        { label: t("Planifiés"), value: stats.planifies },
        { label: t("Publiés"), value: stats.publie },
      ]} />

      {loading ? <Chargement /> : posts.length === 0 ? (
        <EmptyState title={t("Aucun post planifié")} image={<IllustrationCampagnes />}
          actions={<Button variant="primary" icon="sparkle" onClick={() => setShowModal(true)}>{t("Créer avec l'IA")}</Button>}>
          {t("L'IA peut générer et planifier vos posts en quelques secondes")}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
          <div className="flex flex-wrap items-end gap-3 border-b border-(--color-border-secondary) px-3">
            <Tabs className="flex-1 border-b-0" label={t("Plateformes")} selected={filterPlateforme} onSelect={setFilterPlateforme}
              tabs={[{ id: "tous", label: t("Tous") }, ...PLATEFORMES.map(p => ({ id: p.id, label: t(p.label) }))]} />
            <Select className="py-1.5" label={t("Statut")} labelHidden value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
              options={[{ value: "tous", label: t("Tous statuts") }, { value: "planifie", label: t("Planifiés") }, { value: "publie", label: t("Publiés") }, { value: "annule", label: t("Annulés") }]} />
          </div>
          <IndexTable label={t("Posts planifiés")} rows={postsFiltres} columns={colonnes} getId={(p) => p.id}
            emptyState={<p className="px-6 py-12 text-center text-(--color-text-secondary)">{t("Aucun post ne correspond à ces filtres.")}</p>} />
        </div>
      )}

      <Modal open={showModal} onClose={() => !saving && setShowModal(false)} locked={saving} title={t("Nouveau post planifié")}
        footer={<>
          <Button onClick={() => setShowModal(false)} disabled={saving}>{t("Annuler")}</Button>
          <Button variant="primary" icon="calendar" onClick={sauvegarder} disabled={!form.contenu || !form.planifieLe} loading={saving}>{t("Planifier")}</Button>
        </>}>
        <div className="space-y-4">
          <Tabs label={t("Mode de rédaction")} selected={aiMode ? "ia" : "manuel"} onSelect={(id) => setAiMode(id === "ia")}
            tabs={[{ id: "ia", label: t("Générer avec l'IA") }, { id: "manuel", label: t("Manuel") }]} />

          <Select label={t("Plateforme")} value={form.plateforme} onChange={e => set({ plateforme: e.target.value })}
            options={PLATEFORMES.map(p => ({ value: p.id, label: t(p.label) }))} />

          {aiMode && (
            <div className="space-y-2 rounded-(--radius-lg) border border-(--color-magic-border) bg-(--color-magic-bg) p-3">
              <Textarea label={t("Que voulez-vous promouvoir ?")} rows={3} value={form.aiPrompt} onChange={e => set({ aiPrompt: e.target.value })}
                placeholder={t("Ex: Nouvelle collection de robes wax printemps 2024, promo -20% ce weekend...")} />
              <Button size="sm" icon="sparkle" onClick={genererAvecIA} disabled={!form.aiPrompt.trim()} loading={generating}>{t("Générer le post + visuel IA")}</Button>
            </div>
          )}

          {(form.contenu || !aiMode) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {form.imageUrl && <img src={form.imageUrl} alt={t("Visuel")} className="aspect-square w-full rounded-(--radius-lg) border border-(--color-border) object-cover" />}
              <div className={`space-y-2 ${form.imageUrl ? "" : "sm:col-span-2"}`}>
                <Textarea label={t("Contenu du post")} rows={6} value={form.contenu} onChange={e => set({ contenu: e.target.value })} placeholder={t("Rédigez votre post...")} />
                {form.hashtags.length > 0 && (
                  <p className="text-xs text-(--color-text-secondary)">{form.hashtags.slice(0, 6).map(h => `#${t(h)}`).join(" ")}</p>
                )}
              </div>
            </div>
          )}

          <TextField label={t("Date et heure de publication")} type="datetime-local" value={form.planifieLe} onChange={e => set({ planifieLe: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
