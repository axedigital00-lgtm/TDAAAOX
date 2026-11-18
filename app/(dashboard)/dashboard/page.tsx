import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// /dashboard n'a plus de page à lui : AXIA vit dans le panneau de droite (components/dashboard/AxiaPanneau.tsx).
// Boutique en brouillon → Démarrer, sinon Tableau de bord. ?axia=<question> suit la redirection :
// le panneau s'ouvre et envoie la question (liens externes, notifications, anciens liens).
export default async function DashboardHomePage({ searchParams }: { searchParams: Promise<{ axia?: string | string[] }> }) {
  const session = await auth();
  const tenantId = (session?.user as any)?.tenantId as string | undefined;
  const t = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { statut: true } }) : null;
  const base = t?.statut === "brouillon" ? "/dashboard/demarrer" : "/dashboard/accueil";
  const { axia } = await searchParams;
  const question = Array.isArray(axia) ? axia[0] : axia;
  redirect(question === undefined ? base : `${base}?axia=${encodeURIComponent(question)}`);
}
