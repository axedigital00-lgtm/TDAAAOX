// Liens de navigation des designs AXSO (Templates/*.html) — les fichiers
// livrent un 3ᵉ lien d'en-tête qui double « Collection » (Sur-mesure, Drops,
// Bracelets…) et un pied de page plein de liens morts (Presse, Nos riders,
// Livraison, Contact… sans destination). On les remplace par les pages qui
// existent vraiment : À propos, Contact et Mon compte (toujours rendues, avec repli).
// Pied de page : chaque page de la boutique y a son lien (catalogue,
// collections, À propos, Contact, Mon compte, CGU, confidentialité), une
// seule fois — doublons, Panier (déjà dans l'en-tête) et Commander (panier
// vide) retirés.
// Pur et idempotent : appliqué au rendu de la vitrine ET au chargement du
// Constructeur, pour toutes les boutiques existantes sans migration.
import { parse, type HTMLElement as El } from "node-html-parser";
import type { BlockNode, ThemeConfig } from "./theme-config";
import { MANIFESTE_LIBRAIRIE } from "./axso-design-manifest";
import type { TypePolitique } from "./politiques";

// Nom d'origine des designs (« HALLE », « CIRCUIT »…), comparé sans accents, casse ni ponctuation.
const cleNom = (s: string) => s.normalize("NFD").replace(/[^\p{L}\p{N}]/gu, "").toUpperCase();
const NOMS_DESIGNS = new Set(MANIFESTE_LIBRAIRIE.map((e) => cleNom(e.nom)));
const echapper = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Logo et « © 2026 HALLE » qui portent encore le nom du design → nom de la boutique, précédé
 * de son logo s'il a été envoyé (hauteur liée au texte : proportionné dans chaque design).
 * L'emplacement est marqué data-axso-nom : même enregistré ainsi par le Constructeur, il suit
 * les changements de nom et de logo. Un logo écrit à la main dans le Constructeur est gardé.
 */
function nommerBoutique(racine: El, nom: string, logoUrl?: string | null) {
  const image = logoUrl && /^(https:\/\/|\/)/.test(logoUrl)
    ? `<img src="${echapper(logoUrl)}" alt="" style="height:1.6em;width:auto;max-width:3em;object-fit:contain;display:inline-block;vertical-align:middle;margin-right:.45em;">`
    : "";
  for (const logo of racine.querySelectorAll(".logo")) {
    if (!logo.hasAttribute("data-axso-nom") && !NOMS_DESIGNS.has(cleNom(logo.text))) continue;
    logo.setAttribute("data-axso-nom", "");
    logo.set_content(image + echapper(nom));
  }
  for (const s of racine.querySelectorAll("footer span[data-axso-nom]")) s.set_content(echapper(nom));
  for (const f of racine.querySelectorAll("footer")) {
    const html = f.innerHTML.replace(/(©\s*\d{4}\s+)([^<—|]+?)(?=\s*(?:—|\||<|$))/g, (m, debut: string, ancien: string) => (NOMS_DESIGNS.has(cleNom(ancien)) ? `${debut}<span data-axso-nom>${echapper(nom)}</span>` : m));
    if (html !== f.innerHTML) f.set_content(html);
  }
}

const CHAMPS_HTML = ["builderHtml", "builderHtmlProduits", "builderHtmlProduit", "builderHtmlPanierChrome", "builderHtmlCheckoutChrome", "builderHtmlConfirmationChrome"] as const;

const lienMort = (a: El) => ["", "#"].includes((a.getAttribute("href") ?? "").trim());

function lienVers(modele: El, texte: string, href: string): El {
  const a = parse(modele.outerHTML).querySelector("a")!;
  a.removeAttribute("data-axs-el"); // nouvel élément : identifiant posé au 1er clic dans le Constructeur
  a.removeAttribute("id");
  a.classList.remove("active");
  a.setAttribute("href", href);
  a.set_content(texte);
  return a;
}

// Retire un lien, avec son <li> s'il n'y est que lui.
function retirer(a: El) {
  const li = a.parentNode as El;
  (li?.tagName === "LI" && li.childNodes.every((n) => n === a || !n.text.trim()) ? li : a).remove();
}

// Ajoute un lien juste après `ref`, dans le même style (dans un <li> copié du sien le cas échéant).
function ajouterApres(ref: El, texte: string, href: string): El {
  const lien = lienVers(ref, texte, href).outerHTML;
  const li = ref.parentNode as El;
  if (li?.tagName === "LI") {
    const copie = parse(li.outerHTML).firstChild as El;
    copie.removeAttribute("id");
    copie.set_content(lien);
    li.insertAdjacentHTML("afterend", copie.outerHTML);
    return (li.nextElementSibling as El).querySelector("a")!;
  }
  ref.insertAdjacentHTML("afterend", lien);
  return ref.nextElementSibling as El;
}

