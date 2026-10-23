// Un e-mail = un seul type de compte (lib/unicite-email.ts) : marchand/livreur (User) ou affilié (Affilie).
import { test } from "node:test";
import assert from "node:assert/strict";
import { emailDejaPris, normaliserEmail } from "@/lib/unicite-email";

// Fausse base : compare comme Postgres en mode « insensitive ».
function db(users: { email: string; role: string }[], affilies: { email: string }[]) {
  const trouve = <T extends { email: string }>(rows: T[]) => async ({ where }: any) =>
    rows.find((r) => r.email.toLowerCase() === where.email.equals.toLowerCase()) ?? null;
  return { user: { findFirst: trouve(users) }, affilie: { findFirst: trouve(affilies) } };
}

test("normalisation : espaces et casse", () => {
  assert.equal(normaliserEmail("  Awa.Diop@Mail.COM "), "awa.diop@mail.com");
});

test("affilié refusé si l'e-mail est celui d'un marchand ou d'un livreur", async () => {
  const base = db([{ email: "Marchand@x.com", role: "owner" }, { email: "liv@x.com", role: "livreur" }], []);
  assert.match((await emailDejaPris(" marchand@X.com ", "affilie", base))!, /compte marchand/);
  assert.match((await emailDejaPris("LIV@x.com", "affilie", base))!, /compte livreur/);
  assert.equal(await emailDejaPris("autre@x.com", "affilie", base), null);
});

test("marchand ou livreur refusé si l'e-mail est celui d'un affilié (ou d'un autre compte)", async () => {
  const base = db([{ email: "pris@x.com", role: "owner" }], [{ email: "Affilie@x.com" }]);
  assert.match((await emailDejaPris("affilie@x.COM", "user", base))!, /compte affilié/);
  assert.equal(await emailDejaPris("PRIS@x.com", "user", base), "Cet email est déjà utilisé");
  assert.equal(await emailDejaPris("libre@x.com", "user", base), null);
});

test("un affilié peut rejoindre plusieurs programmes avec le même e-mail", async () => {
  assert.equal(await emailDejaPris("affilie@x.com", "affilie", db([], [{ email: "affilie@x.com" }])), null);
});
