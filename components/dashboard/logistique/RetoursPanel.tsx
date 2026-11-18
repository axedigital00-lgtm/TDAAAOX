"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, XCircle, Clock, Plus, ChevronDown } from "lucide-react";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { formatMontant, cn } from "@/lib/utils";
import {
  Badge, Bouton, Champ, CLASSE_SAISIE, EtatErreur, EtatVide, Saisie, SqueletteListe, ZoneTexte, useConfirmation, type Ton,
} from "@/components/ui";

const RETOURS_TUTORIAL_STEPS = [
  { Icon: Plus,         titre: "Crée un retour",       description: "Renseigne le numéro d'une commande livrée, la raison et le type de résolution (remboursement, échange, avoir)." },
  { Icon: Clock,        titre: "Suis la progression",  description: "Fais passer un retour de \"Ouvert\" à \"En cours\" pendant qu'il est traité." },
  { Icon: CheckCircle,  titre: "Accepte ou rejette",   description: "Accepter un remboursement rembourse toute la commande (argent, stock, accès digitaux). Sinon, rejette ou clos." },
  { Icon: ChevronDown,  titre: "Consulte les détails", description: "Clique sur une ligne pour voir la description, l'email du client et les notes internes." },
];

interface Retour {
  id: string;
  commandeId: string;
  clientNom: string;
  clientEmail: string | null;
  raison: string;
  description: string | null;
  type: string;
  statut: string;
  montant: number | null;
  notes: string | null;
  createdAt: string;
  commande: { numero: string; montantTotal: number; devise: string };
}

interface Stats {
  total: number;
  ouverts: number;
  enCours: number;
  acceptes: number;
}

const STATUT_CONFIG: Record<string, { label: string; ton: Ton }> = {
  ouvert: { label: "Ouvert", ton: "attention" },
  en_cours: { label: "En cours", ton: "info" },
  accepte: { label: "Accepté", ton: "succes" },
  rejete: { label: "Rejeté", ton: "erreur" },
  clos: { label: "Clos", ton: "neutre" },
};

const RAISON_LABELS: Record<string, string> = {
  defaut: "Produit défectueux",
  erreur_commande: "Erreur de commande",
  change_avis: "Changement d'avis",
  endommage: "Produit endommagé",
  non_recu: "Non reçu",
};

const TYPE_LABELS: Record<string, string> = {
  remboursement: "Remboursement",
  echange: "Échange",
  avoir: "Avoir",
};

const FORM_VIDE = { commande: "", raison: "defaut", description: "", type: "remboursement" };

