import { cookies } from "next/headers";
import { rattacherFilleul } from "@/lib/parrainage";
import { COOKIE_PARRAIN } from "@/lib/parrainage-regles";
import { aiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { annoncerInscription } from "@/lib/push";
import { NextResponse, after } from "next/server";
import { generateProductImageUrl, buildProductImagePrompt } from "@/lib/image-gen";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "@/lib/mots-de-passe";
import { analyserBusinessEtCreerPlan, deviseDuPays } from "@/lib/ai-agent";
import { slugify, slugBoutiqueValide } from "@/lib/utils";
import { z } from "zod";
import { generateStoreConfig } from "@/lib/generate-store-config";
import { provisionerThemeInitial } from "@/lib/axso-design-library";
import { notifierMarchand } from "@/lib/notifications-marchand";
import { emailDejaPris } from "@/lib/unicite-email";

// Analyse IA (10-45 s quand Gemini bascule sur ses modèles de secours) : le défaut serverless coupe avant.
export const maxDuration = 120;

const schemaAnalyser = z.object({
  phase: z.literal("analyser"),
  description: z.string().min(10),
});

const schemaExecuter = z.object({
  phase: z.literal("executer"),
  // Choisi au tout début du parcours, avant même la description libre —
  // détermine la structure de la boutique (catalogue complet vs page de
  // vente unique). Absent = "catalogue" (comportement historique inchangé).
  typeBoutique: z.enum(["physique", "digital"]).optional(),
  // Les 4 designs AXSO Design proposés à l'inscription — seuls designs
  // proposés ensuite dans le Constructeur (ThemeConfig.designsOrigine).
  designsProposes: z.array(z.string()).max(4).optional(),
  plan: z.object({
    nomBoutique: z.string(),
    slug: z.string(),
    categorie: z.string(),
    pays: z.string(),
    devise: z.string(),
    themeId: z.string(),
    description: z.string().optional(),
    produits: z.array(z.object({
      nom: z.string(),
      description: z.string().optional(),
      prix: z.number(),
      stock: z.number().optional(),
      categorie: z.string(),
      imageUrl: z.string().optional(),
      type: z.enum(["physique", "digital"]).optional(),
    })),
    livraison: z.object({
      locale: z.number(),
      nationale: z.number(),
      gratuite: z.number(),
    }).optional(),
    sections: z.array(z.object({
      type: z.string(),
      label: z.string(),
      config: z.record(z.string(), z.any()),
    })).optional(),
  }),
  compte: z.object({
    name: z.string().min(2),
    email: z.string().trim().email(),
    password: z.string().min(6),
    whatsapp: z.string().min(8).optional(),
  }),
});

export async function POST(request: Request) {
  try {
    // Public (avant la création du compte) mais payant à chaque appel : limité par IP.
    const rl = aiLimiter.check(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl.reset);
    const body = await request.json();

    if (body.phase === "analyser") {
      const { description } = schemaAnalyser.parse(body);

      const plan = await analyserBusinessEtCreerPlan(description);

      // Vérifier unicité du slug et ajuster si nécessaire
      let slug = plan.slug || slugify(plan.nomBoutique);
      const slugExiste = await prisma.tenant.findUnique({ where: { slug } });
      // Pris ou réservé (sous-domaine technique, page du site) : suffixe unique.
      if (slugExiste || !slugBoutiqueValide(slug)) slug = `${slug.slice(0, 50)}-${Date.now().toString(36)}`;

      return NextResponse.json({ plan: { ...plan, slug }, messageIA: plan.messageIA });
    }

    if (body.phase === "executer") {
      const { plan, compte, typeBoutique, designsProposes } = schemaExecuter.parse(body);
      plan.devise = deviseDuPays(plan.pays, plan.devise);
      const modeBoutique = typeBoutique === "digital" ? "digital" : "catalogue";
      // Email normalisé : la connexion compare en minuscules, sans espaces.
      compte.email = compte.email.trim().toLowerCase();

      // Vérifier que l'email n'existe pas déjà. Exception : nouvel essai après une création
      // réussie dont la réponse s'est perdue (coupure réseau, délai) : même e-mail, même mot de
      // passe, boutique créée il y a moins de 30 min → on renvoie cette boutique, sans doublon.
      const emailPris = await emailDejaPris(compte.email, "user");
      if (emailPris) {
        const existant = await prisma.user.findFirst({
          where: { email: { equals: compte.email, mode: "insensitive" }, role: "owner", createdAt: { gte: new Date(Date.now() - 30 * 60_000) } },
          select: { password: true, tenantId: true },
        });
        const boutique = existant?.tenantId ? await prisma.tenant.findUnique({ where: { id: existant.tenantId }, select: { id: true, slug: true } }) : null;
        if (boutique && existant?.password && await compare(compte.password, existant.password).catch(() => false)) {
          return NextResponse.json({ success: true, slug: boutique.slug, tenantId: boutique.id, repris: true }, { status: 201 });
        }
        return NextResponse.json({ message: emailPris, code: "email_pris" }, { status: 400 });
      }

      // Vérifier unicité du slug
      // Le slug vient du navigateur : mêmes règles qu'en phase « analyser ».
      let slug = slugify(plan.slug) || slugify(plan.nomBoutique) || "boutique";
      const slugExiste = await prisma.tenant.findUnique({ where: { slug } });
      if (slugExiste || !slugBoutiqueValide(slug)) slug = `${slug.slice(0, 50)}-${Date.now().toString(36)}`;

      // Clés lues par le calcul des frais (lib/livraison-reglages.ts) : avant, locale / nationale /
      // gratuiteA étaient enregistrées mais jamais lues, et la boutique démarrait avec 0 de frais.
      const parametresLivraison = plan.livraison ? {
        frais: plan.livraison.locale,
        minimum: plan.livraison.gratuite,
      } : {};

      // Transformer les sections du plan IA en CustomSection pour le themeConfig
      const customSections = (plan.sections ?? []).map((s: any, i: number) => ({
        id: `ia-${s.type}-${i}`,
        type: s.type,
        label: s.label,
        actif: true,
        ordre: i + 1,
        config: s.config ?? {},
      }));

      // Générer le themeConfig structurel (sections homepage + page produit)
      const { themeConfig: generatedConfig } = generateStoreConfig({
        categorie: plan.categorie,
        nomBoutique: plan.nomBoutique,
        pays: plan.pays,
        devise: plan.devise,
        modeBoutique,
      });

      // Fusionner : structure générée + sections custom de l'IA.
      const themeConfig: Record<string, any> = {
        ...generatedConfig,
        ...(customSections.length > 0 && { customSections }),
        ...(designsProposes?.length && { designsOrigine: designsProposes }),
      };

      // Mot de passe chiffré AVANT la transaction : sur Workers, le chiffrement passe par
      // PostgreSQL sur une seconde connexion ; dans la transaction, son ouverture (base en veille)
      // faisait expirer la transaction et échouer l'inscription.
      const motDePasseChiffre = await hash(compte.password, 10);

      // Transaction : créer tenant + user + produits
      const codeParrain = (await cookies()).get(COOKIE_PARRAIN)?.value;
      const { tenant, produitsCreees } = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            slug,
            nomBoutique: plan.nomBoutique,
            categorie: plan.categorie,
            pays: plan.pays,
            devise: plan.devise,
            whatsapp: compte.whatsapp || "",
            email: compte.email,
            description: plan.description || "",
            parametresLivraison,
            commissionRate: 0.1,
            // "brouillon" : la boutique n'est visible sur /{slug} qu'une fois
            // publiée explicitement (critères vérifiés par lib/boutique-completion.ts) —
            // le marchand personnalise d'abord dans le Constructeur.
            statut: "brouillon",
            planType: "palier0",
            themeConfig,
          },
        });

        await tx.user.create({
          data: {
            name: compte.name,
            email: compte.email,
            password: motDePasseChiffre,
            tenantId: tenant.id,
            role: "owner",
            // Lien propriétaire ↔ boutique : sans lui, le multi-boutique ne voit pas cette boutique.
            boutiques: { create: { tenantId: tenant.id, role: "owner" } },
          },
        });

        // Slugs uniques avant la boucle : une erreur dans la transaction l'annulerait en entier (Postgres).
        const slugsPris = new Set<string>();
        const produitsCreees: { id: string; nom: string; categorie: string }[] = [];
        for (const p of plan.produits.slice(0, 5)) {
          const base = slugify(p.nom) || "produit";
          let produitSlug = base;
          for (let n = 2; slugsPris.has(produitSlug); n++) produitSlug = `${base}-${n}`;
          slugsPris.add(produitSlug);
          const cree = await tx.produit.create({
            data: {
              tenantId: tenant.id,
              nom: p.nom,
              slug: produitSlug,
              description: p.description || "",
              prix: p.prix,
              // Produits proposés par l'IA : brouillons à vérifier (prix, photo, stock) par le marchand.
              // Stock strict : 0 tant qu'il n'a pas saisi son vrai stock ; inactifs → jamais publiés tels quels.
              stock: 0,
              categorie: p.categorie,
              images: p.imageUrl ? [p.imageUrl] : [],
              type: p.type ?? "physique",
              actif: false,
              featured: true,
            },
          });
          produitsCreees.push({ id: cree.id, nom: p.nom, categorie: p.categorie });
        }

        return { tenant, produitsCreees };
      }, { maxWait: 10_000, timeout: 20_000 });
      // Tout le reste se fait APRÈS la réponse : le marchand n'attend plus, et un échec
      // (calcul trop long sur le Worker, quota d'images, notification) ne peut plus faire
      // échouer une inscription dont la boutique est déjà créée. Si le thème n'a pas pu être
      // préparé, la boutique reste sur le socle par défaut et « Ma boutique » propose
      // l'étape « Choisissez un thème ».
      after(async () => {
        const etape = async (nom: string, f: () => Promise<unknown>) => {
          try { await f(); } catch (err) { console.warn(`[API/AI/ONBOARDING] ${nom} (non bloquant):`, err instanceof Error ? err.message.slice(0, 160) : err); }
        };
        await etape("parrainage", () => rattacherFilleul(tenant.id, { email: compte.email, telephone: compte.whatsapp }, codeParrain));
        // Design de la bibliothèque AXSO Design choisi par plan.themeId, avec les vrais produits.
        await etape("thème", async () => {
          const theme = await provisionerThemeInitial({
            tenantId: tenant.id, categorie: plan.categorie, slug: tenant.slug,
            nomBoutique: tenant.nomBoutique, devise: tenant.devise, fichier: plan.themeId,
          });
          await prisma.tenant.update({ where: { id: tenant.id }, data: { themeId: theme.id } });
        });
        // Boutique créée en "brouillon" : il reste à vérifier ses infos avant de publier.
        await etape("notification", () => notifierMarchand({
          tenantId: tenant.id,
          type: "boutique_a_completer",
          titre: "Ta boutique n'est pas encore publiée",
          message: "Vérifie tes infos (WhatsApp, description) dans le Constructeur. Les produits proposés par l'IA sont en brouillon avec un stock à 0 : vérifie prix, photos et stock puis active-les avant de publier ta boutique.",
          lien: "/dashboard/builder",
        }));
        await etape("annonce", () => annoncerInscription({ name: compte.name, email: compte.email, role: "owner", tenantId: tenant.id }));
        // Visuels des produits proposés (brouillons) : en dernier, chacun limité à 20 s.
        await etape("visuels", () => Promise.all(produitsCreees.map(async (p) => {
          const url = await Promise.race([
            generateProductImageUrl(buildProductImagePrompt(p.nom, p.categorie || plan.categorie), tenant.id),
            new Promise<string>((ok) => setTimeout(() => ok(""), 20_000)),
          ]);
          if (url && !url.startsWith("data:")) await prisma.produit.update({ where: { id: p.id }, data: { images: [url] } });
        })));
      });

      // Aucun avis ni client fictif : la vitrine masque la section Avis tant qu'il n'y a pas de vrais avis.
      return NextResponse.json({
        success: true,
        slug: tenant.slug,
        tenantId: tenant.id,
        produitsCreees: produitsCreees.length,
      }, { status: 201 });
    }

    return NextResponse.json({ message: "Phase invalide" }, { status: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ message: "Données invalides", erreurs: err.issues }, { status: 400 });
    }
    if ((err as any)?.message?.includes("configuré") || (err as any)?.message?.includes("GEMINI_API_KEY")) {
      return NextResponse.json({ message: "Aucun fournisseur IA configuré. Ajoute GEMINI_API_KEY dans .env.local" }, { status: 503 });
    }
    console.error("[API/AI/ONBOARDING]", err);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