const hrefDe = (a: El) => a.getAttribute("href") ?? "";

function corrigerEntete(header: El, slug: string, digital?: boolean) {
  const liens = header.querySelectorAll("a[href]").filter((a) => {
    const h = a.getAttribute("href")!;
    return (h === `/${slug}` || h.startsWith(`/${slug}/`)) && !/\/(panier|wishlist|mon-compte)$/.test(h);
  });
  if (!liens.length) return;
  const aPropos = liens.find((a) => a.getAttribute("href")!.endsWith("/a-propos"));
  let dernier = liens[liens.length - 1];
  if (!aPropos) {
    const doublon = liens.filter((a) => a.getAttribute("href") === `/${slug}/produits`)[1];
    if (doublon) { doublon.setAttribute("href", `/${slug}/a-propos`); doublon.set_content("À propos"); dernier = doublon; }
    else { const n = lienVers(dernier, "À propos", `/${slug}/a-propos`); dernier.insertAdjacentHTML("afterend", n.outerHTML); dernier = dernier.nextElementSibling as El; }
  } else dernier = aPropos;
  let contact = liens.find((a) => a.getAttribute("href")!.endsWith("/contact"));
  if (!contact) { dernier.insertAdjacentHTML("afterend", lienVers(dernier, "Contact", `/${slug}/contact`).outerHTML); contact = dernier.nextElementSibling as El; }
  // Espace client, après Contact. Digital : le bouton « Mes achats » y mène déjà (adapterDigital).
  if (!digital && !header.querySelector(`a[href="/${slug}/mon-compte"]`))
    contact.insertAdjacentHTML("afterend", lienVers(contact, "Mon compte", `/${slug}/mon-compte`).outerHTML);
  // Un seul lien vers le catalogue (les autres portaient une catégorie inventée menant à la même page).
  header.querySelectorAll(`a[href="/${slug}/produits"]`).slice(1).forEach(retirer);
}

// Pas de bouton Panier dans l'en-tête (le panier s'ouvre depuis la
// notification « ajouté au panier » de la fiche produit). Remplacé par un
// repère masqué qui garde les id du bouton (les scripts du design les
// cherchent) et sert d'ancre au lien Favoris (NavigationDesign).
function retirerPanier(racine: El, slug: string) {
  for (const a of racine.querySelectorAll(SELECTEUR_PANIER(slug))) {
    const ids = a.querySelectorAll("[id]").map((el) => `<span id="${el.id}"></span>`).join("");
    a.replaceWith(`<span data-axs-panier-retire style="display:none">${ids}</span>`);
  }
}

const SELECTEUR_PANIER = (slug: string) => `header a[href="/${slug}/panier"], header [onclick="go('panier')"]`;

// Mode d'achat « panier » (lib/mode-achat.ts) : le bouton Panier de l'en-tête reste, vers la page
// panier ; components/storefront/Panier.tsx l'ouvre en panier latéral et y affiche le nombre d'articles.
const SAC = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" width="20" height="20"><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`;

function garderPanier(racine: El, slug: string) {
  for (const a of racine.querySelectorAll(SELECTEUR_PANIER(slug))) {
    a.removeAttribute("onclick");
    a.setAttribute("href", `/${slug}/panier`);
    a.setAttribute("data-axs-panier", "");
  }
  // Bouton déjà retiré par un rendu en mode « commande directe » (enregistré ainsi par le Constructeur) :
  // recréé dans le style du lien voisin de l'en-tête (Mon compte…), avec les id d'origine.
  for (const repere of racine.querySelectorAll("header [data-axs-panier-retire]")) {
    const voisin = [repere.previousElementSibling, repere.nextElementSibling].find((e) => e?.tagName === "A") as El | undefined;
    const a = voisin ? lienVers(voisin, "", `/${slug}/panier`) : parse(`<a href="/${slug}/panier"></a>`).querySelector("a")!;
    a.removeAttribute("onclick");
    a.setAttribute("data-axs-panier", "");
    a.setAttribute("aria-label", "Panier");
    const texte = voisin?.querySelector("span") ? "<span>Panier</span>" : "";
    a.set_content(SAC + texte + repere.innerHTML);
    repere.replaceWith(a.outerHTML);
  }
}

