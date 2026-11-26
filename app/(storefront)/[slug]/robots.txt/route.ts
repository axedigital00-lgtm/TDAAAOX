// robots.txt d'une boutique, sur sa propre adresse (/robots.txt, réécrit par proxy.ts) : tout est
// ouvert aux moteurs sauf les pages privées (panier, paiement, compte client…), et le plan du site.
import { prisma } from "@/lib/prisma";
import { adresse, PAGES_PRIVEES } from "@/lib/seo-boutique";

export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const t = await prisma.tenant.findUnique({ where: { slug: (await params).slug }, select: { slug: true, statut: true, customDomain: true, domaineActifAt: true, sousDomaineAt: true } }).catch(() => null);
  // Boutique pas encore en ligne : rien à référencer.
  if (!t || t.statut !== "active") return new Response("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const lignes = ["User-agent: *", "Allow: /", ...PAGES_PRIVEES.map((p) => `Disallow: ${p}`), "Disallow: /api/", "", `Sitemap: ${adresse(t, "/sitemap.xml")}`, ""];
  return new Response(lignes.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
