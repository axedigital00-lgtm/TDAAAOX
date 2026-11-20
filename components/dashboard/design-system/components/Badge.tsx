import type { Tone } from "../tokens/tokens";

export type BadgeProgress = "none" | "incomplete" | "partial" | "complete";
export type BadgeProps = { tone?: Tone; progress?: BadgeProgress; children: React.ReactNode };

export function Badge({ tone = "neutral", progress = "none", children }: BadgeProps) {
  return (
    <span className={`axd-badge${tone !== "neutral" ? ` axd-badge--${tone}` : ""}`}>
      {progress !== "none" && <i className={`axd-pip${progress === "incomplete" ? "" : ` axd-pip--${progress}`}`} aria-hidden />}
      {children}
    </span>
  );
}

// ─── Mapping métier obligatoire (§7.2) ──────────────────────────────────────
// Seules sources de couleur de badge autorisées dans l'admin.

type Mapping = { label: string; tone: Tone; progress: BadgeProgress };
const m = (label: string, tone: Tone, progress: BadgeProgress = "none"): Mapping => ({ label, tone, progress });

/** Statut de paiement d'une commande (`Commande.paiementStatut` + moyen). */
export function paymentBadge(statut: string, moyen?: string | null): Mapping {
  switch (statut) {
    case "completed": case "paid": case "paye": case "payee":
      return m(moyen === "mtn_momo" ? "Payé · MTN MoMo" : moyen === "orange_money" ? "Payé · Orange Money" : moyen === "card" ? "Payé · Carte" : "Payé", "success", "complete");
    case "refunded": case "rembourse": return m("Remboursé", "neutral", "complete");
    case "partially_refunded": return m("Partiellement remboursé", "warning", "partial");
    case "voided": case "annule": case "failed": return m("Annulé", "neutral");
    case "cod": case "cod_pending": return m("Paiement à la livraison", "attention", "partial");
    default: return moyen === "cod" ? m("Paiement à la livraison", "attention", "partial") : m("En attente", "warning", "partial");
  }
}

/** Statut de traitement (`Commande.statut`). */
export function fulfillmentBadge(statut: string): Mapping {
  switch (statut) {
    case "en_attente": case "confirmee": return m("Non traitée", "attention", "incomplete");
    case "en_preparation": return m("Partiellement traitée", "warning", "partial");
    case "annulee": return m("Annulée", "neutral");
    default: return m("Traitée", "neutral", "complete");
  }
}

/** Statut de livraison (`Commande.statut`), null avant l'expédition. */
export function deliveryBadge(statut: string): Mapping | null {
  switch (statut) {
    case "expediee": return m("En cours de livraison", "info", "partial");
    case "livree": return m("Livrée", "success", "complete");
    case "tentative_echouee": return m("Refusée à la livraison", "critical");
    default: return null;
  }
}

/** Libellé de canal de vente d'une commande. */
export function canalCommande(c: { canal?: string | null; methodePaiement?: string | null }): string {
  if (c.canal === "pos") return "Point de vente";
  if (c.methodePaiement === "whatsapp_cod") return "Commande WhatsApp";
  if (c.methodePaiement === "direct_cod") return "Formulaire COD";
  return "Boutique en ligne";
}

/** Statut de paiement d'une commande à partir de ses champs. */
export function paiementCommande(c: { paiementStatut: string; methodePaiement: string }): Mapping {
  const enLigne = ["notchpay", "en_attente"].includes(c.methodePaiement);
  if (c.paiementStatut === "pending" && !enLigne) return m("Paiement à la livraison", "attention", "partial");
  return paymentBadge(c.paiementStatut, c.methodePaiement);
}

export function productBadge(statut: "active" | "draft" | "archived"): Mapping {
  return statut === "active" ? m("Actif", "success") : statut === "draft" ? m("Brouillon", "info") : m("Archivé", "neutral");
}

export function discountBadge(statut: "active" | "scheduled" | "expired"): Mapping {
  return statut === "active" ? m("Actif", "success") : statut === "scheduled" ? m("Programmé", "info") : m("Expiré", "neutral");
}

export function recoveryBadge(statut: "not_recovered" | "reminder_sent" | "recovered"): Mapping {
  return statut === "recovered" ? m("Récupéré", "success") : statut === "reminder_sent" ? m("Relance envoyée", "info") : m("Non récupéré", "warning");
}

/** Rendu direct d'un mapping : `<MappedBadge {...fulfillmentBadge(c.statut)} />`. */
export function MappedBadge({ label, tone, progress }: Mapping) {
  return <Badge tone={tone} progress={progress}>{label}</Badge>;
}
