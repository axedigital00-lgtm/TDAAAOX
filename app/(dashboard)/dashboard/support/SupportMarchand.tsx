"use client";
// Formulaire « Signaler un problème » et suivi des signalements de la boutique (statut + réponse d'Axso).
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LifeBuoy, Loader2, Send, X } from "lucide-react";
import { MediaUpload } from "@/components/ui/MediaUpload";
import { useT } from "@/components/I18nProvider";
import { Badge, Bouton, BoutonIcone, EnTetePage, EtatVide, SqueletteListe, ZoneTexte, type Ton } from "@/components/ui";
import { NOM_STATUT, CLE_DERNIERE_ERREUR, pageNormalisee, type StatutSignalement } from "@/lib/signalements";

interface Signalement { id: string; description: string; capture: string | null; page: string; statut: StatutSignalement; reponse: string | null; reponduLe: string | null; createdAt: string }
const TON: Record<StatutSignalement, Ton> = { ouvert: "attention", en_cours: "info", resolu: "succes" };

function derniereErreur(): string | null {
  try {
    const e = JSON.parse(sessionStorage.getItem(CLE_DERNIERE_ERREUR) ?? "null");
    return e && Date.now() - e.date < 3600_000 ? e.texte : null;
  } catch { return null; }
}

export function SupportMarchand({ depuis }: { depuis: string }) {
  const t = useT();
  const page = pageNormalisee(depuis) || "/dashboard";
  const [description, setDescription] = useState("");
  const [capture, setCapture] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [liste, setListe] = useState<Signalement[] | null>(null);

  const charger = () => fetch("/api/signalements").then((r) => r.ok ? r.json() : Promise.reject()).then((d) => setListe(d.signalements ?? [])).catch(() => setListe([]));
  useEffect(() => { setErreur(derniereErreur()); charger(); }, []);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    const r = await fetch("/api/signalements", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, capture, page, erreur, ecran: `${screen.width}×${screen.height} (${innerWidth}×${innerHeight})` }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setEnvoi(false);
    if (!r?.ok) return void toast.error(d?.error ? t(d.error) : t("Le signalement n'a pas été envoyé. Vérifie ta connexion et réessaie : ton texte est conservé."));
    toast.success(t("Merci ! L'équipe Axso a reçu ton signalement."));
    setDescription(""); setCapture(null); setErreur(null);
    try { sessionStorage.removeItem(CLE_DERNIERE_ERREUR); } catch {}
    charger();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <EnTetePage className="mb-0"
        titre={<span className="inline-flex items-center gap-2"><LifeBuoy className="size-5 text-attention" aria-hidden />{t("Signaler un problème")}</span>}
        description={t("Décris ce qui ne va pas : l'équipe Axso te répond ici.")} />

      <form onSubmit={envoyer} className="ax-card p-5 space-y-champs">
        <ZoneTexte label={t("Que s'est-il passé ?")} required minLength={10} maxLength={4000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder={t("Ce que tu faisais, ce que tu attendais, ce qui s'est passé à la place…")}
          aide={t("10 caractères minimum.")} />
        <div>
          <span className="ax-libelle">{t("Capture d'écran")} <span className="text-xs font-normal text-doux">{t("(facultatif)")}</span></span>
          {capture ? (
            <div className="mt-1.5 relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capture} alt={t("Capture d'écran")} className="max-h-48 rounded-controle border border-bordure" />
              <BoutonIcone label={t("Retirer la capture")} variante="secondaire" onClick={() => setCapture(null)} className="absolute -top-3 -right-3 rounded-full"><X className="size-4" aria-hidden /></BoutonIcone>
            </div>
          ) : <div className="mt-1.5"><MediaUpload type="image" onUrl={setCapture} /></div>}
        </div>
        <div className="text-xs text-doux bg-carte-2 rounded-controle p-3 space-y-1">
          <p className="font-semibold text-encre">{t("Joint automatiquement")}</p>
          <p>{t("Page : {0}", page)} · {t("ta boutique, ton compte, ton navigateur et ton appareil")}</p>
          {erreur && <p className="font-mono break-words">{t("Dernière erreur : {0}", erreur)} <button type="button" className="underline min-h-10 px-1" onClick={() => setErreur(null)}>{t("ne pas joindre")}</button></p>}
        </div>
        <Bouton type="submit" charge={envoi} texteCharge={t("Envoi…")} icone={<Send className="size-4" aria-hidden />}>{t("Envoyer le signalement")}</Bouton>
      </form>

      <section className="space-y-3">
        <h2 className="ax-titre-section">{t("Mes signalements")}</h2>
        {liste == null ? <SqueletteListe lignes={2} libelle={t("Chargement de tes signalements…")} /> : !liste.length ? (
          <EtatVide compact titre={t("Aucun signalement pour l'instant.")} texte={t("Tes signalements et les réponses d'Axso apparaîtront ici.")} />
        ) : liste.map((s) => (
          <div key={s.id} className="ax-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="ax-aide break-all">{new Date(s.createdAt).toLocaleString(t.loc)} · {s.page}</span>
              <Badge ton={TON[s.statut] ?? "neutre"}>{t(NOM_STATUT[s.statut] ?? s.statut)}</Badge>
            </div>
            <p className="text-sm text-encre whitespace-pre-line break-words">{s.description}</p>
            {s.reponse && (
              <div className="mt-3 rounded-controle bg-primaire-fond border border-attention-bordure p-3">
                <p className="text-xs font-semibold text-attention mb-1">{t("Réponse d'Axso")}{s.reponduLe ? ` · ${new Date(s.reponduLe).toLocaleDateString(t.loc)}` : ""}</p>
                <p className="text-sm text-encre whitespace-pre-line break-words">{s.reponse}</p>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
