// Lot 5 (refonte admin) : le nouveau menu garde toutes les entrées de l'ancien (D6), avec les mêmes
// droits, verrous de palier et mode caisse, et chaque lien mène à une page qui existe (D23).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pagesDashboard, groupesVisibles } from "@/components/dashboard/Sidebar";
import { AUTRES_OUTILS } from "@/components/dashboard/MobileBottomNav";
import { MENU, SECTIONS_PARAMETRES, pagesMenu, sectionsVisibles, estActif } from "@/components/dashboard/shell/menu";
import { ROLE_PRESETS, type ModuleKey, type Niveau } from "@/lib/permissions";

// Entrées nouvelles dans le menu (pages déjà existantes, D23) ; « Signaler un problème » est dans le menu du compte.
const AJOUTS = new Set(["/dashboard/marketing/codes-promo", "/dashboard/clients/segments"]);
const HORS_MENU = new Set(["/dashboard/support"]);

const grilles: [string, Record<ModuleKey, Niveau> | undefined][] = [["propriétaire", undefined], ...Object.entries(ROLE_PRESETS)];

test("menu : mêmes entrées visibles que l'ancien menu (barre + tiroir mobile), pour chaque rôle", () => {
  for (const [role, perms] of grilles) {
    const autorise = (it: { moduleKey?: ModuleKey }) => !perms || !it.moduleKey || perms[it.moduleKey] !== "aucun";
    const avant = new Set([...pagesDashboard(perms).map((p) => p.href), ...AUTRES_OUTILS.filter(autorise).map((p) => p.href)].filter((h) => !HORS_MENU.has(h)));
    const apres = new Set(pagesMenu(perms).map((p) => p.href));
    for (const h of avant) assert.ok(apres.has(h), `${role} : « ${h} » a disparu du menu`);
    for (const h of apres) assert.ok(avant.has(h) || AJOUTS.has(h), `${role} : « ${h} » est une entrée nouvelle non déclarée`);
  }
});

test("menu : mêmes verrous de palier, droits et ouverture de l'abonnement", () => {
  const anciens = new Map(pagesDashboard().map((p) => [p.href, p]));
  for (const it of MENU.flatMap((s) => s.items)) {
    const a = anciens.get(it.href);
    if (!a) continue;
    assert.equal(it.requiresPalier, a.requiresPalier, `palier de ${it.href}`);
    assert.equal(it.moduleKey, a.moduleKey, `droit de ${it.href}`);
    assert.equal(!!it.opensAbonnement, !!a.opensAbonnement, `abonnement de ${it.href}`);
  }
});

test("menu : caisse en mode simple réduite aux mêmes entrées essentielles", () => {
  const sp = new URLSearchParams();
  for (const [, perms] of grilles) {
    const avant = groupesVisibles(perms, "simple", "/dashboard/pos/caisse", sp).find((g) => g.id === "pos")?.items.map((i) => i.href) ?? [];
    const apres = sectionsVisibles(perms, "simple", "/dashboard/pos/caisse", sp).find((s) => s.id === "pos")?.items.map((i) => i.href) ?? [];
    assert.deepEqual(apres, avant);
  }
});

test("menu : un seul lien actif sur les pages partagées", () => {
  const sp = (q: string) => new URLSearchParams(q);
  const actifs = (path: string, q = "") => MENU.flatMap((s) => s.items).filter((it) => estActif(it, path, sp(q))).map((it) => it.href);
  assert.deepEqual(actifs("/dashboard/boutique", "section=livraison"), ["/dashboard/boutique?section=livraison"]);
  assert.deepEqual(actifs("/dashboard/logistique/encaissements"), ["/dashboard/logistique/encaissements"]);
  assert.deepEqual(actifs("/dashboard/marketing/codes-promo"), ["/dashboard/marketing/codes-promo"]);
  assert.deepEqual(actifs("/dashboard/produits/categories"), ["/dashboard/produits/categories"]);
  assert.deepEqual(actifs("/dashboard/clients/segments"), ["/dashboard/clients/segments"]);
  assert.deepEqual(actifs("/dashboard/clients/abc"), ["/dashboard/clients"]);
});

test("menu et Paramètres : chaque lien mène à une page existante", () => {
  const racine = join(process.cwd(), "app/(dashboard)");
  for (const { href } of [...MENU.flatMap((s) => s.items), ...SECTIONS_PARAMETRES]) {
    const chemin = href.split(/[?#]/)[0]!.replace(/^\//, "");
    assert.ok(existsSync(join(racine, chemin, "page.tsx")), `pas de page pour ${href}`);
  }
});
