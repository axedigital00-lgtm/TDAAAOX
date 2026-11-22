"use client";
// Réductions (MASTERPROMPT §8.14) : liste des codes promo, création et
// suppression via /api/codes-promo (inchangé).
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { discountBadge, MappedBadge } from "@/components/dashboard/design-system/components/Badge";
import { IndexFilters, IndexTable } from "@/components/dashboard/design-system/components/IndexTable";
import { Modal } from "@/components/dashboard/design-system/components/Modal";
import { Button, IconButton } from "@/components/dashboard/design-system/components/Button";
import { Field } from "@/components/dashboard/design-system/components/primitives";
import { dateRelativeAdmin, nombre } from "@/components/dashboard/design-system/format";

type CodePromo = {
  id: string;
  code: string;
  type: string;
  valeur: number;
  actif: boolean;
  utilisations: number;
  maxUtilisations: number | null;
  dateExpiration: string | null;
};

const VUES = [{ id: "toutes", label: "Toutes" }, { id: "actives", label: "Actives" }, { id: "expirees", label: "Expirées" }];
const FORM_VIDE = { code: "", type: "pourcentage", valeur: 10, maxUtilisations: "" };

function statut(c: CodePromo): "active" | "expired" {
  return c.actif && (!c.dateExpiration || new Date(c.dateExpiration) > new Date()) && (c.maxUtilisations === null || c.utilisations < c.maxUtilisations) ? "active" : "expired";
}

