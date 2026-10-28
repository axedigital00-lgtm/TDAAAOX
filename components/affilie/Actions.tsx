"use client";
// Actions de l'espace affilié : copier/partager un lien, obtenir le lien d'un produit, retirer ses gains.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Check, MessageCircle, Loader2, Link2, Clock } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { formatMontant } from "@/lib/utils";

const wa = (texte: string) => `https://wa.me/?text=${encodeURIComponent(texte)}`;

export function Partager({ lien, nom }: { lien: string; nom: string }) {
  const t = useT();
  const [copie, setCopie] = useState(false);
  const copier = () => navigator.clipboard.writeText(lien).then(() => {
    setCopie(true); toast.success(t("Lien copié !")); setTimeout(() => setCopie(false), 2000);
  }, () => toast.error(t("Copie impossible : sélectionnez le lien à la main.")));
  return (
    <div className="flex gap-2">
      <button onClick={copier} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#111] text-white text-[12.5px] font-semibold active:scale-[0.98]">
        {copie ? <Check size={14} className="text-[#F5A623]" /> : <Copy size={14} />}{copie ? t("Copié !") : t("Copier le lien")}
      </button>
      <a href={wa(t("🛍️ Je te recommande *{0}* ! Commande ici : {1}", nom, lien))} target="_blank" rel="noopener noreferrer" aria-label={t("Partager sur WhatsApp")}
        className="w-11 flex items-center justify-center rounded-xl bg-[#25D366] text-white"><MessageCircle size={16} /></a>
    </div>
  );
}

/** Bouton d'une carte du catalogue : crée le partenariat au besoin et donne le lien du produit. */
export function ObtenirLien({ produitId, nom, partenariat, validationManuelle }: {
  produitId: string; nom: string; partenariat: "actif" | "en_attente" | "suspendu" | null; validationManuelle: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [lien, setLien] = useState<string | null>(null);
  const [statut, setStatut] = useState(partenariat);
  const [envoi, setEnvoi] = useState(false);

  async function obtenir() {
    setEnvoi(true);
    try {
      const res = await fetch("/api/affilie/lien", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ produitId }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Erreur");
      setStatut(d.statut);
      if (d.statut === "actif") setLien(d.lien);
      else { toast.success(t("Demande envoyée : la boutique doit valider votre partenariat.")); router.refresh(); }
    } catch (e: any) { toast.error(t(e.message)); } finally { setEnvoi(false); }
  }

  if (lien) return <Partager lien={lien} nom={nom} />;
  if (statut === "suspendu") return <p className="text-[11.5px] text-center text-red-600 py-2.5">{t("Partenariat suspendu par la boutique")}</p>;
  if (statut === "en_attente") return <p className="text-[11.5px] text-center text-amber-700 py-2.5 flex items-center justify-center gap-1"><Clock size={13} />{t("En attente de validation")}</p>;
  return (
    <button onClick={obtenir} disabled={envoi}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#F5A623] text-[#111] text-[12.5px] font-bold disabled:opacity-60 active:scale-[0.98]">
      {envoi ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
      {!statut && validationManuelle ? t("Demander à rejoindre") : t("Obtenir mon lien")}
    </button>
  );
}

/** Retrait de tout le disponible d'une devise vers un numéro Mobile Money. */
export function Retirer({ devise, disponible, minimum, telephone }: { devise: string; disponible: number; minimum: number; telephone: string }) {
  const t = useT();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [tel, setTel] = useState(telephone);
  const [envoi, setEnvoi] = useState(false);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    try {
      const res = await fetch("/api/affilie/retrait", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ devise, telephone: tel }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Erreur");
      toast.success(t("Demande envoyée : Axso vous prévient par e-mail dès que l'argent est envoyé."));
      setOuvert(false);
      router.refresh();
    } catch (e: any) { toast.error(t(e.message)); } finally { setEnvoi(false); }
  }

  if (disponible < minimum) {
    return <p className="text-[11.5px] text-white/50">{t("Retrait possible dès {0} disponibles", formatMontant(minimum, devise))}</p>;
  }
  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} className="px-4 py-2.5 rounded-xl bg-[#F5A623] text-[#111] text-[13px] font-bold">
        {t("Retirer {0}", formatMontant(disponible, devise))}
      </button>
    );
  }
  return (
    <form onSubmit={envoyer} className="space-y-2 w-full">
      <label className="block text-[11.5px] text-white/60">{t("Numéro Mobile Money (avec l'indicatif du pays)")}</label>
      <input required value={tel} onChange={(e) => setTel(e.target.value)} placeholder="+237 6XX XX XX XX" inputMode="tel"
        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-[#F5A623]/60" />
      <div className="flex gap-2">
        <button type="submit" disabled={envoi} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#F5A623] text-[#111] text-[13px] font-bold disabled:opacity-60">
          {envoi && <Loader2 size={14} className="animate-spin" />}{t("Envoyer {0}", formatMontant(disponible, devise))}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="px-4 rounded-xl border border-white/15 text-[13px] text-white/70">{t("Annuler")}</button>
      </div>
    </form>
  );
}
