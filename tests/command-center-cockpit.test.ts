// Cockpit du Command Center : agrégats des graphiques avancés.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cohortes, concentration, fluxCommandes, heatmapActivite } from "@/lib/command-center/cockpit";

test("heatmap : lundi en premier, heure de Douala (UTC+1)", () => {
  const g = heatmapActivite([{ date: Date.parse("2026-12-06T23:30:00Z") }]); // dimanche 23h30 UTC = lundi 00h30 à Douala
  assert.equal(g[0][0], 1);
  assert.equal(g.flat().reduce((a, b) => a + b, 0), 1);
});

test("flux : chaque commande traverse canal, paiement et statut", () => {
  const f = fluxCommandes([
    { canal: "en_ligne", methode: "whatsapp_cod", statut: "payee" },
    { canal: "en_ligne", methode: "direct_cod", statut: "annulee" },
    { canal: "pos", methode: "especes", statut: "payee" },
  ]);
  assert.equal(f.noeuds.find((n) => n.id === "c:en_ligne")?.valeur, 2);
  assert.equal(f.noeuds.find((n) => n.nom === "À la livraison")?.valeur, 2);
  const entree = f.liens.filter((l) => l.de.startsWith("c:")).reduce((s, l) => s + l.valeur, 0);
  const sortie = f.liens.filter((l) => l.vers.startsWith("s:")).reduce((s, l) => s + l.valeur, 0);
  assert.equal(entree, 3); assert.equal(sortie, 3);
});

test("cohortes : rétention par mois, futur non renseigné", () => {
  const maintenant = Date.parse("2026-03-15T12:00:00Z"), jan = Date.parse("2026-01-10T12:00:00Z"), fev = Date.parse("2026-02-10T12:00:00Z");
  const c = (marchandId: string, date: number) => ({ marchandId, date, statut: "payee" }) as any;
  const lignes = cohortes({ maintenant, marchands: [{ id: "a", creeLe: jan }, { id: "b", creeLe: jan }] as any, commandes: [c("a", jan), c("b", jan), c("a", fev)] }, 3);
  const janvier = lignes[0];
  assert.equal(janvier.taille, 2);
  assert.deepEqual(janvier.retention, [1, 0.5, 0]);
  assert.equal(lignes[1].retention[0], null, "cohorte vide");
  assert.equal(lignes[2].retention[1], null, "mois futur");
});

test("concentration : part des 10 % les plus actifs", () => {
  assert.deepEqual(concentration([80, 5, 5, 5, 5, 0]), { part: 0.8, top: 1, total: 5 });
  assert.equal(concentration([0, 0]), null);
});
