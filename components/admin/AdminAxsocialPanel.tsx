"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Loader2, Trash2, Send } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { useConfirmation } from "@/components/command-center/Confirmation";
import { EtatVide } from "@/components/command-center/ui";

interface Post { id: string; contenu: string | null; type: string; createdAt: string; vues: number; _count: { reactions: number; commentaires: number } }

function tempsEcoule(date: string, t: ReturnType<typeof useT>) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return t("à l'instant");
  if (h < 24) return t("il y a {0} h", h);
  return t("il y a {0} j", Math.floor(h / 24));
}

export function AdminAxsocialPanel({ peutPublier }: { peutPublier: boolean }) {
  const t = useT();
  const { confirmer, dialogue } = useConfirmation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [contenu, setContenu] = useState("");
  const [erreur, setErreur] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function charger() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/axsocial");
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => ({}));
      setPosts(data.posts ?? []);
      setErreurChargement(false);
    } catch {
      setErreurChargement(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { charger(); }, []);

  async function publier() {
    if (!contenu.trim()) { setErreur(t("Écrivez le message à publier.")); return; }
    setErreur("");
    const ok = await confirmer({
      titre: t("Publier cette annonce à tous les marchands ?"),
      message: t("Elle apparaît tout de suite dans le fil Axsocial de chaque marchand."),
      details: [{ libelle: t("Message"), valeur: contenu.trim().length > 140 ? contenu.trim().slice(0, 140) + "…" : contenu.trim() }],
      action: t("Publier l'annonce"),
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/axsocial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenu, type: "post" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(t("Annonce publiée dans le fil Axsocial de tous les marchands."));
      setContenu("");
      charger();
    } catch (e: any) {
      toast.error(t(e.message || "L'annonce n'a pas été publiée. Réessayez."));
    } finally {
      setSubmitting(false);
    }
  }

  async function supprimer(p: Post) {
    const extrait = (p.contenu ?? "").slice(0, 60) + ((p.contenu ?? "").length > 60 ? "…" : "");
    const ok = await confirmer({
      titre: t("Supprimer la publication « {0} » ?", extrait),
      message: t("Elle disparaît du fil des marchands avec ses réactions et commentaires."),
      action: t("Supprimer la publication"),
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/axsocial/${p.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(t("Publication supprimée."));
      charger();
    } catch (e: any) {
      toast.error(t(e.message || "La publication n'a pas été supprimée. Réessayez."));
    }
  }

  return (
    <div className="space-y-5">
      {peutPublier && (
        <section className="cc-card p-4 space-y-3" style={{ borderColor: "var(--cc-accent)" }}>
          <h2 className="cc-h2 flex items-center gap-2"><Megaphone size={15} className="cc-warn" aria-hidden />{t("Nouvelle annonce officielle")}</h2>
          <label className="block text-[12px] space-y-1">
            <span className="cc-muted">{t("Message")}</span>
            <textarea
              value={contenu} onChange={e => setContenu(e.target.value)} maxLength={2000} rows={4}
              placeholder={t("Ex : Nouvelle fonctionnalité disponible, maintenance prévue, félicitations aux meilleurs vendeurs du mois…")}
              className="cc-input w-full py-2 h-auto resize-none" aria-invalid={!!erreur} aria-describedby="axsocial-aide"
            />
          </label>
          {erreur && <p className="text-[12px] cc-bad" role="alert">{erreur}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span id="axsocial-aide" className="text-[12px] cc-faint">{t("{0} / 2000 caractères", contenu.length)}</span>
            <button onClick={publier} disabled={submitting} className="cc-btn cc-btn-primary h-10 sm:h-8">
              {submitting ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Send size={14} aria-hidden />}{t("Publier à tous les marchands")}
            </button>
          </div>
        </section>
      )}

      <section className="cc-card overflow-hidden">
        <h2 className="cc-h2 px-4 pt-3.5 pb-2">{t("Publications Axso récentes")}</h2>
        {loading ? (
          <div className="flex justify-center py-10" role="status" aria-label={t("Chargement…")}><Loader2 size={18} className="animate-spin cc-faint" aria-hidden /></div>
        ) : erreurChargement ? (
          <EtatVide titre={t("Les publications n'ont pas pu être chargées.")} explication={t("Vérifiez votre connexion puis réessayez.")} action={<button className="cc-btn cc-btn-sm h-10 sm:h-8" onClick={charger}>{t("Réessayer")}</button>} />
        ) : posts.length === 0 ? (
          <EtatVide titre={t("Aucune publication pour l'instant.")} explication={peutPublier ? t("Rédigez une annonce ci-dessus : elle apparaîtra dans le fil de tous les marchands.") : undefined} />
        ) : (
          <ul className="divide-y cc-sep border-t cc-sep">
            {posts.map(p => (
              <li key={p.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] [overflow-wrap:anywhere] whitespace-pre-line">{p.contenu}</p>
                  <p className="text-[11.5px] mt-2 cc-muted">
                    {tempsEcoule(p.createdAt, t)} · {t("{0} vues", p.vues)} · {t("{0} réactions", p._count.reactions)} · {t("{0} commentaires", p._count.commentaires)}
                  </p>
                </div>
                {peutPublier && (
                  <button onClick={() => supprimer(p)} aria-label={t("Supprimer la publication")} className="cc-btn cc-btn-ghost cc-btn-sm cc-bad h-10 w-10 sm:h-8 sm:w-8 justify-center shrink-0">
                    <Trash2 size={14} aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {dialogue}
    </div>
  );
}
