"use client";
// Dashboard — Codes Promo
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Tag, Trash2 } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { Badge, Bouton, BoutonIcone, Champ, CLASSE_SAISIE, EnTetePage, EtatErreur, EtatVide, Saisie, SqueletteListe, useConfirmation } from "@/components/ui";

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

const FORM_VIDE = { code: "", type: "pourcentage", valeur: 10, maxUtilisations: "" };

export default function CodesPromoPage() {
  const t = useT();
  const { confirmer, dialogue } = useConfirmation();
  const [codes, setCodes] = useState<CodePromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);

  const charger = () => {
    setLoading(true); setErreur(false);
    fetch("/api/codes-promo")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCodes(Array.isArray(d) ? d : []))
      .catch(() => setErreur(true))
      .finally(() => setLoading(false));
  };
  useEffect(charger, []);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/codes-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, valeur: Number(form.valeur), maxUtilisations: form.maxUtilisations ? Number(form.maxUtilisations) : null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ? t(d.error) : t("Le code n'a pas été créé. Vérifie les champs et réessaie."));
        return;
      }
      const nouveau = await res.json();
      setCodes((prev) => [nouveau, ...prev]);
      setShowForm(false);
      setForm(FORM_VIDE);
      toast.success(t("Code promo {0} créé.", nouveau.code ?? form.code));
    } catch {
      toast.error(t("Connexion impossible : le code n'a pas été créé. Réessaie."));
    } finally {
      setSaving(false);
    }
  }

  async function supprimer(code: CodePromo) {
    if (!(await confirmer({
      titre: t("Supprimer ce code promo ?"), objet: code.code,
      description: t("Tes clients ne pourront plus l'utiliser. Les commandes déjà passées avec ce code ne changent pas."),
      libelleConfirmer: t("Supprimer le code"),
    }))) return;
    try {
      const res = await fetch(`/api/codes-promo/${code.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCodes((prev) => prev.filter((c) => c.id !== code.id));
      toast.success(t("Code {0} supprimé.", code.code));
    } catch {
      toast.error(t("Le code {0} n'a pas été supprimé. Réessaie.", code.code));
    }
  }

  const remise = (code: CodePromo) => code.type === "pourcentage" ? `${code.valeur}%` : `${code.valeur} (${t("fixe")})`;

  return (
    <div className="space-y-5 max-w-3xl">
      {dialogue}
      <EnTetePage className="mb-0"
        retour={{ href: "/dashboard/marketing", libelle: t("Marketing") }}
        titre={t("Codes Promo")}
        description={loading || erreur ? undefined : <>{codes.length}{" "}{t("code(s) au total")}</>}
        actions={!showForm && <Bouton icone={<Plus className="size-4" aria-hidden />} onClick={() => setShowForm(true)}>{t("Créer un code")}</Bouton>} />

      {showForm && (
        <form onSubmit={creer} className="ax-card p-carte space-y-champs">
          <h2 className="ax-sous-titre">{t("Nouveau code promo")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Saisie label={t("Code")} required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="SOLDES25" classeChamp="font-mono" aide={t("Ce que le client tape au paiement.")} />
            <Champ label={t("Type")}>
              {(a) => (
                <select {...a} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={CLASSE_SAISIE}>
                  <option value="pourcentage">{t("Pourcentage (%)")}</option>
                  <option value="fixe">{t("Montant fixe")}</option>
                </select>
              )}
            </Champ>
            <Saisie label={t("Valeur")} required type="number" min={1} value={form.valeur}
              onChange={(e) => setForm({ ...form, valeur: Number(e.target.value) })} suffixe={form.type === "pourcentage" ? "%" : undefined} />
            <Saisie label={t("Nombre maximum d'utilisations")} mention="facultatif" type="number" min={1} value={form.maxUtilisations}
              onChange={(e) => setForm({ ...form, maxUtilisations: e.target.value })} placeholder="∞" aide={t("Laisse vide pour un nombre illimité.")} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Bouton variante="secondaire" onClick={() => setShowForm(false)} disabled={saving}>{t("Annuler")}</Bouton>
            <Bouton type="submit" disabled={!form.code || !form.valeur} charge={saving} texteCharge={t("Création…")}>{t("Créer le code")}</Bouton>
          </div>
        </form>
      )}

      {loading ? (
        <SqueletteListe lignes={4} libelle={t("Chargement des codes promo…")} />
      ) : erreur ? (
        <EtatErreur titre={t("Les codes promo n'ont pas pu être chargés")} texte={t("Vérifie ta connexion et réessaie.")} onReessayer={charger} />
      ) : codes.length === 0 ? (
        <EtatVide icone={<Tag />} titre={t("Aucun code promo")}
          texte={t("Un code promo offre une remise à tes clients au moment du paiement. Crée ton premier code pour lancer une offre.")}>
          {!showForm && <Bouton icone={<Plus className="size-4" aria-hidden />} onClick={() => setShowForm(true)}>{t("Créer un code")}</Bouton>}
        </EtatVide>
      ) : (
        <div className="ax-card overflow-hidden">
          {/* Téléphone : cartes empilées */}
          <ul className="sm:hidden divide-y divide-bordure">
            {codes.map((code) => (
              <li key={code.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <code className="inline-block text-sm font-mono font-bold px-2 py-0.5 rounded-controle bg-primaire-fond text-encre border border-attention-bordure">{code.code}</code>
                  <p className="ax-aide">{remise(code)} · {code.utilisations}/{code.maxUtilisations ?? "∞"} {t("utilisations")}</p>
                </div>
                <Badge ton={code.actif ? "succes" : "neutre"}>{code.actif ? t("Actif") : t("Inactif")}</Badge>
                <BoutonIcone label={t("Supprimer le code {0}", code.code)} onClick={() => supprimer(code)} className="text-erreur"><Trash2 className="size-4" aria-hidden /></BoutonIcone>
              </li>
            ))}
          </ul>
          {/* Ordinateur : tableau */}
          <table className="hidden sm:table w-full text-sm">
            <thead>
              <tr className="border-b border-bordure bg-carte-2">
                {["Code", "Remise", "Utilisations", "Statut"].map((h) => (
                  <th key={h} scope="col" className="text-left text-xs text-doux font-semibold px-5 py-3">{t(h)}</th>
                ))}
                <th scope="col" className="px-5 py-3"><span className="sr-only">{t("Actions")}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bordure">
              {codes.map((code) => (
                <tr key={code.id}>
                  <td className="px-5 py-3"><code className="text-encre bg-primaire-fond border border-attention-bordure px-2 py-1 rounded-controle font-mono font-bold">{code.code}</code></td>
                  <td className="px-5 py-3 text-encre">{remise(code)}</td>
                  <td className="px-5 py-3 text-doux tabular-nums">{code.utilisations}/{code.maxUtilisations ?? "∞"}</td>
                  <td className="px-5 py-3"><Badge ton={code.actif ? "succes" : "neutre"}>{code.actif ? t("Actif") : t("Inactif")}</Badge></td>
                  <td className="px-5 py-2 text-right">
                    <BoutonIcone label={t("Supprimer le code {0}", code.code)} onClick={() => supprimer(code)} className="text-erreur"><Trash2 className="size-4" aria-hidden /></BoutonIcone>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
