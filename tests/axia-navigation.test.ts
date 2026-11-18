// Axia : une demande d'accord n'est jamais affichée comme faite. Menu : un seul lien actif.
import { test } from "node:test";
import assert from "node:assert/strict";
import { etatActionAxia } from "@/components/dashboard/AxiaBulle";
import { estActif } from "@/components/dashboard/Sidebar";

test("état des actions d'AXIA", () => {
  const attente = etatActionAxia("EN ATTENTE DE CONFIRMATION : « Changer un prix » n'est PAS encore fait. Le marchand doit l'autoriser…");
  assert.deepEqual(attente, { etat: "attente", texte: "Changer un prix" });
  assert.equal(etatActionAxia("✅ Produit physique \"Robe\" créé à 5000").etat, "fait");
  assert.equal(etatActionAxia("✅ Produit physique \"Robe\" créé").texte, "Produit physique \"Robe\" créé");
  assert.equal(etatActionAxia("Produit introuvable").etat, "echec");
  assert.equal(etatActionAxia("L'action \"x\" a échoué : timeout").etat, "echec");
  assert.deepEqual(etatActionAxia("OUVRIR_PAGE:/dashboard/produits\nPage « Produits » ouverte à l'écran du marchand."),
    { etat: "page", texte: "Page « Produits » ouverte à l'écran du marchand." });
  assert.equal(etatActionAxia("12 produits trouvés : Robe, Pagne…").etat, "consultation");
  assert.ok(etatActionAxia("x".repeat(300)).texte.length <= 141);
});

test("menu : Livraison seule active sur Ma boutique › livraison", () => {
  const sp = (q: string) => new URLSearchParams(q);
  const maBoutique = { href: "/dashboard/boutique", exact: true };
  const livraison = { href: "/dashboard/boutique?section=livraison" };
  assert.equal(estActif(maBoutique, "/dashboard/boutique", sp("section=livraison")), false);
  assert.equal(estActif(livraison, "/dashboard/boutique", sp("section=livraison")), true);
  assert.equal(estActif(maBoutique, "/dashboard/boutique", sp("")), true);
  assert.equal(estActif(maBoutique, "/dashboard/boutique", sp("section=seo")), true);
  assert.equal(estActif(livraison, "/dashboard/boutique", sp("")), false);
  // AXIA : « ?axia » seul ou avec une question.
  assert.equal(estActif({ href: "/dashboard?axia" }, "/dashboard", sp("axia=Bonjour")), true);
  assert.equal(estActif({ href: "/dashboard?axia" }, "/dashboard", sp("")), false);
});
