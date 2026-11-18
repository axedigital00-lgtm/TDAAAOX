"use client";
// « Donnez votre avis sur Axso » : carte de l'accueil marchand. L'avis part en
// validation (/admin/avis) puis s'affiche sur la landing, avec l'accord du marchand.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, X, MessageSquareHeart, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Bouton, BoutonIcone, Modale, Saisie, ZoneTexte } from "@/components/ui";

export interface AvisExistant { note: number; texte: string; auteurNom: string; auteurRole: string | null; ville: string | null; statut: string; motifRefus: string | null }

const CLE_PLUS_TARD = "axso-avis-plus-tard";

export function AvisAxsoCarte({ avis, nomParDefaut }: { avis: AvisExistant | null; nomParDefaut: string }) {
  const t = useT();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [masque, setMasque] = useState(false);
  // « Plus tard » mémorisé 7 jours dans ce navigateur (lu après le montage : pas d'écart d'hydratation).
  useEffect(() => {
    if (avis) return;
    try { if (Number(localStorage.getItem(CLE_PLUS_TARD) ?? 0) > Date.now()) setMasque(true); } catch {}
  }, [avis]);
  const [note, setNote] = useState(avis?.note ?? 0);
  const [survol, setSurvol] = useState(0);
  const [form, setForm] = useState({ texte: avis?.texte ?? "", auteurNom: avis?.auteurNom ?? nomParDefaut, auteurRole: avis?.auteurRole ?? "", ville: avis?.ville ?? "", consentement: !!avis });
  const [charge, setCharge] = useState(false);
  const [erreurNote, setErreurNote] = useState("");

  if (masque) return null;

  const plusTard = () => { try { localStorage.setItem(CLE_PLUS_TARD, String(Date.now() + 7 * 86_400_000)); } catch {} setMasque(true); };
  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) return setErreurNote(t("Choisissez une note de 1 à 5 étoiles."));
    setCharge(true);
    const r = await fetch("/api/avis-plateforme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, note }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setCharge(false);
    if (!r?.ok) return toast.error(d?.error ?? t("Votre avis n'a pas pu être envoyé. Vérifiez votre connexion et réessayez."));
    toast.success(t("Merci ! Votre avis sera publié après relecture par l'équipe Axso."));
    setOuvert(false);
    router.refresh();
  };

  const statut = avis?.statut;
  const Etat = statut === "approuve" ? CheckCircle2 : statut === "refuse" ? AlertCircle : Clock;

  const tonEtat = statut === "approuve" ? "text-succes" : statut === "refuse" ? "text-erreur" : "text-attention";

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 rounded-carte border border-bordure bg-carte">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-controle flex items-center justify-center flex-shrink-0 bg-primaire-fond" aria-hidden>
            {avis ? <Etat className={`size-4 ${tonEtat}`} /> : <MessageSquareHeart className="size-4 text-attention" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="ax-libelle font-bold">
              {!avis ? t("Que pensez-vous d'Axso ?") : statut === "approuve" ? t("Votre avis est publié sur axsoafrica.com") : statut === "refuse" ? t("Votre avis n'a pas été publié") : t("Votre avis est en cours de relecture")}
            </p>
            <p className="ax-aide">
              {!avis ? t("Votre avis aide d'autres commerçants à se lancer. Il est publié sur notre site après relecture, uniquement avec votre accord.")
                : statut === "refuse" ? `${t("Motif")} : ${avis.motifRefus ?? "—"}` : `${"★".repeat(avis.note)}${"☆".repeat(5 - avis.note)} · « ${avis.texte.slice(0, 90)}${avis.texte.length > 90 ? "…" : ""} »`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Bouton variante={avis ? "secondaire" : "primaire"} taille="compact" onClick={() => setOuvert(true)} className="max-sm:flex-1">
            {avis ? t("Modifier mon avis") : t("Donner mon avis")}
          </Bouton>
          {!avis && <BoutonIcone label={t("Plus tard")} onClick={plusTard}><X className="size-4" aria-hidden /></BoutonIcone>}
        </div>
      </div>

      <Modale ouverte={ouvert} onFermer={() => setOuvert(false)} verrouillee={charge}
        titre={t("Votre avis sur Axso")}
        description={t("Relu par l'équipe Axso avant publication. Toute modification repasse en relecture.")}
        actions={<>
          <Bouton variante="secondaire" onClick={() => setOuvert(false)} disabled={charge}>{t("Annuler")}</Bouton>
          <Bouton type="submit" form="form-avis-axso" charge={charge} texteCharge={t("Envoi…")}>{t("Envoyer mon avis")}</Bouton>
        </>}>
        <form id="form-avis-axso" onSubmit={envoyer} className="space-y-champs">
          <fieldset>
            <legend className="ax-libelle mb-1.5">{t("Votre note")} <span className="ml-1 text-xs font-normal text-doux">{t("(obligatoire)")}</span></legend>
            <div className="flex gap-1" onMouseLeave={() => setSurvol(0)} role="radiogroup" aria-label={t("Note sur 5")}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={note === n} aria-label={`${n} / 5`} onMouseEnter={() => setSurvol(n)}
                  onClick={() => { setNote(n); setErreurNote(""); }} className="p-1 rounded-controle focus-visible:outline-2 focus-visible:outline-focus">
                  <Star size={28} aria-hidden className={(survol || note) >= n ? "text-primaire fill-current" : "text-bordure-forte"} />
                </button>
              ))}
            </div>
            {erreurNote && <p role="alert" className="ax-erreur-champ mt-1">{erreurNote}</p>}
          </fieldset>
          <ZoneTexte label={t("Votre expérience")} required minLength={30} maxLength={600} rows={5} value={form.texte}
            onChange={(e) => setForm({ ...form, texte: e.target.value })}
            placeholder={t("Qu'est-ce qu'Axso a changé pour votre commerce ?")}
            aide={<>{form.texte.trim().length}/600 · {t("30 caractères minimum")}</>} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Saisie label={t("Nom affiché")} required minLength={2} maxLength={60} value={form.auteurNom} onChange={(e) => setForm({ ...form, auteurNom: e.target.value })} placeholder="Fatou N." />
            <Saisie label={t("Fonction")} mention="facultatif" maxLength={80} value={form.auteurRole} onChange={(e) => setForm({ ...form, auteurRole: e.target.value })} placeholder={t("Fondatrice")} />
            <Saisie label={t("Ville")} mention="facultatif" className="sm:col-span-2" maxLength={60} value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} placeholder="Douala" />
          </div>
          <label className="flex min-h-10 items-start gap-2.5 ax-texte-secondaire">
            <input type="checkbox" required checked={form.consentement} onChange={(e) => setForm({ ...form, consentement: e.target.checked })} className="mt-1 size-4 accent-primaire" />
            <span>{t("J'accepte qu'Axso publie cet avis sur son site avec le nom affiché, ma ville et le nom de ma boutique.")}</span>
          </label>
        </form>
      </Modale>
    </>
  );
}
