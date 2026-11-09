// Lecture / écriture des tableurs (lib/excel.ts, exceljs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { classeurXlsx, csv, lireCsv, lireTableur, FichierIllisible } from "@/lib/excel";

const enc = (s: string) => new TextEncoder().encode(s);

test("xlsx : écrit puis relu à l'identique (en-têtes, nombres, accents), lignes vides ignorées", async () => {
  const octets = await classeurXlsx([{ nom: "Produits", lignes: [["Nom", "Prix", "Catégorie"], ["Sac à main", 24900, "Maroquinerie"], [], ["Collier", 8500, ""]] }]);
  assert.deepEqual(await lireTableur("modele.xlsx", octets), [
    { Nom: "Sac à main", Prix: 24900, "Catégorie": "Maroquinerie" },
    { Nom: "Collier", Prix: 8500, "Catégorie": "" },
  ]);
});

test("csv : point-virgule ou virgule, guillemets, BOM, zéros de tête gardés", async () => {
  assert.deepEqual(await lireTableur("a.csv", enc('﻿Nom;Code\n"Sac ""cuir""; noir";00123\n')), [{ Nom: 'Sac "cuir"; noir', Code: "00123" }]);
  assert.deepEqual(lireCsv("a,b\r\n1,2"), [["a", "b"], ["1", "2"]]);
});

test("csv écrit : BOM, échappement, et aucune formule exécutable venant d'un client", () => {
  assert.equal(csv([["Nom", "Note"], ["=HYPERLINK(\"x\")", 'a;b']]), '﻿Nom;Note\n"\'=HYPERLINK(""x"")";"a;b"');
});

test("fichiers refusés avec un message clair : ancien .xls, fichier abîmé", async () => {
  await assert.rejects(lireTableur("vieux.xls", enc("x")), (e: Error) => e instanceof FichierIllisible && /\.xlsx/.test(e.message));
  await assert.rejects(lireTableur("abime.xlsx", enc("pas un zip")), FichierIllisible);
});
