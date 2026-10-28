// Un e-mail = un seul compte Axso (lib/unicite-email.ts), quel que soit son rôle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emailDejaPris, normaliserEmail } from "@/lib/unicite-email";

// Fausse base : compare comme Postgres en mode « insensitive ».
const db = (users: { email: string; role: string }[]) => ({
  user: { findFirst: async ({ where }: any) => users.find((r) => r.email.toLowerCase() === where.email.equals.toLowerCase()) ?? null },
});

test("normalisation : espaces et casse", () => {
  assert.equal(normaliserEmail("  Awa.Diop@Mail.COM "), "awa.diop@mail.com");
});

test("e-mail déjà pris par n'importe quel compte, sans tenir compte de la casse", async () => {
  const base = db([{ email: "Pris@x.com", role: "owner" }, { email: "aff@x.com", role: "affilie" }]);
  assert.equal(await emailDejaPris(" PRIS@x.com ", "user", base), "Cet email est déjà utilisé");
  assert.equal(await emailDejaPris("AFF@x.com", "user", base), "Cet email est déjà utilisé");
  assert.equal(await emailDejaPris("libre@x.com", "user", base), null);
});
