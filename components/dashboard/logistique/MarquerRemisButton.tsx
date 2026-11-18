"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { Bouton, useConfirmation } from "@/components/ui";

/** `objet` : ce qui est confirmé, nommé (« Moussa — 3 commandes — 45 000 FCFA »). */
export function MarquerRemisButton({ commandeIds, objet }: { commandeIds: string[]; objet: string }) {
  const t = useT();
  const router = useRouter();
  const { confirmer, dialogue } = useConfirmation();
  const [loading, setLoading] = useState(false);

  async function marquerRemis() {
    const ok = await confirmer({
      titre: t("Confirmer que tu as reçu cet argent ?"),
      objet,
      description: t("Ces commandes sortiront de la liste des encaissements à recevoir. Ne confirme qu'une fois l'argent réellement en main."),
      libelleConfirmer: t("Oui, j'ai reçu l'argent"),
      destructive: false,
    });
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch("/api/commandes/remise-cod", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandeIds }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("Remise enregistrée : {0} commande(s) réconciliée(s).", commandeIds.length));
      router.refresh();
    } catch {
      toast.error(t("La remise n'a pas pu être enregistrée. Vérifie ta connexion puis réessaie."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {dialogue}
      <Bouton onClick={marquerRemis} charge={loading} texteCharge={t("Enregistrement…")} icone={<CheckCircle2 className="size-4" aria-hidden />}>
        {t("J'ai reçu l'argent")}
      </Bouton>
    </>
  );
}
