"use client";
import { useState, useEffect } from "react";
import { Calendar, Clock, Trash2, CheckCircle2, XCircle, Loader2, Sparkles, X, Edit3, Zap, Camera, ThumbsUp, Music4, MessageCircle, Bird } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { BoutonIcone, useConfirmation } from "@/components/ui";
import { PageHeader } from "@/components/ui/adm";

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
  { id: "instagram", label: "Instagram", color: "#E1306C", Icon: Camera },
  { id: "facebook",  label: "Facebook",  color: "#1877F2", Icon: ThumbsUp },
  { id: "tiktok",    label: "TikTok",    color: "#010101", Icon: Music4 },
  { id: "whatsapp",  label: "WhatsApp",  color: "#25D366", Icon: MessageCircle },
  { id: "twitter",   label: "X/Twitter", color: "#1DA1F2", Icon: Bird },
];

const STATUT_BADGES: Record<Statut, { label: string; color: string; bg: string; icon: any }> = {
  planifie: { label: "Planifié",  color: "#F5A623", bg: "rgba(245,166,35,0.1)",  icon: Clock },
  publie:   { label: "Publié",    color: "#34d399", bg: "rgba(52,211,153,0.1)",  icon: CheckCircle2 },
  annule:   { label: "Annulé",    color: "#f87171", bg: "rgba(248,113,113,0.1)", icon: XCircle },
};

