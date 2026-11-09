// Lecture et écriture des tableurs (Excel .xlsx et CSV), partout dans AXSO.
// Remplace la bibliothèque `xlsx` 0.18.5, qui avait deux failles connues sans
// correctif sur npm. Utilisable côté serveur et navigateur (import dynamique conseillé
// côté navigateur : exceljs est lourd).
import ExcelJS from "exceljs";

export type Cellule = string | number | boolean | Date | null | undefined;
export interface Feuille { nom: string; lignes: Cellule[][]; largeurs?: number[] }

export const TYPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export class FichierIllisible extends Error {}

/** Nom de feuille accepté par Excel (31 caractères, sans \ / ? * [ ] :), unique dans le classeur. */
function nomFeuille(nom: string, pris: Set<string>): string {
  const base = nom.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Feuille";
  let n = base;
  for (let i = 2; pris.has(n.toLowerCase()); i++) n = `${base.slice(0, 27)} ${i}`;
  pris.add(n.toLowerCase());
  return n;
}

/** Classeur .xlsx : une feuille par entrée, première ligne en gras (en-têtes). */
export async function classeurXlsx(feuilles: Feuille[]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const pris = new Set<string>();
  for (const f of feuilles) {
    const ws = wb.addWorksheet(nomFeuille(f.nom, pris));
    ws.addRows(f.lignes.map((l) => l.map((v) => v ?? "")));
    if (f.lignes.length) ws.getRow(1).font = { bold: true };
    ws.columns.forEach((c, i) => { c.width = f.largeurs?.[i] ?? Math.max(14, String(f.lignes[0]?.[i] ?? "").length + 4); });
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/**
 * Texte qu'Excel prendrait pour une formule (« =HYPERLINK(…) » saisi par un client)
 * : on le préfixe d'une apostrophe pour qu'il reste du texte.
 */
export const sansFormule = (v: Cellule): Cellule => (typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

/** CSV au point-virgule avec BOM : s'ouvre proprement dans Excel en français, accents compris. */
export function csv(lignes: Cellule[][]): string {
  const texte = (v: Cellule) => {
    const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(sansFormule(v) ?? "");
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + lignes.map((l) => l.map(texte).join(";")).join("\n");
}

// ─── Lecture ─────────────────────────────────────────────────────────────────

/** Valeur lisible d'une cellule exceljs (formule → résultat, lien → texte, texte enrichi → texte). */
function valeur(v: ExcelJS.CellValue): unknown {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v !== "object") return v;
  if ("richText" in v) return v.richText.map((r) => r.text).join("");
  if ("formula" in v || "sharedFormula" in v) return valeur((v as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
  if ("hyperlink" in v) return valeur((v as ExcelJS.CellHyperlinkValue).text as ExcelJS.CellValue);
  if ("error" in v) return "";
  return String(v);
}

/** Tableau de lignes → objets, clé = en-tête de la première ligne ; lignes vides ignorées. */
function enObjets(tableau: unknown[][]): Record<string, unknown>[] {
  const [entetes = [], ...corps] = tableau;
  const cles = entetes.map((e, i) => String(e ?? "").trim() || `Colonne ${i + 1}`);
  return corps
    .filter((l) => l.some((v) => String(v ?? "").trim() !== ""))
    .map((l) => Object.fromEntries(cles.map((c, i) => [c, l[i] ?? ""])));
}

/** Découpe un CSV (séparateur ; ou , deviné sur la première ligne, guillemets gérés). */
export function lireCsv(texte: string): string[][] {
  const t = texte.replace(/^﻿/, "");
  const premiere = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = (premiere.match(/;/g)?.length ?? 0) >= (premiere.match(/,/g)?.length ?? 0) ? ";" : ",";
  const lignes: string[][] = [];
  let ligne: string[] = [], champ = "", guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (guillemets) {
      if (c === '"' && t[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === sep) { ligne.push(champ); champ = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      ligne.push(champ); lignes.push(ligne); ligne = []; champ = "";
    } else champ += c;
  }
  if (champ !== "" || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes;
}

/** Première feuille d'un classeur .xlsx, en tableau de lignes. */
export async function lireXlsx(octets: Uint8Array): Promise<unknown[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(octets as any);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const lignes: unknown[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    const l: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => { l[col - 1] = valeur(cell.value); });
    lignes[n - 1] = l;
  });
  return Array.from(lignes, (l) => l ?? []);
}

/**
 * Lit un tableur reçu (.xlsx ou .csv) : une ligne = un objet dont les clés sont les en-têtes.
 * Lève FichierIllisible pour un fichier abîmé ou un ancien .xls (à réenregistrer en .xlsx).
 */
export async function lireTableur(nom: string, octets: Uint8Array): Promise<Record<string, unknown>[]> {
  if (/\.xls$/i.test(nom)) throw new FichierIllisible("Les anciens fichiers .xls ne sont pas pris en charge : ouvrez-le dans Excel et enregistrez-le au format .xlsx.");
  try {
    return enObjets(/\.csv$/i.test(nom) ? lireCsv(new TextDecoder("utf-8").decode(octets)) : await lireXlsx(octets));
  } catch {
    throw new FichierIllisible("Ce fichier est illisible. Utilisez le modèle fourni, au format Excel (.xlsx) ou CSV.");
  }
}
