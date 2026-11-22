-- Vente aux grossistes (prix dégressifs, règles de quantité) et marchés multi-pays. Additif.
ALTER TABLE "Produit" ADD COLUMN IF NOT EXISTS "venteGros" JSONB;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "marches" JSONB NOT NULL DEFAULT '[]';