export interface CollectionLien { slug: string; nom: string }

// Pages d'information du pied de page : FAQ et politiques validées par le marchand
// (lib/politiques.ts). Libellés courts, dans le style des autres liens du pied.
export const LIBELLES_POLITIQUES: Record<TypePolitique, string> = {
  livraison: "Livraison", retours: "Retours et remboursements", confidentialite: "Confidentialité", cgv: "Conditions de vente",
};
// Mentions « Confidentialité — Conditions générales » des designs : liens vers les pages d'Axso,
// remplacés par celles de la boutique quand elle les a publiées.
const MENTIONS_AXSO: [TypePolitique, string][] = [["confidentialite", "/legal/privacy"], ["cgv", "/legal/cgu"]];

function liensInformation(footer: El, slug: string, politiques: TypePolitique[] | undefined, faq: boolean | undefined) {
  const href = (a: El) => a.getAttribute("href") ?? "";
  if (politiques) {
    for (const [type, axso] of MENTIONS_AXSO) {
      if (!politiques.includes(type)) continue;
      footer.querySelectorAll(`a[href="${axso}"]`).forEach((a) => { a.setAttribute("href", `/${slug}/politiques/${type}`); a.setAttribute("data-axs-mention", axso); });
    }
    // Liens posés lors d'un rendu précédent (enregistrés par le Constructeur) vers une politique qui n'est plus publiée.
    for (const a of footer.querySelectorAll(`a[href^="/${slug}/politiques/"]`)) {
      if (politiques.includes(href(a).split("/").pop() as TypePolitique)) continue;
      const axso = a.getAttribute("data-axs-mention");
      if (axso) { a.setAttribute("href", axso); a.removeAttribute("data-axs-mention"); } else retirer(a);
    }
  }
  if (faq === false) footer.querySelectorAll(`a[href="/${slug}/faq"]`).forEach(retirer);
  const liens = footer.querySelectorAll("a[href]");
  let ref = liens.find((a) => href(a) === `/${slug}/mon-compte`) ?? liens.find((a) => href(a) === `/${slug}/contact`);
  if (!ref) return;
  if (faq && !footer.querySelector(`a[href="/${slug}/faq"]`)) ref = ajouterApres(ref, "FAQ", `/${slug}/faq`);
  for (const type of politiques ?? []) {
    const cible = `/${slug}/politiques/${type}`;
    if (footer.querySelector(`a[href="${cible}"]`)) continue;
    ref = ajouterApres(ref, LIBELLES_POLITIQUES[type], cible);
  }
}

const MENTIONS = /Confidentialit[ée]\s*[—–-]\s*Conditions g[ée]n[ée]rales/;

function corrigerPied(footer: El, slug: string, collections?: CollectionLien[]) {
  let aPropos = footer.querySelectorAll("a[href]").some((a) => a.getAttribute("href")!.endsWith("/a-propos"));
  for (const a of footer.querySelectorAll("a")) {
    if (!lienMort(a)) continue;
    if (/contact/i.test(a.text)) { a.setAttribute("href", `/${slug}/contact`); continue; }
    if (!aPropos) { a.setAttribute("href", `/${slug}/a-propos`); a.set_content("À propos"); aPropos = true; continue; }
    retirer(a);
  }
  // Superflus : Panier (dans l'en-tête), Commander (ouvre la commande même panier vide), doublons.
  const vus = new Set<string>();
  for (const a of footer.querySelectorAll("a[href]")) {
    const h = hrefDe(a);
    if (/\/(panier|checkout)$/.test(h) || vus.has(h)) retirer(a);
    else vus.add(h);
  }
  const liens = footer.querySelectorAll("a[href]");
  const vers = (fin: string) => liens.find((a) => hrefDe(a) === `/${slug}${fin}`);
  // Pages sans lien : ajoutées à la suite d'À propos, dans le même style.
  let ref = vers("/a-propos") ?? liens[liens.length - 1];
  if (!ref) return;
  if (!vers("/a-propos")) ref = ajouterApres(ref, "À propos", `/${slug}/a-propos`);
  ref = vers("/contact") ?? ajouterApres(ref, "Contact", `/${slug}/contact`);
  if (!vers("/mon-compte")) ref = ajouterApres(ref, "Mon compte", `/${slug}/mon-compte`);
  if (!vers("/produits")) ajouterApres(ref, "Tous les produits", `/${slug}/produits`);
  // Colonne vidée par le nettoyage (titre « Service » sans plus aucun lien) : retirée.
  for (const ul of footer.querySelectorAll("ul")) {
    if (ul.querySelectorAll("a").length) continue;
    const bloc = ul.parentNode as El;
    (bloc && bloc !== footer && !bloc.querySelectorAll("a").length ? bloc : ul).remove();
  }
  // Collections de la boutique, après le lien du catalogue (vitrine uniquement : la liste vient de la base).
  const catalogue = footer.querySelectorAll("a[href]").find((a) => hrefDe(a) === `/${slug}/produits`);
  if (catalogue && collections?.length && !liens.some((a) => hrefDe(a).includes(`/${slug}/collections/`))) {
    let apres = catalogue;
    for (const c of collections.slice(0, 6)) apres = ajouterApres(apres, c.nom, `/${slug}/collections/${c.slug}`);
  }
  // « Confidentialité — Conditions générales » : du texte dans les designs → vrais liens.
  if (!footer.querySelector('a[href^="/legal/"]')) {
    const mentions = footer.querySelectorAll("*").find((el) => el.childNodes.every((n) => n.nodeType === 3) && MENTIONS.test(el.text));
    mentions?.set_content(mentions.innerHTML.replace(MENTIONS, '<a href="/legal/privacy" style="color:inherit">Confidentialité</a> — <a href="/legal/cgu" style="color:inherit">Conditions générales</a>'));
  }
}

