"use client";
import { useEffect, useState } from "react";
import { Plus, Star, Package, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { Badge, Bouton, EnTetePage, EtatErreur, EtatVide, Saisie, SqueletteListe, useConfirmation } from "@/components/ui";
import { cn } from "@/lib/utils";

const ENTREPOTS_TUTORIAL_STEPS = [
  { Icon: Plus,      titre: "Ajoute un entrepôt",           description: "Renseigne le nom, la ville et l'adresse pour créer un nouveau point de stockage." },
  { Icon: Star,      titre: "Définis l'entrepôt principal", description: "Marque un entrepôt comme principal — c'est celui utilisé par défaut pour ton stock." },
  { Icon: Package,   titre: "Suis le stock par site",       description: "Chaque entrepôt affiche le nombre de références (produits ou variantes) qui y sont stockées." },
  { Icon: Warehouse, titre: "Active ou désactive",          description: "Désactive temporairement un entrepôt sans perdre son historique de stock." },
];

interface Entrepot {
  id: string;
  nom: string;
  adresse: string | null;
  ville: string | null;
  pays: string;
  principal: boolean;
  actif: boolean;
  _count: { stocks: number };
}

const EMPTY = { nom: "", adresse: "", ville: "", pays: "Cameroun", principal: false };

export default function EntrepotsPage() {
  const t = useT();
  const { confirmer, dialogue } = useConfirmation();
  const [entrepots, setEntrepots] = useState<Entrepot[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [echec, setEchec] = useState(false);
  const [erreurNom, setErreurNom] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/entrepots");
      if (!r.ok) throw new Error();
      setEntrepots((await r.json()).entrepots ?? []);
      setEchec(false);
    } catch {
      setEchec(true);
    } finally {
      setChargement(false);
    }
  }
  useEffect(() => { load(); }, []);

  // Un refus du serveur (entrepôt non vide, magasin rattaché…) s'affiche tel quel.
  async function envoyer(url: string, method: string, body?: unknown) {
    const r = await fetch(url, { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) }).catch(() => null);
    if (!r?.ok) toast.error(t((await r?.json().catch(() => null))?.error ?? "Cette action n'a pas pu être enregistrée. Vérifie ta connexion puis réessaie."));
    return !!r?.ok;
  }

  async function save() {
    if (!form.nom.trim()) { setErreurNom(t("Donnez un nom à l'entrepôt.")); return; }
    setLoading(true);
    const method = editId ? "PATCH" : "POST";
    const body = editId ? { ...form, id: editId } : form;
    if (await envoyer("/api/entrepots", method, body)) {
      toast.success(editId ? t("Entrepôt « {0} » modifié.", form.nom.trim()) : t("Entrepôt « {0} » créé.", form.nom.trim()));
      setForm({ ...EMPTY });
      setEditId(null);
    }
    await load();
    setLoading(false);
  }

  async function toggleActif(e: Entrepot) {
    if (await envoyer("/api/entrepots", "PATCH", { id: e.id, actif: !e.actif }))
      toast.success(e.actif ? t("Entrepôt « {0} » désactivé.", e.nom) : t("Entrepôt « {0} » activé.", e.nom));
    load();
  }

  async function setPrincipal(e: Entrepot) {
    if (await envoyer("/api/entrepots", "PATCH", { id: e.id, principal: true }))
      toast.success(t("« {0} » est maintenant l'entrepôt principal.", e.nom));
    load();
  }

  async function del(e: Entrepot) {
    const ok = await confirmer({
      titre: t("Supprimer cet entrepôt ?"),
      objet: e.nom,
      description: t("L'entrepôt disparaît de ta liste. Pour le garder sans l'utiliser, désactive-le plutôt."),
      libelleConfirmer: t("Supprimer l'entrepôt"),
    });
    if (!ok) return;
    if (await envoyer(`/api/entrepots?id=${e.id}`, "DELETE")) toast.success(t("Entrepôt « {0} » supprimé.", e.nom));
    load();
  }

  function startEdit(e: Entrepot) {
    setEditId(e.id);
    setErreurNom(null);
    setForm({ nom: e.nom, adresse: e.adresse ?? "", ville: e.ville ?? "", pays: e.pays, principal: e.principal });
    document.getElementById("form-entrepot")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {dialogue}
      <ModuleTutorial moduleKey="entrepots" titre={t("Entrepôts")} sousTitre={t("Tes points de stockage")} steps={ENTREPOTS_TUTORIAL_STEPS} />
      <EnTetePage
        retour={{ href: "/dashboard/logistique", libelle: t("Logistique") }}
        titre={t("Entrepôts")}
        description={t("Les lieux où tu ranges ton stock. Le stock de chaque produit est suivi par entrepôt.")}
        indicateurs={<><AgentActiveIndicator label={t("Agent Stock actif")} /><BoutonRevoirTutoriel moduleKey="entrepots" /></>}
        className="mb-0"
      />

      {/* Compteurs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Entrepôts", v: entrepots.length },
          { label: "Actifs", v: entrepots.filter(e => e.actif).length },
          { label: "Références en stock", v: entrepots.reduce((s, e) => s + e._count.stocks, 0) },
        ].map(s => (
          <div key={s.label} className="rounded-carte border border-bordure bg-carte p-3 text-center sm:p-4">
            <p className="text-2xl font-bold tabular-nums text-encre">{s.v}</p>
            <p className="mt-0.5 ax-aide">{t(s.label)}</p>
          </div>
        ))}
      </div>

      {/* Formulaire */}
      <form id="form-entrepot" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}
        className={cn("rounded-carte border bg-carte p-carte space-y-champs scroll-mt-4", editId ? "border-primaire" : "border-bordure")}>
        <h2 className="ax-sous-titre">{editId ? t("Modifier l'entrepôt") : t("Nouvel entrepôt")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Saisie label={t("Nom")} mention="obligatoire" placeholder={t("ex : Entrepôt Douala")} value={form.nom} erreur={erreurNom}
            onChange={e => { setErreurNom(null); setForm(f => ({ ...f, nom: e.target.value })); }} />
          <Saisie label={t("Ville")} value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} />
          <Saisie label={t("Adresse")} value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} />
          <Saisie label={t("Pays")} value={form.pays} onChange={e => setForm(f => ({ ...f, pays: e.target.value }))} />
        </div>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 ax-texte">
          <input type="checkbox" className="size-5 accent-[var(--ax-primaire)]" checked={form.principal} onChange={e => setForm(f => ({ ...f, principal: e.target.checked }))} />
          {t("Entrepôt principal (utilisé par défaut pour le stock)")}
        </label>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {editId && (
            <Bouton variante="secondaire" onClick={() => { setEditId(null); setErreurNom(null); setForm({ ...EMPTY }); }}>{t("Annuler")}</Bouton>
          )}
          <Bouton type="submit" charge={loading} texteCharge={t("Enregistrement…")} icone={editId ? undefined : <Plus className="size-4" aria-hidden />}>
            {editId ? t("Enregistrer les modifications") : t("Créer l'entrepôt")}
          </Bouton>
        </div>
      </form>

      {/* Liste */}
      {chargement ? (
        <SqueletteListe lignes={3} libelle={t("Chargement des entrepôts…")} />
      ) : echec ? (
        <EtatErreur titre={t("Les entrepôts n'ont pas pu être chargés")} texte={t("Vérifie ta connexion puis réessaie.")} onReessayer={load} />
      ) : !entrepots.length ? (
        <EtatVide icone={<Warehouse />} titre={t("Aucun entrepôt")} texte={t("Aucun entrepôt. Crée ton premier entrepôt pour gérer le stock multi-site.")} />
      ) : (
        <ul className="space-y-2">
          {entrepots.map(e => (
            <li key={e.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 rounded-carte border border-bordure p-4", e.actif ? "bg-carte" : "bg-carte-2")}>
              <div className="min-w-[12rem] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-encre">{e.nom}</span>
                  {e.principal && <Badge ton="accent" icone={<Star aria-hidden />}>{t("Principal")}</Badge>}
                  {!e.actif && <Badge>{t("Désactivé")}</Badge>}
                </div>
                <p className="mt-0.5 ax-aide">
                  {[e.adresse, e.ville, e.pays].filter(Boolean).join(", ")} · {t("{0} référence(s) en stock", e._count.stocks)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!e.principal && e.actif && (
                  <Bouton taille="compact" variante="secondaire" onClick={() => setPrincipal(e)}>{t("Définir comme principal")}</Bouton>
                )}
                <Bouton taille="compact" variante="secondaire" onClick={() => startEdit(e)}>{t("Modifier")}</Bouton>
                <Bouton taille="compact" variante="secondaire" onClick={() => toggleActif(e)}>
                  {e.actif ? t("Désactiver") : t("Activer")}
                </Bouton>
                <Bouton taille="compact" variante="danger" onClick={() => del(e)}>{t("Supprimer")}</Bouton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
