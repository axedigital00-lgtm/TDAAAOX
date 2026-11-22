import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { seoPage } from "@/lib/seo";
import { auth } from "@/lib/auth";
import { paysVisiteur } from "@/lib/devise-visiteur";
import { FormulaireLivreur } from "./FormulaireLivreur";

export const metadata: Metadata = seoPage("/inscription/livreur");

// Pays du visiteur (cookie ou détection IP) → exemple de numéro avec le bon indicatif.
export default async function InscriptionLivreurPage() {
  if ((await auth())?.user) redirect("/transporteur");
  return <FormulaireLivreur pays={await paysVisiteur()} />;
}
