// Pixels publicitaires : plusieurs par plateforme (Meta, TikTok, Snapchat), un seul conteneur GTM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { listePixels, normaliserPixels, MAX_PIXELS } from "@/lib/pixels";

test("liste : virgules, espaces et doublons", () => {
  assert.deepEqual(listePixels(" 1234567890 , 9876543210\n1234567890 "), ["1234567890", "9876543210"]);
  assert.deepEqual(listePixels(null), []);
});

test("plusieurs pixels Meta acceptés, enregistrés séparés par des virgules", () => {
  assert.deepEqual(normaliserPixels("metaPixelId", "1234567890, 9876543210"), { valeur: "1234567890,9876543210" });
  assert.deepEqual(normaliserPixels("metaPixelId", ["1234567890", "9876543210"]), { valeur: "1234567890,9876543210" });
  assert.deepEqual(normaliserPixels("metaPixelId", ""), { valeur: null });
});

test("un identifiant mal formé ou trop de pixels sont refusés", () => {
  assert.ok("erreur" in normaliserPixels("metaPixelId", "1234567890, abc"));
  const trop = Array.from({ length: MAX_PIXELS + 1 }, (_, i) => String(1000000000 + i)).join(",");
  assert.ok("erreur" in normaliserPixels("metaPixelId", trop));
});

test("GTM : un seul conteneur", () => {
  assert.deepEqual(normaliserPixels("gtmId", "GTM-ABC123"), { valeur: "GTM-ABC123" });
  assert.ok("erreur" in normaliserPixels("gtmId", "GTM-ABC123,GTM-XYZ789"));
});
