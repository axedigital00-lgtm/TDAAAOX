"use client";
// Fiche commande provisoire (§8.4) : Produits (recherche + « Parcourir ») et Paiement à gauche,
// Client et Note à droite. Barre d'enregistrement dès qu'un champ change ; « Envoyer la facture »
// (récapitulatif WhatsApp) et « Créer la commande » (même chemin que la vitrine) une fois enregistrée.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import {
  Badge, Button, Card, CardSection, ContextualSaveBar, IconButton, KeyValue, Modal, PageHeader, Select, TextField, Textarea, Thumbnail,
} from "@/components/ui/adm";
import { formatMontant } from "@/lib/utils";
import { BADGES_BROUILLON, totauxBrouillon, type EtatBrouillon, type LigneBrouillon } from "@/lib/commandes-provisoires";

type Produit = { id: string; nom: string; prix: number; image: string | null; stock: number; variantes: { cle: string; prix: number | null }[] };
type ClientConnu = { id: string; nom: string; telephone: string; email: string; adresse: string; ville: string; pays: string };
type Saisie = { clientId: string | null; client: Omit<ClientConnu, "id">; lignes: LigneBrouillon[]; remise: number; livraison: number; note: string };
export type BrouillonInitial = Saisie & { id: string; numero: number; etat: EtatBrouillon; commandeId: string | null };

const VIDE: Saisie = { clientId: null, client: { nom: "", telephone: "", email: "", adresse: "", ville: "", pays: "" }, lignes: [], remise: 0, livraison: 0, note: "" };
const extraire = (b: BrouillonInitial | null): Saisie => (b ? { clientId: b.clientId, client: b.client, lignes: b.lignes, remise: b.remise, livraison: b.livraison, note: b.note } : VIDE);

