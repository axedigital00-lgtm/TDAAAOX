"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { memoriserRef } from "@/lib/ref-affiliation";

// Capture le code d'affiliation (?ref=CODE) dès la première page visitée sur
// la boutique — page produit, collection, accueil… — pas seulement au
// checkout. Sans ça, un lien d'affiliation vers une fiche produit précise
// perdait le code dès que le client naviguait avant de passer commande.
export function AffiliationRefCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref) {
      memoriserRef(ref);
      fetch("/api/affilie/track-clic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: ref }),
      }).catch(() => {});
    }
  }, [searchParams]);

  return null;
}