export function RetoursPanel() {
  const t = useT();
  const { confirmer, dialogue } = useConfirmation();
  const [retours, setRetours] = useState<Retour[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, ouverts: 0, enCours: 0, acceptes: 0 });
  const [loading, setLoading] = useState(true);
  const [echec, setEchec] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [erreurCommande, setErreurCommande] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);

  function charger() {
    setEchec(false);
    return fetch("/api/retours")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setRetours(d.retours ?? []); setStats(d.stats ?? {}); })
      .catch(() => setEchec(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { charger(); }, []);

  async function updateStatut(r: Retour, statut: string) {
    const nomRetour = t("Retour de {0} — commande #{1}", r.clientNom, r.commande.numero);
    if (statut === "accepte") {
      const remb = r.type === "remboursement";
      const ok = await confirmer({
        titre: t("Accepter ce retour ?"),
        objet: nomRetour,
        description: remb
          ? t("Toute la commande est remboursée : l'argent est rendu au client, le stock est remis et les accès digitaux sont retirés. Ce n'est pas annulable.")
          : t("Le retour est marqué accepté ({0}). Tu règles l'échange ou l'avoir avec le client.", t(TYPE_LABELS[r.type] ?? r.type)),
        libelleConfirmer: remb ? t("Accepter et rembourser") : t("Accepter le retour"),
        destructive: false,
      });
      if (!ok) return;
    }
    if (statut === "rejete" && !(await confirmer({
      titre: t("Rejeter ce retour ?"),
      objet: nomRetour,
      description: t("Le client ne sera pas remboursé pour cette demande."),
      libelleConfirmer: t("Rejeter le retour"),
    }))) return;

    setEnCours(r.id + statut);
    try {
      const res = await fetch("/api/retours", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, statut }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.retour) throw new Error(data.error);
      setRetours((prev) => prev.map((x) => x.id === r.id ? { ...x, statut } : x));
      toast.success(t("Retour de {0} : « {1} ».", r.clientNom, t(STATUT_CONFIG[statut]?.label ?? statut)));
      charger(); // compteurs à jour
    } catch (e: any) {
      toast.error(e?.message ? t(e.message) : t("Le statut du retour n'a pas pu être changé. Réessaie."));
    } finally {
      setEnCours(null);
    }
  }

  async function createRetour() {
    if (!form.commande.trim()) { setErreurCommande(t("Indique le numéro de la commande livrée, par exemple AX-20261007-1234.")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/retours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.retour) throw new Error(data.error);
      setForm(FORM_VIDE);
      setShowForm(false);
      toast.success(t("Retour créé pour la commande {0}.", form.commande.trim()));
      charger();
    } catch (e: any) {
      // Le serveur dit pourquoi (commande introuvable, non livrée…) : on l'affiche sous le champ.
      setErreurCommande(e?.message ? t(e.message) : t("Le retour n'a pas pu être créé. Réessaie."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <SqueletteListe lignes={4} libelle={t("Chargement des retours…")} />;
  if (echec) return <EtatErreur titre={t("Les retours n'ont pas pu être chargés")} texte={t("Vérifie ta connexion puis réessaie.")} onReessayer={charger} />;

  return (
    <div className="space-y-5">
      {dialogue}
      <ModuleTutorial moduleKey="logistique-retours" titre={t("Retours")} sousTitre={t("Gestion des retours & RMA")} steps={RETOURS_TUTORIAL_STEPS} />
      {!showForm && (
        <div className="flex items-center justify-end">
          <Bouton icone={<Plus className="size-4" aria-hidden />} onClick={() => setShowForm(true)}>{t("Créer un retour")}</Bouton>
        </div>
      )}

      {/* Compteurs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Ouverts", value: stats.ouverts },
          { label: "En cours", value: stats.enCours },
          { label: "Acceptés", value: stats.acceptes },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-carte border border-bordure bg-carte p-4">
            <p className="ax-aide">{t(label)}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-encre">{value ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Formulaire création */}
      {showForm && (
        <form className="rounded-carte border border-bordure bg-carte p-carte space-y-champs" noValidate onSubmit={(e) => { e.preventDefault(); createRetour(); }}>
          <h3 className="ax-sous-titre">{t("Nouveau retour")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Saisie className="sm:col-span-2" label={t("N° de commande (livrée)")} mention="obligatoire" placeholder="AX-20261007-1234"
              value={form.commande} erreur={erreurCommande}
              onChange={(e) => { setErreurCommande(null); setForm((f) => ({ ...f, commande: e.target.value })); }} />
            <Champ label={t("Raison")}>
              {(a) => (
                <select {...a} className={CLASSE_SAISIE} value={form.raison} onChange={(e) => setForm((f) => ({ ...f, raison: e.target.value }))}>
                  {Object.entries(RAISON_LABELS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
                </select>
              )}
            </Champ>
            <Champ label={t("Type de résolution")} aide={form.type === "remboursement" ? t("Accepter le retour remboursera toute la commande.") : undefined}>
              {(a) => (
                <select {...a} className={CLASSE_SAISIE} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
                </select>
              )}
            </Champ>
            <ZoneTexte className="sm:col-span-2" label={t("Description")} mention="facultatif" rows={2}
              value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Bouton variante="secondaire" onClick={() => { setShowForm(false); setErreurCommande(null); }}>{t("Annuler")}</Bouton>
            <Bouton type="submit" charge={saving} texteCharge={t("Enregistrement…")}>{t("Créer le retour")}</Bouton>
          </div>
        </form>
      )}

      {/* Liste des retours */}
      {retours.length === 0 ? (
        <EtatVide icone={<RefreshCw />} titre={t("Aucun retour pour l'instant. C'est bon signe !")}
          texte={t("Quand un client renvoie un produit, crée le retour ici à partir du numéro de sa commande.")} />
      ) : (
        <ul className="space-y-2">
          {retours.map((r) => {
            const sc = STATUT_CONFIG[r.statut] ?? { label: r.statut, ton: "neutre" as Ton };
            const isExpanded = expanded === r.id;
            return (
              <li key={r.id} className="overflow-hidden rounded-carte border border-bordure bg-carte">
                <button type="button" aria-expanded={isExpanded}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-carte-2 sm:gap-4"
                  onClick={() => setExpanded(isExpanded ? null : r.id)}>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-encre">{t(r.clientNom)}</span>
                      <Badge ton={sc.ton}>{t(sc.label)}</Badge>
                      <span className="ax-aide">{t(TYPE_LABELS[r.type] ?? r.type)}</span>
                    </span>
                    <span className="mt-0.5 block ax-aide">
                      {t("Commande")}{" "}#{r.commande.numero} · {t(RAISON_LABELS[r.raison] ?? r.raison)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {r.montant ? <span className="block text-sm font-bold text-encre">{formatMontant(r.montant, r.commande.devise)}</span> : null}
                    <span className="block ax-aide">{new Date(r.createdAt).toLocaleDateString("fr")}</span>
                  </span>
                  <ChevronDown className={cn("size-4 shrink-0 text-doux transition-transform", isExpanded && "rotate-180")} aria-hidden />
                </button>

                {isExpanded && (
                  <div className="space-y-3 border-t border-bordure bg-carte-2 p-4">
                    {r.description && <p className="ax-texte">{t(r.description)}</p>}
                    {r.clientEmail && <p className="break-all ax-aide">{t("Email client :")}{" "}{r.clientEmail}</p>}
                    {r.statut === "accepte" && r.type === "remboursement" && <p className="text-sm font-medium text-succes">{t("Commande remboursée.")}</p>}
                    {r.notes && <p className="italic ax-aide">{t("Note :")}{" "}{t(r.notes)}</p>}
                    <div className="flex flex-wrap gap-2">
                      {r.statut !== "accepte" && (
                        <Bouton taille="compact" icone={<CheckCircle className="size-4" aria-hidden />} charge={enCours === r.id + "accepte"}
                          onClick={() => updateStatut(r, "accepte")}>
                          {r.type === "remboursement" ? t("Accepter et rembourser") : t("Accepter le retour")}
                        </Bouton>
                      )}
                      {r.statut !== "accepte" && r.statut !== "en_cours" && r.statut !== "clos" && (
                        <Bouton taille="compact" variante="secondaire" icone={<Clock className="size-4" aria-hidden />} charge={enCours === r.id + "en_cours"}
                          onClick={() => updateStatut(r, "en_cours")}>
                          {t("Passer en cours")}
                        </Bouton>
                      )}
                      {r.statut !== "accepte" && r.statut !== "rejete" && (
                        <Bouton taille="compact" variante="danger" icone={<XCircle className="size-4" aria-hidden />} charge={enCours === r.id + "rejete"}
                          onClick={() => updateStatut(r, "rejete")}>
                          {t("Rejeter le retour")}
                        </Bouton>
                      )}
                      {r.statut !== "clos" && (
                        <Bouton taille="compact" variante="fantome" charge={enCours === r.id + "clos"} onClick={() => updateStatut(r, "clos")}>
                          {t("Clore le retour")}
                        </Bouton>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
