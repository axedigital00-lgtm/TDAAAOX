// Adresse publique d'une boutique (urlBoutique) et liens du Constructeur rendus en vitrine (hrefBoutique).
import { test } from "node:test";
import assert from "node:assert/strict";

// Sous-domaines actifs comme en production (lu à l'import de lib/utils).
process.env.NEXT_PUBLIC_AXSO_DOMAIN = "axsoafrica.com";
process.env.NEXT_PUBLIC_SOUS_DOMAINES = "1";
const utils = () => import("@/lib/utils");

test("urlBoutique : domaine personnalisé actif, puis nom.axsoafrica.com, sinon /nom", async () => {
  const { urlBoutique } = await utils();
  const t = { slug: "kiosque" };
  assert.equal(urlBoutique({ ...t, sousDomaineAt: new Date() }), "https://kiosque.axsoafrica.com");
  assert.equal(urlBoutique({ ...t, sousDomaineAt: "2026-10-19" }, "/produits/abc"), "https://kiosque.axsoafrica.com/produits/abc");
  assert.equal(urlBoutique(t), "/kiosque", "sous-domaine pas encore accepté par Vercel : adresse relative");
  assert.equal(urlBoutique(t, "/tracking/x", "http://localhost:3000"), "http://localhost:3000/kiosque/tracking/x");
  assert.equal(urlBoutique({ ...t, sousDomaineAt: new Date(), customDomain: "kiosque.cm", domaineActifAt: new Date() }), "https://kiosque.cm");
  assert.equal(urlBoutique({ ...t, sousDomaineAt: new Date(), customDomain: "kiosque.cm", domaineActifAt: null }), "https://kiosque.axsoafrica.com", "domaine pas encore actif");
});

test("hrefBoutique : chemins propres et anciens formats mènent au même endroit", async () => {
  const { hrefBoutique } = await utils();
  const h = (l: string) => hrefBoutique("kiosque", l);
  // Sélecteur de lien (format actuel) et ancien format sans « / »
  assert.equal(h("/"), "/kiosque");
  assert.equal(h("/contact"), "/kiosque/contact");
  assert.equal(h("contact"), "/kiosque/contact");
  assert.equal(h("/produits/abc"), "/kiosque/produits/abc");
  assert.equal(h("/?ref=A1"), "/kiosque?ref=A1");
  // Anciens liens enregistrés
  assert.equal(h("/kiosque/contact"), "/kiosque/contact");
  assert.equal(h("/kiosque"), "/kiosque");
  assert.equal(h("https://axsoafrica.com/kiosque/contact"), "/kiosque/contact");
  assert.equal(h("https://www.axsoafrica.com/kiosque"), "/kiosque");
  assert.equal(h("https://kiosque.axsoafrica.com/contact"), "/kiosque/contact");
  assert.equal(h("https://kiosque.axsoafrica.com"), "/kiosque");
  assert.equal(h("http://localhost:3000/kiosque/a-propos"), "/kiosque/a-propos");
  // Ailleurs : intact
  assert.equal(h("https://axsoafrica.com/autre/contact"), "https://axsoafrica.com/autre/contact");
  assert.equal(h("https://autre.axsoafrica.com/contact"), "https://autre.axsoafrica.com/contact");
  assert.equal(h("https://wa.me/237600000000"), "https://wa.me/237600000000");
  assert.equal(h("#avis"), "#avis");
  assert.equal(h("mailto:a@b.cm"), "mailto:a@b.cm");
  assert.equal(h("/api/track/x"), "/api/track/x");
  assert.equal(h("  "), undefined);
  assert.equal(hrefBoutique("kiosque", null), undefined);
});

test("sous-domaine : seule une vraie boutique est servie", async () => {
  const { slugDeSousDomaine } = await import("../lib/utils");
  assert.equal(slugDeSousDomaine("ma-boutique.axsoafrica.com", "axsoafrica.com"), "ma-boutique");
  assert.equal(slugDeSousDomaine("Ma-Boutique.axsoafrica.com:443", "axsoafrica.com"), "ma-boutique");
  for (const h of ["admin.axsoafrica.com", "api.axsoafrica.com", "dashboard.axsoafrica.com", "www.axsoafrica.com", "a.b.axsoafrica.com", "axsoafrica.com", "ma-boutique.autre.com"]) assert.equal(slugDeSousDomaine(h, "axsoafrica.com"), null, h);
});