// ─── Boutique digitale (modeBoutique "digital") ──────────────────────────────
// Mêmes designs que le physique : achat direct sans panier, rien à livrer.
// Le lien Panier de l'en-tête devient « Mes achats » (Mon compte : achats et
// téléchargements) et les mentions de livraison/retours disparaissent — bandeau
// « A — B », case d'une grille de chiffres clés, élément de défilement.
const LIVRAISON = /livraison|livré|exp[ée]di|retours?\s+(sous|gratuit)|montage inclus/i;

function adapterDigital(racine: El, slug: string) {
  for (const a of racine.querySelectorAll(`a[href="/${slug}/panier"], a[onclick="go('panier')"]`)) {
    a.removeAttribute("onclick");
    const ids = a.querySelectorAll("[id]").map((el) => { el.setAttribute("style", "display:none"); return el.outerHTML; }); // aperçu : ses scripts les cherchent
    a.setAttribute("href", `/${slug}/mon-compte`);
    a.setAttribute("data-axs-achats", "");
    a.set_content(`Mes achats${ids.join("")}`);
  }
  const feuilles = racine.querySelectorAll("*").filter((el) => {
    if (["SCRIPT", "STYLE"].includes(el.tagName)) return false;
    const propre = el.childNodes.filter((n) => n.nodeType === 3).map((n) => n.text).join(" ").trim();
    return propre.length < 90 && LIVRAISON.test(propre);
  });
  for (const el of feuilles) {
    if (!el.parentNode) continue; // déjà retiré avec sa case
    const texte = el.text.trim();
    if (!LIVRAISON.test(texte)) continue; // case déjà réécrite
    const segments = texte.split(/\s+[—–]\s+/);
    if (segments.length > 1) {
      const restants = segments.filter((s) => !LIVRAISON.test(s));
      if (restants.length) el.set_content(restants.join(" — ")); else el.remove();
      continue;
    }
    const parent = el.parentNode as El;
    const cellule = parent.childNodes.filter((n) => n.nodeType === 3).every((n) => !n.text.trim()) ? parent.children : [];
    if (cellule.length === 2 && cellule.includes(el)) {
      const maj = texte === texte.toUpperCase();
      cellule[0].set_content("24/7");
      cellule[1].set_content(maj ? "ACCÈS IMMÉDIAT" : "Accès immédiat");
      continue;
    }
    const sep = [el.nextElementSibling, el.previousElementSibling].find((s) => s && /^[—–]$/.test(s.text.trim()));
    sep?.remove();
    el.remove();
  }
}

// `options.slug` : indispensable pour une section de pied de page seule sans
// aucun lien (Aube, Cadran), d'où l'adresse ne peut pas se déduire.
// `options.nom` / `options.logoUrl` : nom et logo de la boutique, à la place du nom du design (logo, copyright).
// `options.panier` : mode d'achat « panier » (bouton Panier gardé dans l'en-tête).
// `options.politiques` / `options.faq` : pages d'information à lier dans le pied (vitrine uniquement :
// non fournis, les liens déjà présents ne sont pas touchés).
export interface OptionsLiens {
  slug?: string; collections?: CollectionLien[]; digital?: boolean; nom?: string; logoUrl?: string | null;
  panier?: boolean; politiques?: TypePolitique[]; faq?: boolean;
}

