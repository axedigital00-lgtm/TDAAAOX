import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// PostgreSQL exécute bcrypt pour les Workers. Les mots de passe transitent
// en paramètres liés sur la connexion TLS à Neon. Le texte SQL ne les contient pas.
export async function compare(password: string, encoded: string): Promise<boolean> {
  if (process.env.AXSO_RUNTIME !== "workers" || password.includes("\0")) return bcrypt.compare(password, encoded);
  if (!/^\$2[aby]\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$/.test(encoded)) return false;
  const salt = "$2a$" + encoded.slice(4);
  const [row] = await prisma.$queryRaw<{ ok: boolean }[]>`SELECT crypt(${password}::text, ${salt}::text) = ${salt}::text AS ok`;
  return row.ok;
}

export async function hash(password: string, cost: number): Promise<string> {
  if (process.env.AXSO_RUNTIME !== "workers" || password.includes("\0")) return bcrypt.hash(password, cost);
  const [row] = await prisma.$queryRaw<{ digest: string }[]>`SELECT crypt(${password}::text, gen_salt('bf', ${cost}::integer)) AS digest`;
  return row.digest;
}

export default { compare, hash };
