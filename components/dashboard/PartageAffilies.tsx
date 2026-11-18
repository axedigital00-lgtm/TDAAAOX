"use client";
// Carte « Recruter des affiliés » de Démarrer : lien /rejoindre/{programmeId} de la boutique (pas le
// parrainage Axso). Copier ou partager marque l'étape (POST /api/demarrage).
import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Bouton, classesBouton } from "@/components/ui";
import { MODELE_RECRUTEMENT_AFFILIES, lienWhatsapp } from "@/lib/demarrage-messages";

const marquer = () =>
  fetch("/api/demarrage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lien_affilies_partage" }) }).catch(() => {});

export function PartageAffilies({ lien, nomBoutique }: { lien: string; nomBoutique: string }) {
  const t = useT();
  const [copie, setCopie] = useState(false);
  const message = t(MODELE_RECRUTEMENT_AFFILIES, nomBoutique, lien);

  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
      toast.success(t("Lien d'affiliation copié."));
      marquer();
    } catch {
      toast.error(t("Copie impossible : sélectionne l'adresse et copie-la à la main."));
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="rounded-controle bg-carte-2 px-3 py-2 ax-texte-secondaire">{message}</p>
      <div className="flex flex-wrap gap-2">
        <Bouton variante="secondaire" taille="compact" onClick={copier}
          icone={copie ? <Check size={14} className="text-succes" aria-hidden /> : <Copy size={14} aria-hidden />}>
          {copie ? t("Copié") : t("Copier le lien")}
        </Bouton>
        <a href={lienWhatsapp(message)} target="_blank" rel="noopener noreferrer" onClick={marquer}
          className={classesBouton({ variante: "secondaire", taille: "compact" })}>
          <MessageCircle size={14} className="text-succes" aria-hidden />{t("Partager sur WhatsApp")}
        </a>
      </div>
    </div>
  );
}
