// LIVRAISON NUMÉRIQUE — tests d'intégration sur la base LOCALE (`npm run test:integration`).
// Aucun appel réseau réel : Resend et Vercel Blob sont simulés par un faux fetch
// (tout autre hôte fait échouer le test). Une commande payée est livrée par la vraie
// livraison numérique, la vraie route de téléchargement et la vraie base.
// Une boutique de test est créée puis entièrement supprimée.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET as telecharger } from "@/app/api/telechargements/[token]/route";
import { livrerCommandeDigitale, reprendreLivraisons, cleAccesCommande, cleAccesValide } from "@/lib/livraison-numerique";
import { rembourserCommande } from "@/lib/remboursement";

const url = process.env.DATABASE_URL ?? "";
if (!/@localhost[/:]|host=\/var\/run/.test(url)) throw new Error("Tests d'intégration : DATABASE_URL doit pointer sur la base locale.");

// Secrets de TEST uniquement (jamais les vraies clés) : lus au moment de l'appel, après ces lignes.
Object.assign(process.env, {
  RESEND_API_KEY: "re_test_local", AUTH_SECRET: process.env.AUTH_SECRET || "secret-de-test", NEXT_PUBLIC_APP_URL: "http://localhost:3000",
});

// ─── Faux réseau ─────────────────────────────────────────────────────────────
const emails: any[] = [];
let resendEnPanne = false;
const vraiFetch = globalThis.fetch;
globalThis.fetch = (async (entree: any, init?: any) => {
  const u = new URL(typeof entree === "string" ? entree : entree.url);
  const json = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status, headers: { "content-type": "application/json" } });
  if (u.hostname === "api.resend.com") {
    if (resendEnPanne) return json({ name: "application_error", message: "panne simulée", statusCode: 500 }, 500);
    emails.push(JSON.parse(init?.body ?? "{}"));
    return json({ id: `email_${emails.length}` });
  }
  if (u.hostname.endsWith(".blob.vercel-storage.com")) return new Response(`CONTENU:${u.pathname}`, { headers: { "content-type": "application/pdf" } });
  throw new Error(`Réseau interdit en test : ${u.hostname}`);
}) as typeof fetch;

const X = `ln${randomBytes(4).toString("hex")}`;
const ids: Record<string, string> = {};

// Commande payée (à la livraison, encaissée) ou non : la livraison numérique ne regarde que le paiement.
async function nouvelleCommande(nom: string, produits: string[], payee = true, montant = 5500) {
  const c = await prisma.commande.create({
    data: {
      numero: `${X}-${nom}`, tenantId: ids.tenant, clientNom: "Awa Test", clientEmail: `awa-${X}@exemple.test`, clientTelephone: "+237600000001",
      adresseLivraison: "Digital", ville: "Douala", pays: "CM", montantSousTotal: montant, montantTotal: montant, devise: "XAF",
      methodePaiement: "direct_cod", paiementStatut: payee ? "completed" : "pending",
      lignes: { create: produits.map((p) => ({ produitId: p, nom: `Produit ${p.slice(-4)}`, prix: montant / produits.length, quantite: 1 })) },
    },
  });
  return c.id;
}

const dl = (token: string, fichier?: string) =>
  telecharger(new NextRequest(`http://localhost/api/telechargements/${token}${fichier ? `?fichier=${fichier}` : ""}`), { params: Promise.resolve({ token }) });

before(async () => {
  const t = await prisma.tenant.create({ data: { slug: X, nomBoutique: `Boutique ${X}`, categorie: "digital", pays: "CM", whatsapp: "+237600000000", email: `${X}@exemple.test`, statut: "active" } });
  ids.tenant = t.id;
  const pdf = await prisma.produit.create({ data: { tenantId: t.id, nom: `Guide PDF ${X}`, slug: `guide-${X}`, prix: 5000, type: "fichier", stock: 999 } });
  const pf = await prisma.produitFichier.create({ data: { produitId: pdf.id } });
  const f1 = await prisma.fichierNumerique.create({ data: { produitFichierId: pf.id, nom: "guide.pdf", url: `https://${X}.public.blob.vercel-storage.com/guide-secret.pdf`, mimeType: "application/pdf" } });
  ids.pdf = pdf.id; ids.f1 = f1.id;
  const lic = await prisma.produit.create({ data: { tenantId: t.id, nom: `Logiciel ${X}`, slug: `logiciel-${X}`, prix: 5000, type: "licence", stock: 999 } });
  const lp = await prisma.licenceProduit.create({ data: { produitId: lic.id } });
  await prisma.cleLicence.createMany({ data: [{ licenceProduitId: lp.id, cle: `${X}-CLE-1` }, { licenceProduitId: lp.id, cle: `${X}-CLE-2` }] });
  ids.lic = lic.id;
  // Produit d'une autre commande (sécurité : son fichier ne doit jamais sortir avec un autre jeton).
  const autre = await prisma.produit.create({ data: { tenantId: t.id, nom: `Autre ${X}`, slug: `autre-${X}`, prix: 5000, type: "fichier", stock: 999 } });
  const pf2 = await prisma.produitFichier.create({ data: { produitId: autre.id } });
  const f2 = await prisma.fichierNumerique.create({ data: { produitFichierId: pf2.id, nom: "autre.pdf", url: `https://${X}.public.blob.vercel-storage.com/autre.pdf` } });
  ids.autre = autre.id; ids.f2 = f2.id;
});

