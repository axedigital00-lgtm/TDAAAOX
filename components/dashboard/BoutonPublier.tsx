"use client";
// « Publier ma boutique » hors du constructeur (PROMPT MISSION B8) : même route et mêmes critères
// (PATCH /api/tenants → lib/boutique-completion.ts). Refus : chaque critère manquant mène à l'endroit
// où le corriger. Succès : écran sobre de partage, puis ce qu'il reste pour bien vendre (B10).
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MessageCircle, Rocket } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Bouton, Modale, classesBouton } from "@/components/ui";
import { CopierLien } from "@/components/dashboard/tableau-de-bord/CopierLien";
import { BoutonQrBoutique } from "@/components/dashboard/BoutonQrBoutique";
import { MODELE_PARTAGE_BOUTIQUE, TITRES_ETAPES, lienWhatsapp } from "@/lib/demarrage-messages";
import { urlBoutique } from "@/lib/utils";
import type { EtatCompletude } from "@/lib/demarrage";

type Critere = { cle: string; label: string; href: string };
type Resultat =
  | { type: "refus"; criteres: Critere[]; erreur?: string }
  | { type: "publiee"; url: string; nom: string; manquantes: EtatCompletude["manquantes"] };

export function BoutonPublier({ variante = "plein" }: { variante?: "plein" | "compact" }) {
  const t = useT();
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);

  async function publier() {
    setEnCours(true);
    try {
      const res = await fetch("/api/tenants", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut: "active" }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.criteres?.length) setResultat({ type: "refus", criteres: data.criteres });
        else toast.error(t(data.error || "Publication impossible. Réessaie dans un instant."));
        return;
      }
      const etat: EtatCompletude | null = await fetch("/api/demarrage").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      setResultat({
        type: "publiee",
        url: urlBoutique(data.tenant, "", window.location.origin),
        nom: data.tenant.nomBoutique,
        manquantes: etat?.manquantes ?? [],
      });
    } catch {
      toast.error(t("Publication impossible. Vérifie ta connexion et réessaie."));
    } finally {
      setEnCours(false);
    }
  }

  function fermer() {
    // Après publication seulement : la page se met à jour (statut « En ligne »).
    if (resultat?.type === "publiee") router.refresh();
    setResultat(null);
  }

  return (
    <>
      <Bouton onClick={publier} charge={enCours} taille={variante === "compact" ? "compact" : "normal"} className={variante === "compact" ? undefined : "w-full sm:w-auto"}
        icone={<Rocket size={variante === "compact" ? 14 : 16} aria-hidden />}>
        {t("Publier ma boutique")}
      </Bouton>

      <Modale ouverte={!!resultat} onFermer={fermer}
        titre={resultat?.type === "publiee" ? t("Ta boutique est en ligne !") : t("Il manque encore quelque chose")}
        description={resultat?.type === "refus" ? t("Pour publier, complète ces points :") : resultat ? t("Tes clients peuvent maintenant commander. Partage ton lien :") : undefined}>
        {resultat?.type === "refus" ? (
          <ul className="space-y-2">
            {resultat.criteres.map((c) => (
              <li key={c.cle}>
                <Link href={c.href} onClick={fermer}
                  className="flex items-center justify-between gap-3 rounded-controle border border-bordure bg-carte-2 px-4 min-h-12 py-3 text-sm font-semibold text-encre hover:border-bordure-forte transition-colors">
                  {t(c.label)}<ArrowRight size={16} className="text-attention flex-shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : resultat ? (
          <>
            {/* Fond sombre : CopierLien et BoutonQrBoutique sont dessinés pour ce fond (comme au Tableau de bord). */}
            <div className="rounded-controle bg-secondaire text-carte p-3">
            <p className="rounded-controle bg-white/10 px-4 py-3 text-sm break-all">{resultat.url.replace(/^https?:\/\//, "")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={lienWhatsapp(t(MODELE_PARTAGE_BOUTIQUE, resultat.nom, resultat.url))} target="_blank" rel="noopener noreferrer"
                className={classesBouton({ variante: "secondaire", taille: "compact" })}>
                <MessageCircle size={14} className="text-succes" aria-hidden />{t("Partager sur WhatsApp")}
              </a>
              <CopierLien url={resultat.url} />
              <BoutonQrBoutique url={resultat.url} nomBoutique={resultat.nom} />
            </div>
            </div>
            {resultat.manquantes.length > 0 && (
              <div className="mt-5 border-t border-bordure pt-4">
                <p className="ax-libelle">{t("Pour bien vendre, il te reste :")}</p>
                <ul className="mt-2 space-y-1">
                  {resultat.manquantes.map((m) => (
                    <li key={m.cle}>
                      <Link href={m.href} onClick={fermer} className="flex items-center justify-between gap-3 min-h-10 text-sm text-doux hover:text-encre">
                        {t(TITRES_ETAPES[m.cle])}<ArrowRight size={15} className="text-attention flex-shrink-0" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}
      </Modale>
    </>
  );
}
