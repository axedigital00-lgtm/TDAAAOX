// Éditeur du formulaire Releasit COD AXSO : lecture et enregistrement du formulaire et du test A/B.
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contexteMarchand } from "@/lib/commande-express/acces";
import { lireFormulaire, LIBELLES_DEFAUT, MODELES, schemaFormulaire } from "@/lib/commande-express/formulaire";

const schemaAb = z.object({ actif: z.boolean(), texteB: z.string().trim().min(2).max(40) });

export async function GET() {
  const c = await contexteMarchand("lecture");
  if ("erreur" in c) return c.erreur;
  const r = await prisma.reglagesCommandeExpress.findUnique({ where: { tenantId: c.tenantId } });
  return NextResponse.json({
    formulaire: lireFormulaire(r?.formulaire, r?.demanderEmail ?? false),
    abTest: (r?.abTest as { actif?: boolean; texteB?: string; debut?: string } | null) ?? { actif: false, texteB: "" },
    reglages: { couleur: r?.couleur ?? "#0A1A33", texteBouton: r?.texteBouton ?? "Commander maintenant" },
    modeles: Object.entries(MODELES).map(([id, m]) => ({ id, ...m })), libellesDefaut: LIBELLES_DEFAUT,
  });
}

export async function PATCH(req: NextRequest) {
  const c = await contexteMarchand("ecriture");
  if ("erreur" in c) return c.erreur;
  const b = await req.json().catch(() => ({}));
  const data: Prisma.ReglagesCommandeExpressUpdateInput = {};
  if (b.formulaire !== undefined) {
    const f = schemaFormulaire.safeParse(b.formulaire);
    if (!f.success) return NextResponse.json({ error: f.error.issues[0]?.message ?? "Formulaire invalide" }, { status: 400 });
    data.formulaire = f.data as Prisma.InputJsonValue;
    // Compatibilité : le champ e-mail du formulaire pilote aussi l'ancien réglage « Demander l'e-mail ».
    const email = f.data.champs.find((x) => x.cle === "email");
    if (email) data.demanderEmail = email.visible !== false;
  }
  if (b.abTest !== undefined) {
    const a = schemaAb.safeParse(b.abTest);
    if (!a.success) return NextResponse.json({ error: "Indiquez le texte du bouton B" }, { status: 400 });
    const avant = await prisma.reglagesCommandeExpress.findUnique({ where: { tenantId: c.tenantId }, select: { abTest: true } });
    const ancien = (avant?.abTest ?? {}) as { actif?: boolean; texteB?: string; debut?: string };
    // Un nouveau test (activation ou nouveau texte B) repart de zéro pour comparer à armes égales.
    const nouveau = a.data.actif && (!ancien.actif || ancien.texteB !== a.data.texteB);
    data.abTest = { ...a.data, debut: nouveau ? new Date().toISOString().slice(0, 10) : ancien.debut ?? new Date().toISOString().slice(0, 10) };
  }
  const r = await prisma.reglagesCommandeExpress.upsert({ where: { tenantId: c.tenantId }, create: { ...(data as Omit<Prisma.ReglagesCommandeExpressCreateInput, "tenantId">), tenantId: c.tenantId }, update: data });
  return NextResponse.json({ formulaire: lireFormulaire(r.formulaire, r.demanderEmail), abTest: r.abTest });
}
