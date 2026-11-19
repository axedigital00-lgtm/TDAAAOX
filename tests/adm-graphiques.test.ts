// Graphiques et illustrations de l'admin (§7.8, §4.3) : fonctions pures + rendu serveur de chaque composant.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CohortHeatmap, DonutChart, FunnelChart, HorizontalBar, LineChart, Sparkline, StackedBar,
  alphaCohorte, arcs, formatCompact, graduations, indicesLibelles, pasRond, trace, variation,
} from "@/components/ui/graphiques";
import * as Ill from "@/components/ui/illustrations";

const nb = (s: string) => s.replace(/\s/g, " "); // espaces insécables d'Intl → espace simple

test("format compact : axes lisibles", () => {
  assert.equal(nb(formatCompact(14000)), "14 k");
  assert.equal(nb(formatCompact(6_470_000)), "6,5 M");
  assert.equal(formatCompact(0), "0");
});

test("graduations : 0, moitié, max arrondi au-dessus de la plus haute valeur", () => {
  assert.equal(pasRond(0), 1);
  assert.equal(pasRond(3.2), 5);
  assert.equal(pasRond(210), 250);
  assert.deepEqual(graduations([0, 0]), [0, 1, 2], "série nulle : pas de division par zéro");
  const [a, b, c] = graduations([120, 380, 410]);
  assert.equal(a, 0);
  assert.equal(c, b * 2);
  assert.ok(c >= 410 && c <= 1000);
});

test("libellés X : 4-5 au plus, premier et dernier inclus", () => {
  assert.deepEqual(indicesLibelles(3), [0, 1, 2]);
  assert.deepEqual(indicesLibelles(30), [0, 7, 15, 22, 29]);
});

test("tracé, variation, arcs, cohorte", () => {
  assert.equal(trace([0, 10], { x0: 0, x1: 100, y0: 0, y1: 50 }, 10), "M0.0 50.0 L100.0 0.0");
  assert.equal(variation(150, 100), 50);
  assert.equal(variation(10, 0), null);
  assert.equal(variation(10, undefined), null);
  const s = arcs([50, 30, 20]);
  assert.deepEqual(s.map((x) => Math.round(x.part)), [50, 30, 20]);
  assert.deepEqual(s.map((x) => x.dashoffset), [25, -25, -55]);
  assert.deepEqual(arcs([0, 0]).map((x) => x.part), [0, 0]);
  assert.equal(alphaCohorte(15, 30), 0.5);
  assert.equal(alphaCohorte(90, 30), 1);
});

test("rendu serveur des graphiques", () => {
  assert.match(renderToStaticMarkup(h(Sparkline, { data: [1, 3, 2] })), /<polyline/);
  assert.equal(renderToStaticMarkup(h(Sparkline, { data: [1] })), "");

  const ligne = renderToStaticMarkup(h(LineChart, { serie: [10, 20, 30], comparaison: [5, 10, 40], libelles: ["1", "2", "3"], ariaLabel: "Ventes", area: true, legende: { serie: "Nov.", comparaison: "Oct." } }));
  assert.match(ligne, /role="img"/);
  assert.match(ligne, /aria-label="Ventes"/);
  assert.match(ligne, /stroke-dasharray="3 3"/);
  assert.match(ligne, /class="sr-only"/, "valeurs lisibles par les lecteurs d'écran");
  assert.doesNotMatch(ligne, /preserveAspectRatio="none"/, "texte d'axe jamais déformé");

  const donut = renderToStaticMarkup(h(DonutChart, { segments: [{ libelle: "WhatsApp", valeur: 3 }, { libelle: "Boutique", valeur: 1 }], devise: "XAF", ariaLabel: "Canaux" }));
  assert.match(donut, /FCFA/);
  assert.match(donut, /75/);

  assert.match(renderToStaticMarkup(h(HorizontalBar, { lignes: [{ libelle: "A", valeur: 10 }] })), /A/);
  assert.match(renderToStaticMarkup(h(StackedBar, { segments: [{ libelle: "Nouveaux", valeur: 12 }], ariaLabel: "Clients" })), /Nouveaux/);
  assert.match(renderToStaticMarkup(h(FunnelChart, { etapes: [{ libelle: "Sessions", valeur: 100 }, { libelle: "Commandes", valeur: 5 }], ariaLabel: "Entonnoir" })), /polygon/);
  const cohorte = renderToStaticMarkup(h(CohortHeatmap, { titreLignes: "Cohorte", colonnes: ["M0", "M1"], lignes: [{ libelle: "oct.", valeurs: [100, null] }] }));
  assert.match(cohorte, /<table/);
  assert.match(cohorte, /rgba\(42,111,219,1\.00\)/);
});

test("illustrations : SVG décoratifs aux bonnes dimensions", () => {
  for (const [nom, C] of Object.entries(Ill)) {
    const html = renderToStaticMarkup(h(C as (p: { domaine: string }) => React.ReactElement, { domaine: "maboutique.com" }));
    assert.match(html, /aria-hidden="true"/, nom);
    assert.match(html, nom.startsWith("Vignette") ? /viewBox="0 0 280 140"/ : /viewBox="0 0 200 150"/, nom);
  }
});