export function FicheBrouillon({ initial, devise, produits, clients }: { initial: BrouillonInitial | null; devise: string; paysBoutique: string; produits: Produit[]; clients: ClientConnu[] }) {
  const t = useT();
  const router = useRouter();
  const [enregistre, setEnregistre] = useState<Saisie>(() => extraire(initial));
  const [s, setS] = useState<Saisie>(() => extraire(initial));
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<null | "facture" | "convertir" | "supprimer">(null);
  const [recherche, setRecherche] = useState("");
  const [rechercheClient, setRechercheClient] = useState("");
  const [parcourir, setParcourir] = useState(false);
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(enregistre);
  const termine = initial?.etat === "convertie";
  const fmt = (n: number) => formatMontant(n, devise);

  const parId = useMemo(() => new Map(produits.map((p) => [p.id, p])), [produits]);
  const prix = (l: LigneBrouillon) => {
    const p = parId.get(l.produitId);
    return (l.variante ? p?.variantes.find((v) => v.cle === l.variante)?.prix : null) ?? p?.prix ?? 0;
  };
  const tot = totauxBrouillon(s.lignes.map((l) => ({ prix: prix(l), quantite: l.quantite })), s.remise, s.livraison);
  const trouves = recherche.trim() ? produits.filter((p) => p.nom.toLowerCase().includes(recherche.trim().toLowerCase())).slice(0, 8) : [];
  const clientsTrouves = rechercheClient.trim()
    ? clients.filter((c) => `${c.nom} ${c.telephone}`.toLowerCase().includes(rechercheClient.trim().toLowerCase())).slice(0, 6) : [];

  const ajouter = (p: Produit) => {
    setS((x) => {
      const variante = p.variantes[0]?.cle ?? null;
      const i = x.lignes.findIndex((l) => l.produitId === p.id && l.variante === variante);
      const lignes = i >= 0 ? x.lignes.map((l, j) => (j === i ? { ...l, quantite: Math.min(l.quantite + 1, 999) } : l)) : [...x.lignes, { produitId: p.id, variante, quantite: 1 }];
      return { ...x, lignes };
    });
    setRecherche("");
  };
  const majLigne = (i: number, patch: Partial<LigneBrouillon>) => setS((x) => ({ ...x, lignes: x.lignes.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const majClient = (patch: Partial<Saisie["client"]>) => setS((x) => ({ ...x, client: { ...x.client, ...patch } }));

  const enregistrer = async () => {
    if (!s.client.nom.trim() || s.client.telephone.replace(/\D/g, "").length < 6) {
      toast.error(t("Indiquez le nom et le téléphone du client."));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(initial ? `/api/commandes/brouillons/${initial.id}` : "/api/commandes/brouillons", {
        method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...s, note: s.note || null }),
      });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error);
      setEnregistre(s);
      toast.success(t("Commande provisoire enregistrée"));
      if (initial) router.refresh();
      else router.replace(`/dashboard/commandes/brouillons/${r.id}`);
    } catch (e) {
      toast.error((e as Error).message || t("L'enregistrement a échoué. Réessayez."));
    } finally {
      setSaving(false);
    }
  };

  const agir = async (a: "facture" | "convertir") => {
    if (!initial) return;
    setAction(a);
    // Fenêtre ouverte tout de suite (clic utilisateur), sinon le navigateur bloque wa.me.
    const fenetre = window.open("", "_blank");
    try {
      const res = await fetch(`/api/commandes/brouillons/${initial.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: a }) });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error);
      const url = a === "facture" ? r.whatsappUrl : r.whatsappClientUrl;
      if (url && fenetre) fenetre.location.href = url; else fenetre?.close();
      if (a === "facture") {
        toast.success(t("Récapitulatif prêt à envoyer sur WhatsApp"));
        router.refresh();
      } else {
        toast.success(t("Commande #{0} créée", r.numero));
        router.push(`/dashboard/commandes/${r.commandeId}`);
      }
    } catch (e) {
      fenetre?.close();
      toast.error((e as Error).message || t("L'action a échoué. Réessayez."));
    } finally {
      setAction(null);
    }
  };

  const supprimer = async () => {
    if (!initial) return;
    setAction("supprimer");
    const res = await fetch(`/api/commandes/brouillons/${initial.id}`, { method: "DELETE" });
    setAction(null);
    if (!res.ok) { toast.error(t("La suppression a échoué. Réessayez.")); return; }
    toast.success(t("Commande provisoire supprimée"));
    router.push("/dashboard/commandes/brouillons");
  };

  const badge = initial && BADGES_BROUILLON[initial.etat];
  const actionsPossibles = !!initial && !termine && !dirty && s.lignes.length > 0;

  return (
    <div className="space-y-4">
      {!termine && <ContextualSaveBar dirty={dirty} saving={saving} onSave={enregistrer} onDiscard={() => setS(enregistre)} />}
      <PageHeader
        icon="orders"
        backHref="/dashboard/commandes/brouillons"
        title={initial ? `#D${initial.numero}` : t("Créer une commande provisoire")}
        titleMeta={badge ? <Badge tone={badge.tone} progress={badge.progress}>{t(badge.label)}</Badge> : undefined}
        secondaryActions={termine && initial?.commandeId ? [{ content: t("Voir la commande"), href: `/dashboard/commandes/${initial.commandeId}` }] : []}
        overflowActions={initial && !termine ? [{ content: t("Supprimer"), destructive: true, onAction: () => setConfirmerSuppression(true) }] : []}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card title={t("Produits")} padding="none">
            {!termine && (
              <CardSection>
                <div className="flex items-end gap-2">
                  <TextField className="flex-1" label={t("Rechercher des produits")} labelHidden placeholder={t("Rechercher des produits")}
                    value={recherche} onChange={(e) => setRecherche(e.target.value)} />
                  <Button onClick={() => setParcourir(true)}>{t("Parcourir")}</Button>
                </div>
                {trouves.length > 0 && (
                  <ul className="mt-2 divide-y divide-(--color-border-secondary) rounded-(--radius-md) border border-(--color-border)">
                    {trouves.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => ajouter(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-(--color-surface-secondary)">
                          <Thumbnail src={p.image} alt="" size={32} />
                          <span className="flex-1 truncate">{p.nom}</span>
                          <span className="tabular-nums text-(--color-text-secondary)">{fmt(p.prix)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardSection>
            )}
            {s.lignes.length === 0 ? (
              <CardSection><p className="text-(--color-text-secondary)">{t("Ajoutez les articles commandés par le client.")}</p></CardSection>
            ) : s.lignes.map((l, i) => {
              const p = parId.get(l.produitId);
              return (
                <CardSection key={`${l.produitId}-${i}`} className="flex flex-wrap items-center gap-3">
                  <Thumbnail src={p?.image ?? null} alt="" size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-[550] text-(--color-text-strong)">{p?.nom ?? t("Produit retiré de la boutique")}</p>
                    <p className="text-xs text-(--color-text-secondary)">{fmt(prix(l))}{p && p.stock <= 0 ? ` · ${t("Rupture de stock")}` : ""}</p>
                  </div>
                  {p && p.variantes.length > 0 && (
                    <Select label={t("Variante")} labelHidden value={l.variante ?? ""} disabled={termine} className="w-40"
                      options={p.variantes.map((v) => ({ value: v.cle, label: v.cle }))} onChange={(e) => majLigne(i, { variante: e.target.value })} />
                  )}
                  <TextField label={t("Quantité")} labelHidden type="number" min={1} max={999} className="w-20" disabled={termine}
                    value={l.quantite} onChange={(e) => majLigne(i, { quantite: Math.min(Math.max(Math.floor(Number(e.target.value) || 1), 1), 999) })} />
                  <span className="w-24 text-right tabular-nums">{fmt(prix(l) * l.quantite)}</span>
                  {!termine && <IconButton icon="x" aria-label={t("Retirer {0}", p?.nom ?? "")} onClick={() => setS((x) => ({ ...x, lignes: x.lignes.filter((_, j) => j !== i) }))} />}
                </CardSection>
              );
            })}
          </Card>

          <Card title={t("Paiement")}>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <TextField label={t("Remise")} type="number" min={0} disabled={termine} value={s.remise || ""} placeholder="0"
                onChange={(e) => setS((x) => ({ ...x, remise: Math.max(Number(e.target.value) || 0, 0) }))} />
              <TextField label={t("Livraison")} type="number" min={0} disabled={termine} value={s.livraison || ""} placeholder="0"
                onChange={(e) => setS((x) => ({ ...x, livraison: Math.max(Number(e.target.value) || 0, 0) }))} />
            </div>
            <KeyValue items={[
              { label: t("Sous-total"), value: fmt(tot.sousTotal) },
              ...(tot.remise ? [{ label: t("Remise"), value: `−${fmt(tot.remise)}` }] : []),
              { label: t("Livraison"), value: fmt(tot.livraison) },
              { label: t("Total"), value: fmt(tot.total), strong: true },
            ]} />
            <p className="mt-3 text-xs text-(--color-text-secondary)">{t("Paiement à la livraison : le client règle à la réception.")}</p>
            {!termine && (
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-(--color-border-secondary) pt-4">
                <Button disabled={!actionsPossibles || action !== null} loading={action === "facture"} onClick={() => agir("facture")}>{t("Envoyer la facture")}</Button>
                <Button variant="primary" disabled={!actionsPossibles || action !== null} loading={action === "convertir"} onClick={() => agir("convertir")}>{t("Créer la commande")}</Button>
              </div>
            )}
            {!termine && !initial && <p className="mt-2 text-right text-xs text-(--color-text-secondary)">{t("Enregistrez d'abord la commande provisoire.")}</p>}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title={t("Client")}>
            {!termine && (
              <div className="mb-3">
                <TextField label={t("Rechercher un client")} labelHidden placeholder={t("Rechercher un client existant")}
                  value={rechercheClient} onChange={(e) => setRechercheClient(e.target.value)} />
                {clientsTrouves.length > 0 && (
                  <ul className="mt-2 divide-y divide-(--color-border-secondary) rounded-(--radius-md) border border-(--color-border)">
                    {clientsTrouves.map((c) => (
                      <li key={c.id}>
                        <button type="button" className="w-full px-3 py-2 text-left hover:bg-(--color-surface-secondary)"
                          onClick={() => { setS((x) => ({ ...x, clientId: c.id, client: { nom: c.nom, telephone: c.telephone, email: c.email, adresse: c.adresse, ville: c.ville, pays: c.pays } })); setRechercheClient(""); }}>
                          <span className="font-[550] text-(--color-text-strong)">{c.nom}</span> <span className="text-(--color-text-secondary)">{c.telephone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="space-y-3">
              <TextField label={t("Nom")} required disabled={termine} value={s.client.nom} onChange={(e) => setS((x) => ({ ...x, clientId: null, client: { ...x.client, nom: e.target.value } }))} />
              <TextField label={t("Téléphone")} type="tel" required disabled={termine} value={s.client.telephone} onChange={(e) => setS((x) => ({ ...x, clientId: null, client: { ...x.client, telephone: e.target.value } }))} />
              <TextField label={t("E-mail")} type="email" disabled={termine} value={s.client.email} onChange={(e) => majClient({ email: e.target.value })} helpText={t("Facultatif")} />
              <TextField label={t("Adresse de livraison")} disabled={termine} value={s.client.adresse} onChange={(e) => majClient({ adresse: e.target.value })} />
              <TextField label={t("Ville")} disabled={termine} value={s.client.ville} onChange={(e) => majClient({ ville: e.target.value })} />
            </div>
          </Card>
          <Card title={t("Note")}>
            <Textarea label={t("Note")} labelHidden disabled={termine} maxLength={1000} value={s.note} onChange={(e) => setS((x) => ({ ...x, note: e.target.value }))}
              placeholder={t("Visible sur la commande et le bon de livraison")} />
          </Card>
        </div>
      </div>

      <Modal open={parcourir} onClose={() => setParcourir(false)} title={t("Parcourir les produits")} size="lg">
        {produits.length === 0 ? (
          <p className="text-(--color-text-secondary)">{t("Aucun produit physique en ligne dans votre boutique.")}</p>
        ) : (
          <ul className="divide-y divide-(--color-border-secondary)">
            {produits.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <Thumbnail src={p.image} alt="" size={32} />
                <span className="flex-1 truncate">{p.nom}</span>
                <span className="tabular-nums text-(--color-text-secondary)">{fmt(p.prix)}</span>
                <Button size="sm" onClick={() => ajouter(p)}>{t("Ajouter")}</Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={confirmerSuppression} onClose={() => setConfirmerSuppression(false)} title={t("Supprimer la commande provisoire #D{0} ?", initial?.numero ?? "")} size="sm"
        footer={<>
          <Button onClick={() => setConfirmerSuppression(false)}>{t("Annuler")}</Button>
          <Button variant="critical" loading={action === "supprimer"} onClick={supprimer}>{t("Supprimer")}</Button>
        </>}>
        <p>{t("Elle disparaît de la liste. Aucune commande n'a été créée, le stock n'est pas touché.")}</p>
      </Modal>
    </div>
  );
}
