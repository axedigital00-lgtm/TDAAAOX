// Plan du site d'une boutique, servi sur sa propre adresse (/sitemap.xml, réécrit par proxy.ts) :
// accueil, produits actifs (avec leur image), collections, catalogue, pages publiées.
import { pagesBoutique } from "@/lib/seo-boutique";

export const revalidate = 3600;

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const r = await pagesBoutique((await params).slug).catch(() => null);
  if (!r) return new Response("Boutique introuvable", { status: 404 });
  const corps = r.urls.map((u) => [
    "<url>",
    `<loc>${xml(u.loc)}</loc>`,
    `<lastmod>${u.lastmod.toISOString()}</lastmod>`,
    `<priority>${u.priorite.toFixed(1)}</priority>`,
    "image" in u && u.image ? `<image:image><image:loc>${xml(u.image)}</image:loc>${u.titre ? `<image:title>${xml(u.titre)}</image:title>` : ""}</image:image>` : "",
    "</url>",
  ].join("")).join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${corps}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } },
  );
}
