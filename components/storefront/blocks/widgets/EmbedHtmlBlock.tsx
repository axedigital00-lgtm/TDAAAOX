import type { BlockRenderProps } from "../types";
import { scoperCss } from "@/lib/scope-css";
import { hrefBoutique } from "@/lib/utils";

// Rend tel quel le HTML/CSS AXSO Design cloné (voir lib/theme-import-clone.ts,
// déjà assaini à l'import : scripts retirés, gestionnaires d'événements et
// liens javascript: neutralisés) — même mécanisme que ImportedLiteralHomePage,
// simplement enveloppé comme un bloc du Constructeur libre. `config.css` est
// confiné au bloc (@scope, voir lib/scope-css.ts). Les sections découpées d'un
// design (constructeur boutique) n'ont pas de CSS propre : il est injecté une
// fois pour toutes par la page (cssSectionsDesign).
export function EmbedHtmlBlock({ id, config, slug }: BlockRenderProps) {
  // Liens saisis dans le Constructeur (« /contact », ancien « axsoafrica.com/nom/… ») : ramenés à la boutique au rendu.
  const html = config?.html && slug ? String(config.html).replace(/(<a\b[^>]*?\shref=)(["'])(.*?)\2/gi, (_, debut, q, href) => `${debut}${q}${hrefBoutique(slug, href) ?? href}${q}`) : config?.html;
  return (
    // cssPage : section d'une page importée seule — son CSS est celui de la page (cssPageImportee).
    <div data-axs-id={id} data-axs-embed-html="1" data-axs-css-page={config?.cssPage ? "" : undefined}>
      {config?.css && <style dangerouslySetInnerHTML={{ __html: scoperCss(config.css, `[data-axs-id="${id}"]`) }} />}
      {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}
