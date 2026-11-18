// Encaissement affiché au livreur (components/livreur/statuts.ts) : jamais « encaisser » une commande déjà payée,
// et la liste COD reste alignée sur estCOD (lib/gains-livreur.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { encaissement } from "@/components/livreur/statuts";
import { estCOD } from "@/lib/gains-livreur";

test("COD non payé → espèces ; payé → rien ; en ligne payé → rien ; autre → inconnu", () => {
  assert.equal(encaissement({ methodePaiement: "whatsapp_cod", paiementStatut: "pending" }), "especes");
  assert.equal(encaissement({ methodePaiement: "direct_cod", paiementStatut: "pending" }), "especes");
  assert.equal(encaissement({ methodePaiement: "direct_cod", paiementStatut: "completed" }), "deja_paye");
  assert.equal(encaissement({ methodePaiement: "notchpay", paiementStatut: "completed" }), "deja_paye");
  assert.equal(encaissement({ methodePaiement: "notchpay", paiementStatut: "pending" }), null);
});

test("même définition du COD que les gains", () => {
  for (const m of ["whatsapp_cod", "direct_cod", "notchpay", "caisse"]) {
    assert.equal(encaissement({ methodePaiement: m, paiementStatut: "pending" }) === "especes", estCOD(m));
  }
});
