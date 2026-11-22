// Prévient l'équipe AXSO d'une candidature de transporteur, par e-mail et sur les appareils admin.
// Jamais bloquant : une alerte en échec n'empêche ni l'inscription ni le dépôt d'un document.
import { envoyerAlerteTransporteur } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { pousserAdmins } from "@/lib/push";
import { EMAIL_RETRAITS } from "@/lib/wallet";
import { DOCUMENTS } from "./libelles";

const SITE = "https://www.axsoafrica.com";
const nomType = (t: string) => (t === "societe" ? "Société de livraison" : "Livreur indépendant");

async function diffuser(titre: string, message: string, lien: string, email: Parameters<typeof envoyerAlerteTransporteur>[0]) {
  const r = await Promise.allSettled([
    pousserAdmins({ titre, message, lien, type: "transporteur_a_valider" }),
    envoyerAlerteTransporteur(email).then((ok) => { if (!ok) throw new Error("e-mail non envoyé"); }),
  ]);
  r.forEach((x) => { if (x.status === "rejected") console.error("[transporteur] alerte", x.reason?.message); });
}

export async function signalerInscriptionTransporteur(p: { type: "livreur" | "societe"; nom: string; email: string; telephone?: string | null; zone?: string | null; vehicule?: string | null }) {
  const lien = p.type === "livreur" ? "/admin/livreurs" : "/admin/logistique?onglet=reseau";
  await diffuser(p.type === "livreur" ? "🛵 Nouveau livreur inscrit" : "🚚 Nouvelle société de livraison", `${p.nom} · ${p.zone || p.email}`, lien, {
    a: EMAIL_RETRAITS, etape: "inscription", nom: p.nom, type: nomType(p.type), email: p.email, telephone: p.telephone ?? null, zones: p.zone ?? null, detail: p.vehicule ?? null, lien: `${SITE}${lien}`,
  });
}

export async function signalerDossierAValider(fournisseurId: string) {
  const f = await prisma.fournisseurLogistique.findUnique({ where: { id: fournisseurId }, select: { nom: true, type: true, email: true, telephone: true, zones: { select: { ville: true } }, documents: { where: { statut: "en_revue" }, select: { type: true } } } });
  if (!f) return;
  const lien = "/admin/logistique?onglet=verification", zones = [...new Set(f.zones.map((z) => z.ville))].join(", ");
  await diffuser("📄 Dossier transporteur à valider", `${f.nom} · ${f.documents.length} document(s)`, lien, {
    a: EMAIL_RETRAITS, etape: "dossier", nom: f.nom, type: nomType(f.type), email: f.email, telephone: f.telephone, zones,
    detail: f.documents.map((d) => DOCUMENTS[d.type] ?? d.type).join(", "), lien: `${SITE}${lien}`,
  });
}