function PostCard({ post, onDelete, onStatut }: { post: Post; onDelete: (id: string) => void; onStatut: (id: string, s: Statut) => void }) {
  const t = useT();
  const plat = PLATEFORMES.find(p => p.id === post.plateforme);
  const statut = STATUT_BADGES[post.statut];
  const StatutIcon = statut.icon;
  const date = new Date(post.planifieLe);

  return (
    <div className="ax-card overflow-hidden hover:-translate-y-0.5 transition-all">
      {post.imageUrl && (
        <div className="aspect-video overflow-hidden">
          <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {plat && <plat.Icon size={16} style={{ color: plat.color }} />}
            <span className="text-xs font-semibold text-gray-700" style={{ color: plat?.color }}>{t(plat?.label)}</span>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: statut.color, background: statut.bg }}>
            <StatutIcon size={10} />{t(statut.label)}
          </span>
        </div>

        <p className="text-[13px] text-[#444] leading-relaxed line-clamp-3">{t(post.contenu)}</p>

        {post.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.slice(0, 4).map(h => (
              <span key={h} className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#888]">#{t(h)}</span>
            ))}
            {post.hashtags.length > 4 && <span className="text-[11px] text-gray-400">+{post.hashtags.length - 4}</span>}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-[#F3F3F3]">
          <div className="flex items-center gap-1.5 text-[11.5px] text-[#AAAAAA]">
            <Clock size={11} />
            <span>{date.toLocaleDateString(t.loc, { day: "numeric", month: "short" })}{" "}{t("à")}{" "}{date.toLocaleTimeString(t.loc, { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="flex gap-1">
            {post.statut === "planifie" && (
              <button onClick={() => onStatut(post.id, "publie")}
                className="text-xs px-2.5 py-1 bg-green-50 text-green-600 rounded-lg border border-green-200 hover:bg-green-100 transition-colors font-medium">
                {t("Marquer comme publié")}
              </button>
            )}
            <BoutonIcone label={t("Supprimer ce post")} variante="danger" onClick={() => onDelete(post.id)}>
              <Trash2 className="size-4" aria-hidden />
            </BoutonIcone>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SchedulerPage() {
  const t = useT();
  const { confirmer, dialogue } = useConfirmation();
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
    } catch { toast.error(t("Tes posts n'ont pas pu être chargés. Vérifie ta connexion et actualise la page.")); }
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
    } catch { toast.error(t("Le post n'a pas pu être rédigé. Réessaie ou écris-le toi-même.")); }
    finally { setGenerating(false); }
  }

  async function sauvegarder() {
    if (!form.contenu.trim() || !form.planifieLe) { toast.error(t("Renseigne le contenu du post et sa date de publication.")); return; }
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
    } catch { toast.error(t("Le post n'a pas été planifié. Réessaie.")); }
    finally { setSaving(false); }
  }

  async function supprimerPost(id: string) {
    const post = posts.find(x => x.id === id);
    const apercu = post ? `${post.plateforme} · ${post.contenu.slice(0, 60)}${post.contenu.length > 60 ? "…" : ""}` : t("Post");
    if (!(await confirmer({ titre: t("Supprimer ce post ?"), objet: apercu, description: t("Il sera retiré du planning. Cette action est définitive."), libelleConfirmer: t("Supprimer le post") }))) return;
    const res = await fetch(`/api/posts?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toast.error(t("Le post n'a pas été supprimé. Réessaie.")); return; }
    setPosts(p => p.filter(x => x.id !== id));
    toast.success(t("Post supprimé du planning."))
  }

  async function changerStatut(id: string, statut: Statut) {
    const res = await fetch("/api/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, statut }) }).catch(() => null);
    if (!res?.ok) { toast.error(t("Le statut du post n'a pas été modifié. Réessaie.")); return; }
    setPosts(p => p.map(x => x.id === id ? { ...x, statut } : x));
    toast.success(statut === "publie" ? t("Post marqué comme publié.") : t("Statut du post mis à jour."));
  }

  const postsFiltres = posts.filter(p => {
    if (filterPlateforme !== "tous" && p.plateforme !== filterPlateforme) return false;
    if (filterStatut !== "tous" && p.statut !== filterStatut) return false;
    return true;
  });

  const stats = {
    total: posts.length,
    planifies: posts.filter(p => p.statut === "planifie").length,
    publie: posts.filter(p => p.statut === "publie").length,
  };

  return (
    <div className="space-y-6">
      {dialogue}
      <PageHeader icon="calendar" title={t("Planificateur social")}
        primaryAction={{ content: t("Nouveau post"), icon: "plus", onAction: () => setShowModal(true) }} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total posts", val: stats.total, color: "#818cf8" },
          { label: "Planifiés", val: stats.planifies, color: "#F5A623" },
          { label: "Publiés", val: stats.publie, color: "#34d399" },
        ].map(s => (
          <div key={s.label} className="ax-card p-5">
            <p className="text-[22px] font-bold mb-1 tabular-nums" style={{ color: s.color, fontVariantNumeric: "tabular-nums" }}>{t(s.val)}</p>
            <p className="text-[12px] text-[#AAAAAA]">{t(s.label)}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["tous", ...PLATEFORMES.map(p => p.id)].map(p => {
            const plat = PLATEFORMES.find(x => x.id === p);
            return (
              <button key={p} onClick={() => setFilterPlateforme(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterPlateforme === p ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}
                style={filterPlateforme === p ? { background: plat?.color || "#6b7280" } : {}}>
                {p === "tous" ? t("Tous") : <span className="flex items-center gap-1">{plat?.Icon && <plat.Icon size={11} />} {t(plat?.label)}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["tous", "planifie", "publie", "annule"].map(s => (
            <button key={s} onClick={() => setFilterStatut(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterStatut === s ? "bg-gray-800 text-white border-gray-800" : "bg-white border-gray-200 text-gray-500"}`}>
              {s === "tous" ? t("Tous statuts") : s === "planifie" ? t("Planifiés") : s === "publie" ? t("Publiés") : t("Annulés")}
            </button>
          ))}
        </div>
      </div>

      {/* Grille posts */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-gray-400 animate-spin" />
        </div>
      ) : postsFiltres.length === 0 ? (
        <div className="bg-[#F9F9F9] border border-dashed border-[#E8E8E8] rounded-[20px] p-16 text-center">
          <Calendar size={40} className="text-[#CCCCCC] mx-auto mb-4" />
          <h3 className="text-[14px] font-semibold text-[#111111] mb-2">{t("Aucun post planifié")}</h3>
          <p className="text-[12.5px] text-[#AAAAAA] mb-6">{t("L'IA peut générer et planifier vos posts en quelques secondes")}</p>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white mx-auto transition-all"
            style={{ background: "linear-gradient(135deg, #E1306C, #833AB4)" }}>
            <Sparkles size={15} />{" "}{t("Créer avec l'IA")}
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {postsFiltres.map(post => (
            <PostCard key={post.id} post={post} onDelete={supprimerPost} onStatut={changerStatut} />
          ))}
        </div>
      )}

      {/* ─── Modal Création Post ─── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#F3F3F3]">
              <h2 className="text-[15px] font-bold text-[#111111]">{t("Nouveau post planifié")}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 bg-[#F5F5F7] rounded-xl">
                {[{ id: true, label: "Générer avec l'IA", Icon: Sparkles }, { id: false, label: "Manuel", Icon: Edit3 }].map(m => (
                  <button key={String(m.id)} onClick={() => setAiMode(m.id)}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 ${aiMode === m.id ? "bg-white text-[#111111] shadow-sm" : "text-[#AAAAAA]"}`}>
                    <m.Icon size={13} /> {t(m.label)}
                  </button>
                ))}
              </div>

              {/* Plateforme */}
              <div>
                <label className="text-[12px] font-semibold text-[#555] block mb-2">{t("Plateforme")}</label>
                <div className="flex gap-2 flex-wrap">
                  {PLATEFORMES.map(p => (
                    <button key={p.id} onClick={() => setForm(f => ({ ...f, plateforme: p.id }))}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${form.plateforme === p.id ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-600"}`}
                      style={form.plateforme === p.id ? { background: p.color } : {}}>
                      <p.Icon size={13} /> {t(p.label)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode IA */}
              {aiMode && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[12px] font-semibold text-[#555] block mb-2">{t("Que voulez-vous promouvoir ?")}</label>
                    <textarea value={form.aiPrompt} onChange={e => setForm(f => ({ ...f, aiPrompt: e.target.value }))}
                      rows={3} placeholder={t("Ex: Nouvelle collection de robes wax printemps 2024, promo -20% ce weekend...")}
                      className="w-full bg-white border border-[#E8E8E8] rounded-2xl px-4 py-3 text-[#111111] text-[13px] outline-none focus:border-[#F5A623]/50 focus:ring-2 focus:ring-[#F5A623]/8 transition-all placeholder:text-[#CCCCCC] resize-none" />
                  </div>
                  <button onClick={genererAvecIA} disabled={generating || !form.aiPrompt.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #F5A623, #e8950f)" }}>
                    {generating ? <><Loader2 size={14} className="animate-spin" />{" "}{t("Génération…")}</> : <><Zap size={14} />{" "}{t("Générer le post + visuel IA")}</>}
                  </button>
                </div>
              )}

              {/* Aperçu / Contenu */}
              {form.contenu && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {form.imageUrl && (
                    <img src={form.imageUrl} alt={t("Visuel")} className="w-full aspect-square object-cover rounded-xl" />
                  )}
                  <div className="space-y-2">
                    <textarea value={form.contenu} onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))}
                      rows={6} className="w-full bg-white border border-[#E8E8E8] rounded-2xl px-3 py-2 text-[#111111] text-[13px] outline-none focus:border-[#F5A623]/50 transition-all resize-none" />
                    {form.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {form.hashtags.slice(0, 6).map(h => (
                          <span key={h} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{t(h)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contenu manuel */}
              {!aiMode && !form.contenu && (
                <div>
                  <label className="text-[12px] font-semibold text-[#555] block mb-2">{t("Contenu du post")}</label>
                  <textarea value={form.contenu} onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))}
                    rows={5} placeholder={t("Rédigez votre post...")}
                    className="w-full bg-white border border-[#E8E8E8] rounded-2xl px-4 py-3 text-[#111111] text-[13px] outline-none focus:border-[#F5A623]/50 focus:ring-2 focus:ring-[#F5A623]/8 transition-all placeholder:text-[#CCCCCC] resize-none" />
                </div>
              )}

              {/* Date */}
              <div>
                <label className="text-[12px] font-semibold text-[#555] block mb-2">{t("Date et heure de publication")}</label>
                <input type="datetime-local" value={form.planifieLe} onChange={e => setForm(f => ({ ...f, planifieLe: e.target.value }))}
                  className="w-full bg-white border border-[#E8E8E8] rounded-2xl px-4 py-3 text-[#111111] text-[13px] outline-none focus:border-[#F5A623]/50 focus:ring-2 focus:ring-[#F5A623]/8 transition-all" />
              </div>

              <div className="flex gap-2">
                <button onClick={sauvegarder} disabled={saving || !form.contenu || !form.planifieLe}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #E1306C, #833AB4)" }}>
                  {saving ? <><Loader2 size={16} className="animate-spin" />{" "}{t("Planification…")}</> : <><Calendar size={16} />{" "}{t("Planifier")}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
