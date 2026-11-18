// Politiques de la boutique (Tenant.politiques, JSON) : livraison, retours, confidentialité, CGV.
// Partie pure, utilisable serveur et navigateur. La rédaction par Axia vit ailleurs (serveur).

export const TYPES_POLITIQUES = ["livraison", "retours", "confidentialite", "cgv"] as const;
export type TypePolitique = (typeof TYPES_POLITIQUES)[number];

export const TITRES_POLITIQUES: Record<TypePolitique, string> = {
  livraison: "Politique de livraison",
  retours: "Retours et remboursements",
  confidentialite: "Politique de confidentialité",
  cgv: "Conditions générales de vente",
};

/** Une politique stockée. `contenu` = texte simple (titres #, listes -, gras **). */
export interface Politique {
  contenu: string;
  /** Dernier brouillon rédigé par Axia (« Revenir au brouillon d'Axia »). */
  brouillonAxia?: string;
  /** ISO : validée par le marchand. Toute modification du contenu après validation la remet en brouillon. */
  valideeLe?: string | null;
  majLe?: string;
}
export type Politiques = Partial<Record<TypePolitique, Politique>>;

export type StatutPolitique = "absente" | "a_completer" | "brouillon_axia" | "validee";

/** Passages qu'Axia ne peut pas connaître : « [À compléter : délai de retour en jours] ». */
export const MOTIF_A_COMPLETER = /\[À compléter\s*:[^\]]*\]/g;

export const passagesACompleter = (texte: string) => texte.match(MOTIF_A_COMPLETER) ?? [];

export function lirePolitiques(brut: unknown): Politiques {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, any>;
  const r: Politiques = {};
  for (const t of TYPES_POLITIQUES) {
    const p = o[t];
    if (p && typeof p === "object" && typeof p.contenu === "string") r[t] = p as Politique;
  }
  return r;
}

export function statutPolitique(p?: Politique | null): StatutPolitique {
  if (!p || !p.contenu.trim()) return "absente";
  if (passagesACompleter(p.contenu).length) return "a_completer";
  return p.valideeLe ? "validee" : "brouillon_axia";
}

/** Peut être validée : du contenu et plus aucun passage « À compléter ». */
export const politiqueValidable = (contenu: string) => !!contenu.trim() && passagesACompleter(contenu).length === 0;

/** Ce que voit le client : seulement une politique validée (jamais un brouillon ni un « À compléter »). */
export const politiquePublique = (p?: Politique | null) => (statutPolitique(p) === "validee" ? p!.contenu : null);

/** Liens à afficher dans le pied de page de la vitrine : seulement les politiques validées, dans l'ordre. */
export const politiquesPubliees = (brut: unknown): { type: TypePolitique; titre: string }[] => {
  const p = lirePolitiques(brut);
  return TYPES_POLITIQUES.filter((t) => politiquePublique(p[t]) !== null).map((type) => ({ type, titre: TITRES_POLITIQUES[type] }));
};

export const estTypePolitique = (x: unknown): x is TypePolitique => TYPES_POLITIQUES.includes(x as TypePolitique);

// ─── Markdown simple et sûr ─────────────────────────────────────────────────
// Seulement : titres (#, ##, ###), listes (- ou *), gras (**…**), paragraphes. Le résultat est
// une structure de TEXTE : React l'échappe au rendu, aucun HTML du marchand n'est jamais injecté.

export type Segment = { texte: string; gras?: boolean; aCompleter?: boolean };
export type BlocMd =
  | { type: "titre"; niveau: 1 | 2 | 3; segments: Segment[] }
  | { type: "liste"; items: Segment[][] }
  | { type: "paragraphe"; segments: Segment[] };

function segmenter(ligne: string): Segment[] {
  const r: Segment[] = [];
  ligne.split(/(\*\*[^*]+\*\*)/).forEach((morceau) => {
    if (!morceau) return;
    const gras = /^\*\*[^*]+\*\*$/.test(morceau);
    const texte = gras ? morceau.slice(2, -2) : morceau;
    // Passages « À compléter » isolés pour être surlignés côté marchand.
    texte.split(/(\[À compléter\s*:[^\]]*\])/).forEach((s) => {
      if (s) r.push({ texte: s, ...(gras ? { gras } : {}), ...(/^\[À compléter/.test(s) ? { aCompleter: true } : {}) });
    });
  });
  return r;
}

export function analyserMarkdown(texte: string): BlocMd[] {
  const blocs: BlocMd[] = [];
  let para: string[] = [];
  const fermerPara = () => {
    if (para.length) blocs.push({ type: "paragraphe", segments: segmenter(para.join(" ")) });
    para = [];
  };
  for (const brute of (texte ?? "").replace(/\r/g, "").split("\n")) {
    const ligne = brute.trim();
    const titre = ligne.match(/^(#{1,3})\s+(.*)$/);
    const item = ligne.match(/^[-*]\s+(.*)$/);
    if (!ligne) fermerPara();
    else if (titre) {
      fermerPara();
      blocs.push({ type: "titre", niveau: titre[1].length as 1 | 2 | 3, segments: segmenter(titre[2]) });
    } else if (item) {
      fermerPara();
      const der = blocs[blocs.length - 1];
      if (der?.type === "liste") der.items.push(segmenter(item[1]));
      else blocs.push({ type: "liste", items: [segmenter(item[1])] });
    } else para.push(ligne);
  }
  fermerPara();
  return blocs;
}