export function corrigerLiensHtml(html: string | undefined, { slug: slugConnu, collections, digital, nom, logoUrl, panier, politiques, faq }: OptionsLiens = {}): string | undefined {
  if (!html) return html;
  const avecChrome = /<(header|footer)\b/.test(html);
  if (!avecChrome && !digital) return html;
  const slug = slugConnu || html.match(/href="\/([^/"?#]+)\/(?:produits|panier)"/)?.[1];
  if (!slug) return html;
  const racine = parse(html);
  racine.querySelectorAll("header").forEach((h) => corrigerEntete(h, slug, digital));
  // Boutique digitale : rien à livrer, pas de page Livraison (l'accès aux achats est dans « Mes achats »).
  const infos = politiques && (digital ? politiques.filter((t) => t !== "livraison") : politiques);
  racine.querySelectorAll("footer").forEach((f) => { corrigerPied(f, slug, collections); liensInformation(f, slug, infos, faq); });
  // Boutique digitale : le bouton devient « Mes achats » (adapterDigital), il reste.
  if (digital) adapterDigital(racine, slug); else if (panier) garderPanier(racine, slug); else retirerPanier(racine, slug);
  if (nom?.trim()) nommerBoutique(racine, nom.trim(), logoUrl);
  return racine.toString();
}

/** Aperçu brut d'un design (/api/preview-theme) : seul le <body> est retouché, le document (doctype, scripts) reste intact. */
export function adapterDocument(doc: string, digital: boolean): string {
  const debut = doc.search(/<body\b/i), fin = doc.search(/<\/body>/i);
  if (debut < 0 || fin < 0) return doc;
  const racine = parse(doc.slice(debut, fin));
  if (digital) adapterDigital(racine, "apercu"); else retirerPanier(racine, "apercu");
  // Fiche produit de démonstration : pas de panier, on commande (ou on achète, en digital) directement.
  for (const el of racine.querySelectorAll("button, a")) {
    if (/ajouter au panier/i.test(el.text)) el.set_content(el.innerHTML.replace(/ajouter au panier/i, digital ? "Acheter" : "Commander"));
  }
  return doc.slice(0, debut) + racine.toString() + doc.slice(fin);
}

function corrigerArbre(nodes: BlockNode[], options: OptionsLiens): BlockNode[] {
  return nodes.map((n) => ({
    ...n,
    ...(n.type === "embed-html" && n.config?.html ? { config: { ...n.config, html: corrigerLiensHtml(n.config.html, options) } } : {}),
    ...(n.children ? { children: corrigerArbre(n.children, options) } : {}),
  }));
}

export function corrigerLiensDesign<T extends ThemeConfig>(cfg: T, options: OptionsLiens = {}): T {
  const out: any = { ...cfg };
  for (const k of CHAMPS_HTML) if (typeof out[k] === "string") out[k] = corrigerLiensHtml(out[k], options);
  if (cfg.builderTree?.length) out.builderTree = corrigerArbre(cfg.builderTree, options);
  return out;
}

// ─── FAQ de la boutique (/{slug}/faq) ────────────────────────────────────────
// Rien d'inventé : les questions de la section FAQ de l'accueil (sections visibles d'un design :
// <details><summary>Question</summary>Réponse</details>, ou section FAQ du thème si activée).
// Aucune question : pas de page FAQ ni de lien.
export interface QuestionFaq { question: string; reponse: string }

export function extraireFaq(html: string | undefined): QuestionFaq[] {
  if (!html || !/<details\b/i.test(html)) return [];
  return parse(html).querySelectorAll("details").map((d) => {
    const summary = d.querySelector("summary");
    const question = summary?.text.replace(/\s+/g, " ").trim() ?? "";
    summary?.remove();
    return { question, reponse: d.text.replace(/\s+/g, " ").trim() };
  }).filter((q) => q.question && q.reponse);
}

function htmlVisible(nodes: BlockNode[]): string {
  return nodes.filter((n) => n.actif !== false).map((n) => (n.type === "embed-html" ? n.config?.html || "" : "") + htmlVisible(n.children ?? [])).join("");
}

export function faqBoutique(cfg: ThemeConfig): QuestionFaq[] {
  const arbre = htmlVisible(cfg.builderTree ?? []);
  const design = extraireFaq(arbre || cfg.builderHtml);
  if (design.length) return design;
  const f = cfg.sections?.faq;
  return f?.actif ? (f.items ?? []).filter((q) => q.question?.trim() && q.reponse?.trim()) : [];
}
