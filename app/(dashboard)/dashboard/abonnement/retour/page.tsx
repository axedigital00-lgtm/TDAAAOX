"use client";
// Retour de la page de paiement : l'état affiché vient du serveur, jamais de l'adresse.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Card } from "@/components/dashboard/design-system/components/primitives";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { useT } from "@/components/I18nProvider";

function Etat() {
  const t = useT();
  const id = useSearchParams().get("id");
  const [statut, setStatut] = useState<string>(id ? "cree" : "introuvable");
  const [lien, setLien] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let fin = false, essais = 0, minuteur: ReturnType<typeof setTimeout>;
    const lire = async () => {
      const r = await fetch(`/api/abonnement/paiement/${encodeURIComponent(id)}`).catch(() => null);
      const d = r?.ok ? await r.json().catch(() => null) : null;
      if (fin) return;
      if (r?.status === 404) return setStatut("introuvable");
      if (d?.statut) setStatut(d.statut);
      setLien(d?.lienAutorisation ?? null);
      if ((!d || d.statut === "cree") && ++essais < 40) minuteur = setTimeout(lire, 3000);
    };
    lire();
    return () => { fin = true; clearTimeout(minuteur); };
  }, [id]);
  const contenu: Record<string, { ton: "success" | "critical" | "warning" | "info"; texte: string }> = {
    cree: { ton: "info", texte: "Une demande de paiement est arrivée sur ton téléphone : entre ton code secret Mobile Money pour valider. Cette page se met à jour toute seule." },
    paye: { ton: "success", texte: "Paiement confirmé. Ton forfait est actif." },
    echoue: { ton: "critical", texte: "Le paiement n'a pas abouti. Aucun forfait n'a été activé, tu peux réessayer." },
    a_verifier: { ton: "warning", texte: "Ton paiement est en cours de vérification par l'équipe AXSO." },
    introuvable: { ton: "warning", texte: "Ce paiement est introuvable." },
  };
  const c = contenu[statut] ?? contenu.a_verifier;
  return <Card><div className="axd-stack"><Banner tone={c.ton}>{t(c.texte)}</Banner><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{statut === "cree" && lien && <Button variant="primary" href={lien}>{t("Valider dans mon application Mobile Money")}</Button>}<Button variant={statut === "cree" && lien ? "default" : "primary"} href="/dashboard/abonnement">{t("Retour à l'abonnement")}</Button></div></div></Card>;
}

export default function RetourPaiementPage() {
  const t = useT();
  return <Page><PageHeader icon="card" title={t("Paiement de l'abonnement")} backHref="/dashboard/abonnement" /><Suspense fallback={null}><Etat /></Suspense></Page>;
}