export default function CodesPromoPage() {
  const t = useT();
  const params = useSearchParams();
  const [codes, setCodes] = useState<CodePromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creation, setCreation] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);
  const [aSupprimer, setASupprimer] = useState<CodePromo | null>(null);

  useEffect(() => {
    fetch("/api/codes-promo")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCodes(Array.isArray(d) ? d : []))
      .catch(() => toast.error(t("Impossible de charger les réductions.")))
      .finally(() => setLoading(false));
  }, [t]);

  async function creer() {
    setSaving(true);
    try {
      const res = await fetch("/api/codes-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, valeur: Number(form.valeur), maxUtilisations: form.maxUtilisations ? Number(form.maxUtilisations) : null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(t(d.error || "Erreur lors de la création"));
        return;
      }
      const nouveau = await res.json();
      setCodes((prev) => [nouveau, ...prev]);
      setCreation(false);
      setForm(FORM_VIDE);
      toast.success(t("Réduction {0} créée", nouveau.code));
    } catch {
      toast.error(t("Erreur lors de la création"));
    } finally {
      setSaving(false);
    }
  }

  async function supprimer(c: CodePromo) {
    setASupprimer(null);
    try {
      const res = await fetch(`/api/codes-promo/${c.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCodes((prev) => prev.filter((x) => x.id !== c.id));
      toast.success(t("Réduction {0} supprimée", c.code));
    } catch {
      toast.error(t("Erreur lors de la suppression"));
    }
  }

  const vue = params.get("view") ?? "toutes";
  const q = (params.get("q") ?? "").toLowerCase();
  const liste = useMemo(() => codes.filter((c) =>
    (vue === "toutes" || (vue === "actives" ? statut(c) === "active" : statut(c) === "expired"))
    && (!q || c.code.toLowerCase().includes(q))), [codes, vue, q]);

  return (
    <Page>
      <PageHeader icon="discount" title={t("Réductions")} primaryAction={{ content: t("Créer une réduction"), onAction: () => setCreation(true) }} />

      {!loading && codes.length === 0 ? (
        <div className="axd-card"><div className="axd-empty">
          <img src="/visuels/board-reductions.webp" alt="" width={200} height={150} style={{ objectFit: "cover", borderRadius: 12 }} />
          <h3>{t("Gérez vos réductions et promotions")}</h3>
          <p>{t("Créez des codes de réduction à partager sur WhatsApp, Facebook ou en boutique, et suivez leur utilisation.")}</p>
          <div className="axd-empty__actions"><Button variant="primary" onClick={() => setCreation(true)}>{t("Créer une réduction")}</Button></div>
        </div></div>
      ) : (
        <div className="axd-card">
          <IndexFilters views={VUES} />
          <IndexTable
            selectable={false}
            columns={[
              { id: "titre", header: t("Titre"), mobilePrimary: true },
              { id: "statut", header: t("Statut") },
              { id: "methode", header: t("Méthode"), hideOnMobile: true },
              { id: "type", header: t("Type"), hideOnMobile: true },
              { id: "expiration", header: t("Expiration"), hideOnMobile: true },
              { id: "utilisations", header: t("Utilisations"), numeric: true },
              { id: "actions", header: "" },
            ]}
            rows={liste.map((c) => ({
              id: c.id,
              cells: {
                titre: (
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--color-text-strong)" }}>{c.code}</div>
                    <div className="axd-muted" style={{ fontSize: 12, fontWeight: 400 }}>
                      {c.type === "pourcentage" ? t("{0} % de réduction sur la commande", c.valeur) : t("{0} de réduction sur la commande", nombre(c.valeur))}
                    </div>
                  </div>
                ),
                statut: <MappedBadge {...discountBadge(statut(c))} />,
                methode: t("Code"),
                type: c.type === "pourcentage" ? t("Pourcentage sur la commande") : t("Montant sur la commande"),
                expiration: c.dateExpiration ? dateRelativeAdmin(c.dateExpiration) : <span className="axd-subdued">—</span>,
                utilisations: c.maxUtilisations ? `${nombre(c.utilisations)} / ${nombre(c.maxUtilisations)}` : nombre(c.utilisations),
                actions: <IconButton icon="x" aria-label={t("Supprimer {0}", c.code)} onClick={() => setASupprimer(c)} />,
              },
            }))}
            emptyState={(
              <div className="axd-empty">
                <h3>{t("Aucune réduction trouvée")}</h3>
                <p>{t("Essayez de modifier les filtres ou le terme de recherche")}</p>
                <div className="axd-empty__actions"><Button href="/dashboard/marketing/codes-promo">{t("Effacer les filtres")}</Button></div>
              </div>
            )}
          />
          {loading && <p className="axd-cmdk__empty">{t("Chargement…")}</p>}
        </div>
      )}

      <Modal open={creation} onClose={() => setCreation(false)} title={t("Créer une réduction")}
        footer={<><Button onClick={() => setCreation(false)}>{t("Annuler")}</Button><Button variant="primary" loading={saving} disabled={!form.code.trim()} onClick={creer}>{t("Enregistrer")}</Button></>}>
        <div className="axd-modal__body">
          <Field label={t("Code de réduction")} help={t("Les clients saisissent ce code au moment de payer.")}>
            {(p) => <input {...p} className="axd-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="TABASKI10" />}
          </Field>
          <div className="axd-grid axd-g2">
            <Field label={t("Type")}>
              {(p) => (
                <select {...p} className="axd-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="pourcentage">{t("Pourcentage")}</option>
                  <option value="fixe">{t("Montant fixe")}</option>
                </select>
              )}
            </Field>
            <Field label={form.type === "pourcentage" ? t("Valeur (%)") : t("Montant")}>
              {(p) => <input {...p} type="number" min={0} className="axd-input" value={form.valeur} onChange={(e) => setForm({ ...form, valeur: Number(e.target.value) })} />}
            </Field>
          </div>
          <Field label={t("Nombre maximal d’utilisations")} help={t("Laissez vide pour un nombre illimité.")}>
            {(p) => <input {...p} type="number" min={1} className="axd-input" value={form.maxUtilisations} onChange={(e) => setForm({ ...form, maxUtilisations: e.target.value })} />}
          </Field>
        </div>
      </Modal>

      <Modal open={!!aSupprimer} onClose={() => setASupprimer(null)} size="sm" title={t("Supprimer la réduction {0} ?", aSupprimer?.code ?? "")}
        footer={<><Button onClick={() => setASupprimer(null)}>{t("Annuler")}</Button><Button variant="critical" onClick={() => aSupprimer && supprimer(aSupprimer)}>{t("Supprimer")}</Button></>}>
        <div className="axd-modal__body">{t("Cette action est irréversible.")}</div>
      </Modal>
    </Page>
  );
}

