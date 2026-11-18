-- Parcours de démarrage du marchand (Accueil, politiques, coordonnées). Mode d'achat : clé parametresCommande.modeAchat (JSON existant).
ALTER TABLE "Tenant" ADD COLUMN "politiques" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Tenant" ADD COLUMN "demarrage" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Tenant" ADD COLUMN "horaires" TEXT;
ALTER TABLE "Produit" ADD COLUMN "exempleAxia" BOOLEAN NOT NULL DEFAULT false;
