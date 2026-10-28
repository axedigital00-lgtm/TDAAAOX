import { prisma } from "@/lib/prisma";

// Un e-mail = un seul compte Axso (User) : marchand, livreur ou affilié. Un marchand n'a pas besoin
// d'un second compte pour être affilié : son espace affilié est inclus. On compare sans casse ni espaces.
export const normaliserEmail = (email: string) => email.trim().toLowerCase();

type Db = { user: { findFirst(args: any): Promise<{ role: string } | null> } };

// Message d'erreur si l'e-mail a déjà un compte, sinon null.
export async function emailDejaPris(email: string, _pour: "user" = "user", db: Db = prisma as any): Promise<string | null> {
  const user = await db.user.findFirst({ where: { email: { equals: normaliserEmail(email), mode: "insensitive" } }, select: { role: true } });
  return user ? "Cet email est déjà utilisé" : null;
}

// Compte User par e-mail, sans tenir compte de la casse ni des espaces (connexion,
// code, mot de passe oublié) : « Awa@Gmail.com » retrouve « awa@gmail.com ».
export const trouverUserParEmail = (email: string) =>
  prisma.user.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" } } });
