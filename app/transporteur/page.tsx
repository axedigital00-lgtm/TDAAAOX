import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { I18nProvider } from "@/components/I18nProvider";
import { dico, getLangue } from "@/lib/i18n/serveur";
import { PortailTransporteur } from "@/components/logistique/PortailTransporteur";

export const metadata: Metadata = { title: "Portail transporteur · AXSO", robots: { index: false, follow: false } };

export default async function TransporteurPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion?callbackUrl=/transporteur");
  return <I18nProvider langue={await getLangue()} dico={await dico("dashboard")}><PortailTransporteur /></I18nProvider>;
}
