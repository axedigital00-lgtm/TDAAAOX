// Lots 13-14 : les liens ajoutés aux en-têtes (Boutique en ligne, Thèmes, WhatsApp, Agents) mènent à des pages qui existent (D23).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

const page = (href: string) => `app/(dashboard)${href.split("?")[0]}/page.tsx`;

test("liens des en-têtes Contenu et Canaux : chaque cible est une page existante", () => {
  for (const href of [
    "/dashboard/builder", "/dashboard/themes", "/dashboard/themes/creer", "/dashboard/boutique", "/dashboard/boutique/politiques",
    "/dashboard/abonnement", "/dashboard/whatsapp", "/dashboard/campagnes", "/dashboard/axia/journal", "/dashboard/controle-ia",
    "/dashboard/accueil",
  ]) assert.ok(existsSync(page(href)), href);
});
