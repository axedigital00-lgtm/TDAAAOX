// Le choix de langue suit le visiteur entre www et les sous-domaines des boutiques.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cookiesLangue } from "@/lib/i18n";

test("cookie de langue partagé sur le domaine AXSO", () => {
  for (const h of ["www.axsoafrica.com", "ma-boutique.axsoafrica.com", "axsoafrica.com"]) {
    const c = cookiesLangue("en", h, "axsoafrica.com");
    assert.equal(c[0], "langue=; path=/; max-age=0");
    assert.ok(c[1].startsWith("langue=en;") && c[1].endsWith("domain=.axsoafrica.com"));
  }
});

test("cookie limité à l'hôte ailleurs", () => {
  for (const [h, d] of [["boutique-client.com", "axsoafrica.com"], ["localhost", "localhost:3000"], ["axso-free.axedigital00.workers.dev", "axso-free.axedigital00.workers.dev"]]) {
    const c = cookiesLangue("fr", h, d);
    assert.equal(c.length, 1);
    assert.ok(!c[0].includes("domain="));
  }
});
