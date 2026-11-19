// Lot 4 : IndexTable, MetricsStrip, EmptyState (rendu) et règles pures de sélection, tri et URL.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup as html } from "react-dom/server";
import {
  IndexTable, MetricsStrip, EmptyState, formatDelta, etatSelection, basculer, basculerTout, lireTri, ecrireTri, trier, majRecherche,
  type Column,
} from "@/components/ui/adm";

test("sélection : rien, partie, tout ; case d'en-tête", () => {
  const ids = ["a", "b", "c"];
  assert.equal(etatSelection([], ids), "none");
  assert.equal(etatSelection(["a", "z"], ids), "some");
  assert.equal(etatSelection(["c", "a", "b"], ids), "all");
  assert.deepEqual(basculerTout(["a"], ids), ids);
  assert.deepEqual(basculerTout(ids, ids), []);
  assert.deepEqual(basculer(["a"], "b"), ["a", "b"]);
  assert.deepEqual(basculer(["a", "b"], "a"), ["b"]);
});

test("tri : lecture/écriture et tri local (vides en bas, français numérique)", () => {
  assert.deepEqual(lireTri("date:desc"), { colonne: "date", ordre: "desc" });
  assert.equal(lireTri("date:haut"), null);
  assert.equal(lireTri(null), null);
  assert.equal(ecrireTri({ colonne: "total", ordre: "asc" }), "total:asc");
  const l = [{ n: "#10" }, { n: null }, { n: "#9" }, { n: "#2" }];
  assert.deepEqual(trier(l, (x) => x.n, "asc").map((x) => x.n), ["#2", "#9", "#10", null]);
  assert.deepEqual(trier(l, (x) => x.n, "desc").map((x) => x.n), ["#10", "#9", "#2", null]);
  assert.deepEqual(trier([{ v: 3 }, { v: 1 }], (x) => x.v, "asc").map((x) => x.v), [1, 3]);
});

test("URL : patch, suppression et remise à zéro de la pagination", () => {
  assert.equal(majRecherche("vue=a-traiter&page=3", { q: "awa" }), "vue=a-traiter&q=awa");
  assert.equal(majRecherche("q=awa&statut=livree", { statut: null, q: "" }), "");
  assert.equal(majRecherche("q=a&curseur=x", { page: "2" }), "q=a&page=2");
  assert.equal(majRecherche("", { tri: "date:asc" }), "tri=date%3Aasc");
});

type L = { id: string; nom: string; total: number };
const cols: Column<L>[] = [
  { id: "nom", header: "Produit", cell: (r) => r.nom, mobilePrimary: true, sortable: true },
  { id: "total", header: "Total", cell: (r) => String(r.total), numeric: true },
  { id: "cache", header: "Caché", cell: () => "x", hideOnMobile: true },
];
const rows: L[] = [{ id: "1", nom: "Pagne wax", total: 12000 }, { id: "2", nom: "Sac", total: 8000 }];

test("IndexTable : en-têtes, colonne principale, numérique, colonnes masquées, tri", () => {
  const s = html(h(IndexTable<L>, { label: "Produits", rows, columns: cols, getId: (r) => r.id, hiddenColumns: ["cache"], sort: { colonne: "nom", ordre: "desc" }, onSort: () => {} }));
  assert.match(s, /aria-label="Produits"/);
  assert.match(s, /aria-sort="descending"/);
  assert.match(s, /↓/);
  assert.match(s, /font-semibold[^"]*">Pagne wax/);
  assert.match(s, /text-right[^"]*tabular-nums/);
  assert.doesNotMatch(s, /Caché/);
});

test("IndexTable : sélection contrôlée → barre d'actions groupées, case indéterminée", () => {
  const s = html(h(IndexTable<L>, { label: "Produits", rows, columns: cols, getId: (r) => r.id, selectable: true, selected: ["1"], promotedBulkActions: [{ content: "Archiver" }] }));
  assert.match(s, /1 sélectionné\(s\)/);
  assert.match(s, /aria-checked="mixed"/);
  assert.match(s, /aria-selected="true"/);
  assert.match(s, />Archiver</);
});

test("IndexTable : chargement (8 lignes squelette), vide, pagination", () => {
  const chargement = html(h(IndexTable<L>, { label: "P", rows: [], columns: cols, getId: (r) => r.id, loading: true }));
  assert.match(chargement, /aria-busy="true"/);
  assert.equal(chargement.match(/<tr aria-hidden/g)?.length, 8);
  assert.equal(html(h(IndexTable<L>, { label: "P", rows: [], columns: cols, getId: (r) => r.id, emptyState: h("p", null, "Rien") })), "<p>Rien</p>");
  const p = html(h(IndexTable<L>, { label: "P", rows, columns: cols, getId: (r) => r.id,
    pagination: { hasPrevious: false, hasNext: true, label: "1-50", onPrevious() {}, onNext() {} } }));
  assert.match(p, /1-50/);
  assert.match(p, /<button[^>]*disabled=""[^>]*aria-label="Page précédente"|aria-label="Page précédente"[^>]*disabled=""/);
});

test("MetricsStrip : période, valeur, variation ; pas de variation inventée", () => {
  assert.deepEqual(formatDelta(75), { texte: "↗ 75 %", hausse: true });
  assert.deepEqual(formatDelta(-7.4), { texte: "↘ 7 %", hausse: false });
  assert.equal(formatDelta(null), null);
  assert.equal(formatDelta(Infinity), null);
  const s = html(h(MetricsStrip, { period: "Aujourd'hui", metrics: [{ id: "a", label: "Commandes", value: "14", delta: 75, sparkline: [1, 2] }, { id: "b", label: "Retours", value: "0" }] }));
  assert.match(s, /Aujourd&#x27;hui/);
  assert.match(s, /↗ 75 %/);
  assert.equal(s.match(/[↗↘]/g)?.length, 1);
  assert.match(s, /<svg/);
});

test("EmptyState : titre, texte, actions, lien d'aide", () => {
  const s = html(h(EmptyState, { title: "Aucun produit", learnMore: { topic: "produits", href: "/aide" }, actions: h("button", null, "Ajouter") }, "Ajoutez votre premier produit."));
  assert.match(s, /<h3[^>]*>Aucun produit<\/h3>/);
  assert.match(s, /Ajoutez votre premier produit/);
  assert.match(s, /En savoir plus sur les <a[^>]*href="\/aide"[^>]*>produits<\/a>/);
});
