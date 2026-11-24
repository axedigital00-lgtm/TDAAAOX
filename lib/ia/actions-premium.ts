// Actions IA premium payées en coins : débit, appel OpenAI, coût réel enregistré, remboursement si échec.
import { randomUUID } from "crypto";
import { persisterImageGeneree } from "@/lib/image-gen";
import { ACTIONS, coutUsd, type ActionPremium } from "./coins-regles";
import { debiterCoins, ErreurCoins, rembourserCoins } from "./coins";
import { enregistrerDepense, verifierBudget } from "./depenses";
import { imageOpenAI, openaiConfigure, texteOpenAI } from "./openai";

const STYLE = "Photographie publicitaire professionnelle, éclairage soigné, rendu haut de gamme, sans texte ni logo ajouté.";

export async function lancerActionPremium(tenantId: string, action: ActionPremium, brief: string) {
  const def = ACTIONS[action];
  if (!def) throw new ErreurCoins("Action inconnue");
  const consigne = brief.trim().slice(0, 1200);
  if (consigne.length < 8) throw new ErreurCoins("Décris ce que tu veux en une phrase au moins");
  if (!openaiConfigure()) throw new ErreurCoins("Les actions IA premium arrivent bientôt", 503);
  const budget = await verifierBudget();
  if (!budget.ok) throw new ErreurCoins(budget.motif, 503);

  const operation = randomUUID();
  await debiterCoins(tenantId, def.coins, action, operation);
  let cout = 0;
  try {
    let texte: string | null = null, promptImage = `${consigne}\n${STYLE}`;
    if (action === "publicite") {
      const t = await texteOpenAI(
        "Tu es concepteur-rédacteur pour des commerçants africains. Réponds en français, sans emoji excessif. Donne : un titre accrocheur (8 mots max), un texte de publicité (40 mots max), un appel à l'action, puis une ligne commençant par « VISUEL: » décrivant l'image idéale. N'invente aucun prix, avis ou chiffre.",
        consigne, 600,
      );
      cout += coutUsd(t.modele, t.entree, t.sortie) ?? 0;
      await enregistrerDepense({ tenantId, action, fournisseur: "openai", modele: t.modele, entree: t.entree, sortie: t.sortie, coutUsd: coutUsd(t.modele, t.entree, t.sortie) ?? 0 });
      const [corps, visuel] = t.texte.split(/VISUEL:/i);
      texte = corps.trim();
      if (visuel?.trim()) promptImage = `${visuel.trim()}\n${STYLE}`;
    }
    const img = await imageOpenAI(promptImage, action === "visuel" ? "medium" : "high");
    const c = coutUsd(img.modele, img.entree, img.sortie) ?? 0;
    cout += c;
    await enregistrerDepense({ tenantId, action, fournisseur: "openai", modele: img.modele, entree: img.entree, sortie: img.sortie, images: 1, coutUsd: c, coins: def.coins });
    const url = await persisterImageGeneree(img.dataUrl, tenantId);
    return { operation, coins: def.coins, image: url, texte, coutUsd: cout };
  } catch (e) {
    await rembourserCoins(tenantId, operation);
    await enregistrerDepense({ tenantId, action, fournisseur: "openai", modele: "echec", coutUsd: cout, statut: "echec" }).catch(() => {});
    console.error("[ia premium]", action, e instanceof Error ? e.message : e);
    throw new ErreurCoins("La génération a échoué. Tes coins t'ont été rendus.", 502);
  }
}