after(async () => {
  await new Promise((r) => setTimeout(r, 500)); // événements différés (bus AXSO CONTROL)
  // Cette boutique + les restes d'un essai interrompu (même motif de nom).
  const boutiques = (await prisma.tenant.findMany({ where: { OR: [{ id: ids.tenant }, { slug: { startsWith: "ln" }, nomBoutique: { startsWith: "Boutique ln" }, email: { endsWith: "@exemple.test" } }] }, select: { id: true } })).map((t) => t.id);
  const commandes = (await prisma.commande.findMany({ where: { tenantId: { in: boutiques } }, select: { id: true } })).map((c) => c.id);
  await prisma.telechargement.deleteMany({ where: { commandeId: { in: commandes } } });
  await prisma.accesFormation.deleteMany({ where: { commandeId: { in: commandes } } });
  await prisma.livraisonDigitale.deleteMany({ where: { commandeId: { in: commandes } } });
  await prisma.ligneCommande.deleteMany({ where: { commandeId: { in: commandes } } });
  await prisma.walletTransaction.deleteMany({ where: { wallet: { tenantId: { in: boutiques } } } });
  for (let passe = 0; passe < 3; passe++) {
    for (const m of Prisma.dmmf.datamodel.models) {
      if (!m.fields.some((f) => f.name === "tenantId")) continue;
      const delegue = (prisma as any)[m.name[0].toLowerCase() + m.name.slice(1)];
      await delegue?.deleteMany({ where: { tenantId: { in: boutiques } } }).catch(() => {});
    }
  }
  await prisma.tenant.deleteMany({ where: { id: { in: boutiques } } });
  globalThis.fetch = vraiFetch;
  await prisma.$disconnect();
});

test("C — commande payée → droits créés → e-mail confirmé par Resend", async () => {
  const id = await nouvelleCommande("c", [ids.pdf, ids.lic]);
  ids.cmdC = id;
  assert.ok((await livrerCommandeDigitale(id)).ok);
  const c = await prisma.commande.findUniqueOrThrow({ where: { id } });
  const jetons = await prisma.telechargement.findMany({ where: { commandeId: id } });
  assert.equal(jetons.length, 1);
  assert.match(jetons[0].token, /^[0-9a-f]{64}$/); // 256 bits
  assert.equal(await prisma.cleLicence.count({ where: { commandeId: id, statut: "vendue" } }), 1);
  const journal = await prisma.livraisonDigitale.findUniqueOrThrow({ where: { commandeId: id } });
  assert.equal(journal.statut, "livree");
  assert.equal(journal.emailStatut, "envoye");
  const mail = emails.find((e) => e.to === c.clientEmail || e.to?.[0] === c.clientEmail);
  assert.ok(mail, "e-mail envoyé");
  assert.ok(mail.html.includes(`Produit ${ids.pdf.slice(-4)}`), "nom du produit dans l'e-mail");
  assert.ok(mail.html.includes(`k=${cleAccesCommande(id)}`), "lien signé dans l'e-mail");
  assert.ok(!mail.html.includes("blob.vercel-storage.com"), "jamais l'adresse du fichier");
  // Téléchargement réel, en flux, depuis le stockage simulé.
  const r = await dl(jetons[0].token);
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "CONTENU:/guide-secret.pdf");
  assert.equal(r.headers.get("cache-control"), "private, no-store");
});

test("D — commande non payée : aucune livraison, jeton refusé (403)", async () => {
  const id = await nouvelleCommande("d", [ids.pdf], false);
  ids.cmdD = id;
  assert.deepEqual(await livrerCommandeDigitale(id), { ok: false, raison: "non_payee" });
  assert.equal(await prisma.telechargement.count({ where: { commandeId: id } }), 0);
  // Même un jeton planté à la main ne sert rien tant que la commande n'est pas payée.
  const token = randomBytes(32).toString("hex");
  await prisma.telechargement.create({ data: { token, commandeId: id, produitId: ids.pdf } });
  assert.equal((await dl(token)).status, 403);
});

