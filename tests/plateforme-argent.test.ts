// Abonnements et droits d'équipe. Fonctions pures uniquement.
import { test } from "node:test";
import assert from "node:assert/strict";
import { expirationApresPaiement } from "@/lib/abonnement";
import { grilleCouverte, ROLE_PRESETS, TOUT_ECRITURE } from "@/lib/permissions";

const JOUR = 24 * 3600 * 1000;

test("abonnement : un renouvellement du même palier garde les jours restants", () => {
  const now = new Date("2026-10-13T00:00:00Z");
  const fin = new Date(now.getTime() + 10 * JOUR);
  assert.equal(expirationApresPaiement({ planType: "palier2", planExpiresAt: fin }, "palier2", 30, now).getTime(), now.getTime() + 40 * JOUR);
  // palier différent ou expiré : repart d'aujourd'hui
  assert.equal(expirationApresPaiement({ planType: "palier1", planExpiresAt: fin }, "palier2", 30, now).getTime(), now.getTime() + 30 * JOUR);
  assert.equal(expirationApresPaiement({ planType: "palier2", planExpiresAt: new Date(now.getTime() - JOUR) }, "palier2", 30, now).getTime(), now.getTime() + 30 * JOUR);
  assert.equal(expirationApresPaiement({ planType: "palier2", planExpiresAt: null }, "palier2", 30, now).getTime(), now.getTime() + 30 * JOUR);
});

test("équipe : un membre ne donne jamais plus que ses propres droits", () => {
  const gerant = ROLE_PRESETS.gerant;
  assert.equal(grilleCouverte(ROLE_PRESETS.caissier, gerant), true);
  assert.equal(grilleCouverte(TOUT_ECRITURE, gerant), false); // gérant n'a pas l'équipe ni la finance en écriture
  assert.equal(grilleCouverte(ROLE_PRESETS.comptable, gerant), false);
  assert.equal(grilleCouverte(TOUT_ECRITURE, TOUT_ECRITURE), true); // le propriétaire peut tout déléguer
});
