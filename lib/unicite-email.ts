import { prisma } from "@/lib/prisma";

// Un e-mail = un seul type de compte. Marchands et livreurs vivent dans User,
// les affiliés dans Affilie (une ligne par programme : un même affilié peut
// rejoindre plusieurs boutiques). On compare sans casse ni espaces.
export const normaliserEmail = (email: string) => email.trim().toLowerCase();

type Db = {
  user: { findFirst(args: any): Promise<{ role: string } | null> };
  affilie: { findFirst(args: any): Promise<unknown | null> };
};

// Message d'erreur si l'e-mail est déjà pris par un autre type de compte, sinon null.
// `pour` = le compte qu'on s'apprête à créer.
export async function emailDejaPris(email: string, pour: "user" | "affilie", db: Db = prisma as any): Promise<string | null> {
  const where = { email: { equals: normaliserEmail(email), mode: "insensitive" } };
  const user = await db.user.findFirst({ where, select: { role: true } });
  if (user) {
    if (pour === "user") return "Cet email est déjà utilisé";
    return user.role === "livreur"
      ? "Cet email est déjà utilisé par un compte livreur — utilisez une autre adresse"
      : "Cet email est déjà utilisé par un compte marchand — utilisez une autre adresse";
  }
  if (pour === "user" && await db.affilie.findFirst({ where, select: { id: true } })) {
    return "Cet email est déjà utilisé par un compte affilié — utilisez une autre adresse";
  }
  return null;
}

// Compte User par e-mail, sans tenir compte de la casse ni des espaces (connexion,
// code, mot de passe oublié) : « Awa@Gmail.com » retrouve « awa@gmail.com ».
export const trouverUserParEmail = (email: string) =>
  prisma.user.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" } } });
