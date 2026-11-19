// Accueil (lot 6) : chips « À traiter » selon les droits, mêmes liens que le Tableau de bord.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lignesATraiter } from "../app/(dashboard)/dashboard/accueil/a-traiter";

const c = { aConfirmer: 3, aExpedier: 0, retours: 1, ruptures: 2, stockFaible: 0, messages: 4 };

test("À traiter : toutes les lignes pour un accès complet, dans l'ordre", () => {
  const l = lignesATraiter(c, () => true);
  assert.deepEqual(l.map((x) => x.cle), ["confirmer", "expedier", "retours", "ruptures", "faible", "messages"]);
  assert.equal(l[0].href, "/dashboard/commandes?statut=en_attente");
});

test("À traiter : une liste invisible pour le membre n'apparaît pas", () => {
  const l = lignesATraiter(c, (m) => m === "produits");
  assert.deepEqual(l.map((x) => x.cle), ["ruptures", "faible"]);
});

test("Chips : seuls les compteurs non nuls", () => {
  const chips = lignesATraiter(c, () => true).filter((x) => x.nombre > 0);
  assert.deepEqual(chips.map((x) => [x.chip, x.nombre]), [["Confirmer les commandes", 3], ["Traiter les retours", 1], ["Réapprovisionner les ruptures", 2], ["Répondre aux messages", 4]]);
});
