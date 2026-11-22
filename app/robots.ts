import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://www.axsoafrica.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api", "/livreur", "/oauth", "/affilie", "/scanner", "/depot", "/transporteur$"] },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
