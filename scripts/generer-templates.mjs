// Intègre les modèles Templates/*.html au code compilé pour Cloudflare (pas de disque sur Workers).
// Lancé par `npm run build:cloudflare` ; le fichier généré n'est pas à commiter.
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const racine = process.cwd();
const fichiers = readdirSync(join(racine, "Templates")).filter((f) => /^[a-z0-9-]+\.html$/.test(f)).sort();
if (!fichiers.length) throw new Error("Aucun modèle dans Templates/");
const contenu = Object.fromEntries(fichiers.map((f) => [f, readFileSync(join(racine, "Templates", f), "utf8")]));
writeFileSync(join(racine, "lib", "templates-generes.ts"), `// Généré par scripts/generer-templates.mjs : ne pas modifier.\nexport const TEMPLATES: Record<string, string> = ${JSON.stringify(contenu)};\n`);
console.log(`${fichiers.length} modèles intégrés`);
