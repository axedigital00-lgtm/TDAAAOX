// Éléments principaux d'une section de design (bloc embed-html) : titres,
// textes, boutons, liens, images, champs. Listés dans l'arborescence du
// panneau de gauche et dans la recherche ; repérés par leur rang dans le HTML
// (l'identifiant data-axs-el n'est posé qu'à la sélection). Navigateur uniquement.
import { ATTR_EL, genElId, nomElement } from "./boutique/elements-dom";

const PRINCIPAUX = "h1,h2,h3,h4,h5,h6,p,a,button,img,input,textarea";

export interface ElementPrincipal { index: number; id: string | null; tag: string; nom: string; texte: string }

const parser = (html: string) => new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, "text/html");

const estPrincipal = (el: Element) => el.matches(PRINCIPAUX) && !el.parentElement?.closest("a,button");

export function elementsPrincipaux(html: string): ElementPrincipal[] {
  return [...parser(html).body.querySelectorAll("*")].flatMap((el, index) =>
    estPrincipal(el)
      ? [{
          index,
          id: el.getAttribute(ATTR_EL),
          tag: el.tagName.toLowerCase(),
          nom: nomElement(el.tagName, el.getAttribute("class") || ""),
          texte: (el.getAttribute("alt") || el.getAttribute("placeholder") || el.textContent || "").replace(/\s+/g, " ").trim(),
        }]
      : []);
}

/** Identifiant de l'élément de rang `index` (posé si absent) ; null si introuvable. */
export function poserIdElement(html: string, index: number): { html: string; id: string } | null {
  const doc = parser(html);
  const el = doc.body.querySelectorAll("*")[index];
  if (!el) return null;
  const id = el.getAttribute(ATTR_EL);
  if (id) return { html, id };
  const neuf = genElId();
  el.setAttribute(ATTR_EL, neuf);
  return { html: doc.body.innerHTML, id: neuf };
}

// Synchro survol aperçu ⇄ arborescence : un élément est désigné par « idDuBloc#rang ».
// Le rendu d'un design dans l'aperçu ([data-embed-noeud]) a les mêmes rangs que son HTML :
// on le retrouve sans rien écrire dans le HTML enregistré.
export const cleElement = (embedId: string, index: number) => `${embedId}#${index}`;

/** Élément de rang `index` dans le rendu `racine` d'un design. */
export const elementDeRang = (racine: Element, index: number) => racine.querySelectorAll("*")[index] as HTMLElement | undefined;

/** Élément listé (titre, bouton…) contenant `el` dans le rendu `racine`, avec son rang ; null sinon. */
export function principalDe(racine: Element, el: Element | null): { el: HTMLElement; index: number } | null {
  for (let e = el; e && e !== racine && racine.contains(e); e = e.parentElement) {
    if (estPrincipal(e)) return { el: e as HTMLElement, index: [...racine.querySelectorAll("*")].indexOf(e) };
  }
  return null;
}
