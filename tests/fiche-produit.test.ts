// Fiche produit — le bouton « Commander via WhatsApp » est une option à activer (désactivée par défaut),
// réglable à la main comme par AXIA (modifier_fiche_produit → appliquerActionFiche).
import { test } from "node:test";
import assert from "node:assert/strict";
import { appliquerActionFiche, sectionsFiche, whatsappFicheActif } from "@/lib/fiche-produit";

test("Commander via WhatsApp : désactivé par défaut, activable par « configurer »", () => {
  const qte = (pp: any) => sectionsFiche(pp).find((s) => s.type === "quantity")!;
  assert.notEqual(qte(null).config.commanderWhatsApp, true); // fiche par défaut : pas de bouton
  const { pp } = appliquerActionFiche(null, { action: "configurer", section: "quantity", config: { commanderWhatsApp: true } });
  assert.equal(qte(pp).config.commanderWhatsApp, true);
});

test("Commander via WhatsApp : les boutiques d'avant le 24/10/2026 gardent leur bouton", () => {
  const ancienne = "2026-09-01T00:00:00Z", nouvelle = "2026-11-01T00:00:00Z";
  assert.equal(whatsappFicheActif({}, ancienne), true);                        // affiché jusqu'ici : gardé
  assert.equal(whatsappFicheActif({ afficherWhatsApp: false }, ancienne), false); // l'avait éteint : reste éteint
  assert.equal(whatsappFicheActif({ commanderWhatsApp: false }, ancienne), false); // éteint avec la nouvelle option
  assert.equal(whatsappFicheActif({}, nouvelle), false);                        // nouvelle boutique : désactivé par défaut
  assert.equal(whatsappFicheActif({ commanderWhatsApp: true }, nouvelle), true);
  assert.equal(whatsappFicheActif({}, null), false);
});
