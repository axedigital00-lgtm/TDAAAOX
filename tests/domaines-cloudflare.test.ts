import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { etatDomaineCloudflare } from "@/lib/domaines-cloudflare";

test("un domaine marchand exige un certificat actif et la preuve DNS de la bonne boutique", async t => {
  const domaine = "boutique.example.com";
  const secret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "cle-de-test";
  t.after(() => { if (secret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = secret; });
  const valeur = createHmac("sha256", "cle-de-test").update(JSON.stringify(["domaine", "marchand-a", domaine])).digest("hex");
  let tls = "pending";
  t.mock.method(globalThis, "fetch", async (url: URL) => Response.json(url.hostname === "cloudflare-dns.com"
    ? { Status: 0, Answer: [{ type: 16, data: JSON.stringify(valeur) }] }
    : { success: true, result: [{ hostname: domaine, status: "active", ssl: { status: tls } }] }));
  assert.equal((await etatDomaineCloudflare(domaine, "marchand-a")).actif, false);
  tls = "active";
  assert.equal((await etatDomaineCloudflare(domaine, "marchand-a")).actif, true);
  assert.equal((await etatDomaineCloudflare(domaine, "marchand-b")).actif, false);
});
