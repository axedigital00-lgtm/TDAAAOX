// Modèles HTML de la bibliothèque AXSO Design (dossier Templates/).
// Sur Cloudflare il n'y a pas de disque : les modèles sont intégrés à la compilation
// (scripts/generer-templates.mjs remplit lib/templates-generes.ts). En local, lecture du disque.
import { readFileSync } from "fs";
import { join } from "path";
import { TEMPLATES } from "./templates-generes";

export const nomTemplateValide = (fichier: string) => /^[a-z0-9-]+\.html$/.test(fichier);

/** Contenu d'un modèle, ou null s'il n'existe pas. */
export function lireTemplate(fichier: string): string | null {
  if (!nomTemplateValide(fichier)) return null;
  if (Object.hasOwn(TEMPLATES, fichier)) return TEMPLATES[fichier];
  try { return readFileSync(join(process.cwd(), "Templates", fichier), "utf-8"); } catch { return null; }
}