test("E — livraison répétée (en série et en parallèle) → une seule livraison, un seul e-mail", async () => {
  const id = await nouvelleCommande("e", [ids.pdf, ids.lic]);
  const auClient = () => emails.filter((e) => [e.to].flat().includes(`awa-${X}@exemple.test`)).length;
  const avant = auClient();
  await Promise.all([livrerCommandeDigitale(id), livrerCommandeDigitale(id), livrerCommandeDigitale(id)]);
  await livrerCommandeDigitale(id);
  assert.equal(await prisma.telechargement.count({ where: { commandeId: id } }), 1);
  assert.equal(await prisma.cleLicence.count({ where: { commandeId: id } }), 1);
  assert.equal(auClient() - avant, 1, "un seul e-mail au client (l'alerte marchand est à part)");
});

test("F — Resend en panne : accès conservés, erreur journalisée, reprise puis e-mail envoyé", async () => {
  resendEnPanne = true;
  const id = await nouvelleCommande("f", [ids.pdf]);
  await livrerCommandeDigitale(id);
  let journal = await prisma.livraisonDigitale.findUniqueOrThrow({ where: { commandeId: id } });
  assert.equal(journal.statut, "livree");
  assert.equal(journal.emailStatut, "echec");
  assert.ok(journal.derniereErreur && !/re_test_local/.test(journal.derniereErreur), "erreur sans secret");
  const jeton = await prisma.telechargement.findFirstOrThrow({ where: { commandeId: id } });
  assert.equal((await dl(jeton.token)).status, 200, "téléchargement disponible malgré l'e-mail en échec");
  resendEnPanne = false;
  assert.ok((await reprendreLivraisons()) >= 1);
  journal = await prisma.livraisonDigitale.findUniqueOrThrow({ where: { commandeId: id } });
  assert.equal(journal.emailStatut, "envoye");
  assert.equal(journal.emailTentatives, 2);
  assert.equal(await prisma.telechargement.count({ where: { commandeId: id } }), 1, "reprise sans doublon");
});

test("G — sécurité : jeton inventé, fichier d'un autre produit, clé d'accès, limite", async () => {
  const jeton = await prisma.telechargement.findFirstOrThrow({ where: { commandeId: ids.cmdC } });
  assert.equal((await dl(randomBytes(32).toString("hex"))).status, 404, "jeton inventé");
  assert.equal((await dl("../../etc/passwd")).status, 404, "jeton mal formé");
  assert.equal((await dl(jeton.token, ids.f2)).status, 404, "fichier d'un autre produit avec mon jeton");
  const autreJeton = await prisma.telechargement.findFirstOrThrow({ where: { commandeId: ids.cmdD } });
  assert.equal((await dl(autreJeton.token, ids.f1)).status, 403, "jeton d'une autre commande (non payée)");
  assert.ok(cleAccesValide(ids.cmdC, cleAccesCommande(ids.cmdC)));
  assert.ok(cleAccesValide(ids.cmdC, `${cleAccesCommande(ids.cmdC)}?reference=trx.1`), "suffixe ajouté par la passerelle toléré");
  assert.ok(!cleAccesValide(ids.cmdC, cleAccesCommande(ids.cmdD)), "clé d'une autre commande");
  assert.ok(!cleAccesValide(ids.cmdC, ""), "sans clé");
  // Limite de téléchargements fixée par le marchand (anti-partage).
  await prisma.produit.update({ where: { id: ids.pdf }, data: { instructionsTelechargement: JSON.stringify({ limiteTelechargement: 2 }) } });
  const fait = (await prisma.telechargement.findUniqueOrThrow({ where: { id: jeton.id } })).nbTelechargements;
  for (let i = fait; i < 2; i++) assert.equal((await dl(jeton.token)).status, 200);
  assert.equal((await dl(jeton.token)).status, 403, "limite atteinte");
  await prisma.produit.update({ where: { id: ids.pdf }, data: { instructionsTelechargement: null } });
});

test("remboursement → accès révoqués (jeton, clé de licence, journal)", async () => {
  const r = await rembourserCommande({ commandeId: ids.cmdC, tenantId: ids.tenant, motif: "Test", restock: false });
  assert.ok(r.ok);
  const jeton = await prisma.telechargement.findFirstOrThrow({ where: { commandeId: ids.cmdC } });
  assert.ok(jeton.revoqueAt);
  assert.equal((await dl(jeton.token)).status, 403);
  assert.equal(await prisma.cleLicence.count({ where: { commandeId: ids.cmdC, statut: "revoquee" } }), 1);
  assert.equal((await prisma.livraisonDigitale.findUniqueOrThrow({ where: { commandeId: ids.cmdC } })).statut, "revoquee");
  assert.deepEqual(await livrerCommandeDigitale(ids.cmdC), { ok: false, raison: "non_payee" }, "jamais relivrée");
});
