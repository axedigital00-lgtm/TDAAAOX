"use client";
// Charges d'exploitation du magasin : liste, totaux, saisie, « payée », suppression.
// Même socle que les autres écrans « Finance du magasin » (components/pos/finance/commun
// et le kit components/pos/ui). Les dépenses sorties d'une caisse (sessionCaisseId)
// ne se suppriment pas ici : le serveur le refuse, l'écran le dit d'avance.
import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Clock, Plus, Receipt, Trash2, Wallet } from "lucide-react";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { useDevise } from "@/components/dashboard/DeviseProvider";
import { Badge, Bouton, BoutonIcone, CLASSE_SAISIE, Champ, EtatChargement, EtatPos, EtatVide, Modale, Saisie, type Ton } from "@/components/pos/ui";
import { Carte, Chiffre, EnTete, Page, appelPos, lireMontant, useLecture } from "@/components/pos/finance/commun";

const CHARGES_TUTORIAL_STEPS = [
  { Icon: Plus,          titre: "Enregistrer une charge", description: "Loyer, salaires, électricité, fournitures... Choisis une catégorie, un montant et une fréquence (ponctuelle ou récurrente)." },
  { Icon: Clock,         titre: "Suivi du paiement",       description: "Marque une charge \"En attente\" tant qu'elle n'est pas réglée, puis clique \"Marquer comme payée\" une fois le paiement effectué." },
  { Icon: CheckCircle2,  titre: "Impact sur la rentabilité", description: "Toutes tes charges alimentent automatiquement le module Comptabilité pour calculer ton vrai bénéfice net." },
];

interface Charge {
  id: string; categorie: string; description: string; montant: number; devise: string;
  frequence: string; dateEnregistrement: string; statut: string; fournisseur: string | null;
  /** Dépense sortie d'une caisse : elle fait partie du comptage de la session. */
  sessionCaisseId?: string | null;
}
type Donnees = { charges: Charge[]; stats: { total: number; enAttente: number } | null };

const CATEGORIES = [
  { v: "loyer", l: "Loyer" }, { v: "electricite", l: "Électricité" }, { v: "eau", l: "Eau" },
  { v: "internet", l: "Internet" }, { v: "fournitures", l: "Fournitures" }, { v: "equipement", l: "Équipement" },
  { v: "salaires", l: "Salaires" }, { v: "transport", l: "Transport" }, { v: "autre", l: "Autre" },
];
const FREQUENCES = [
  { v: "ponctuelle", l: "Ponctuelle" }, { v: "hebdomadaire", l: "Hebdomadaire" },
  { v: "mensuelle", l: "Mensuelle" }, { v: "annuelle", l: "Annuelle" },
];
const STATUTS: Record<string, { label: string; ton: Ton; Icon: typeof Clock }> = {
  payee:      { label: "Payée",      ton: "positif",   Icon: CheckCircle2 },
  en_attente: { label: "En attente", ton: "attention", Icon: Clock },
  en_retard:  { label: "En retard",  ton: "danger",    Icon: AlertCircle },
};
const VIDE = { categorie: "loyer", description: "", montant: "", frequence: "ponctuelle", statut: "payee", fournisseur: "" };

export default function ChargesPage() {
  const t = useT();
  const { fmt, devise } = useDevise();
  const { donnees, erreur, charge, recharger } = useLecture<Donnees>("/api/pos/charges");
  const [formulaire, setFormulaire] = useState(false);
  const [form, setForm] = useState({ ...VIDE });
  const [erreursChamps, setErreursChamps] = useState<{ description?: string; montant?: string }>({});
  const [envoi, setEnvoi] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState<Charge | null>(null);

  async function creer() {
    const montant = lireMontant(form.montant);
    const erreurs = {
      description: form.description.trim() ? undefined : "Indique ce que représente cette charge (ex. : loyer de janvier).",
      montant: montant > 0 ? undefined : "Indique un montant supérieur à zéro.",
    };
    setErreursChamps(erreurs);
    if (erreurs.description || erreurs.montant) return;
    setEnvoi(true);
    const r = await appelPos("/api/pos/charges", { method: "POST", corps: { ...form, description: form.description.trim(), montant } });
    setEnvoi(false);
    if (!r.ok) { toast.error(t(r.message)); return; }
    toast.success(t("Charge « {0} » enregistrée.", form.description.trim()));
    setForm({ ...VIDE }); setFormulaire(false); void recharger();
  }

  async function marquerPayee(c: Charge) {
    setEnCours(c.id);
    const r = await appelPos(`/api/pos/charges/${c.id}`, { method: "PATCH", corps: { statut: "payee" } });
    setEnCours(null);
    if (!r.ok) toast.error(t(r.message));
    else toast.success(t("Charge « {0} » marquée comme payée.", c.description));
    void recharger();
  }

  async function supprimer(c: Charge) {
    setEnCours(c.id);
    let message: string | null = null;
    try {
      const res = await fetch(`/api/pos/charges/${c.id}`, { method: "DELETE" });
      if (!res.ok) message = (await res.json().catch(() => ({}))).error ?? "Un problème est survenu. Réessayez dans un instant.";
    } catch { message = "Connexion interrompue. Vérifiez le réseau puis réessayez."; }
    setEnCours(null);
    setASupprimer(null);
    if (message) toast.error(t(message));
    else toast.success(t("Charge « {0} » supprimée.", c.description));
    void recharger();
  }

  const champ = (cle: keyof typeof VIDE) => ({
    value: form[cle],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const v = e.target.value; setForm((f) => ({ ...f, [cle]: v })); },
    disabled: envoi,
  });

  const stats = donnees?.stats;
  const charges = donnees?.charges ?? [];

  return (
    <Page>
      <ModuleTutorial moduleKey="pos-charges" titre={t("Charges d'exploitation")} sousTitre={t("Module Point de vente")} steps={CHARGES_TUTORIAL_STEPS} />
      <EnTete titre="Charges d'exploitation" sousTitre="Loyer, salaires, énergie… les coûts de ton magasin. Ils sont déduits dans la Comptabilité pour calculer le bénéfice net.">
        <BoutonRevoirTutoriel moduleKey="pos-charges" />
        {donnees && !formulaire && <Bouton icone={<Plus size={15} aria-hidden />} onClick={() => setFormulaire(true)}>{t("Nouvelle charge")}</Bouton>}
      </EnTete>

      {erreur && !donnees ? <EtatPos code={erreur.code} message={erreur.message} onReessayer={() => void recharger()} />
        : !donnees ? <EtatChargement texte="Chargement des charges…" />
        : (
          <>
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <Chiffre label="Total enregistré" valeur={fmt(stats.total)} aide={t("{0} charge(s)", charges.length)} />
                <Chiffre label="En attente de paiement" valeur={fmt(stats.enAttente)} ton={stats.enAttente > 0 ? "danger" : undefined} />
              </div>
            )}

            {formulaire && (
              <Carte titre="Nouvelle charge">
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void creer(); }} noValidate>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Saisie label="Description" autoFocus maxLength={300} placeholder={t("Ex. : loyer du magasin — janvier")} erreur={erreursChamps.description} {...champ("description")} />
                    <Saisie label="Montant" inputMode="decimal" suffixe={devise} erreur={erreursChamps.montant} {...champ("montant")} />
                    <Champ label="Catégorie">
                      {(a) => <select {...a} className={CLASSE_SAISIE} {...champ("categorie")}>{CATEGORIES.map((c) => <option key={c.v} value={c.v}>{t(c.l)}</option>)}</select>}
                    </Champ>
                    <Champ label="Fréquence">
                      {(a) => <select {...a} className={CLASSE_SAISIE} {...champ("frequence")}>{FREQUENCES.map((f) => <option key={f.v} value={f.v}>{t(f.l)}</option>)}</select>}
                    </Champ>
                    <Champ label="Statut du paiement">
                      {(a) => <select {...a} className={CLASSE_SAISIE} {...champ("statut")}>{Object.entries(STATUTS).map(([v, s]) => <option key={v} value={v}>{t(s.label)}</option>)}</select>}
                    </Champ>
                    <Saisie label="Fournisseur (facultatif)" maxLength={120} {...champ("fournisseur")} />
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Bouton variante="secondaire" onClick={() => { setFormulaire(false); setErreursChamps({}); }} disabled={envoi}>{t("Annuler")}</Bouton>
                    <Bouton type="submit" charge={envoi}>{t("Enregistrer la charge")}</Bouton>
                  </div>
                </form>
              </Carte>
            )}

            {erreur && <EtatPos compact code={erreur.code} message={erreur.message} onReessayer={() => void recharger()} />}

            {charges.length === 0 ? (
              <EtatVide titre="Aucune charge enregistrée" texte="Ajoute ton loyer, tes salaires ou tes factures d'énergie : la Comptabilité pourra alors calculer ton bénéfice net. Les dépenses payées avec l'argent d'une caisse apparaissent aussi ici.">
                {!formulaire && <Bouton icone={<Plus size={15} aria-hidden />} onClick={() => setFormulaire(true)}>{t("Ajouter une charge")}</Bouton>}
              </EtatVide>
            ) : (
              <ul className={`space-y-2 ${charge ? "opacity-60" : ""}`} aria-busy={charge}>
                {charges.map((c) => {
                  const s = STATUTS[c.statut] ?? STATUTS.payee;
                  const deCaisse = !!c.sessionCaisseId;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E8E8E8] bg-white p-3 sm:p-4">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#B45309]" aria-hidden>
                        {deCaisse ? <Wallet size={16} /> : <Receipt size={16} />}
                      </span>
                      <div className="min-w-[10rem] flex-1">
                        <p className="truncate text-[13px] font-semibold text-[#111111]">{c.description}</p>
                        <p className="text-[11.5px] text-[#666666]">
                          {t(CATEGORIES.find((x) => x.v === c.categorie)?.l ?? c.categorie)} · {t(FREQUENCES.find((x) => x.v === c.frequence)?.l ?? c.frequence)} · {new Date(c.dateEnregistrement).toLocaleDateString(t.loc)}
                          {c.fournisseur && ` · ${c.fournisseur}`}
                          {deCaisse && ` · ${t("Sortie de caisse")}`}
                        </p>
                      </div>
                      <p className="flex-shrink-0 text-[14px] font-bold tabular-nums text-[#111111]">{fmt(c.montant)}</p>
                      <Badge ton={s.ton} icone={<s.Icon size={11} aria-hidden />}>{t(s.label)}</Badge>
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        {c.statut !== "payee" && (
                          <Bouton variante="secondaire" taille="compact" onClick={() => void marquerPayee(c)} charge={enCours === c.id} disabled={!!enCours}>{t("Marquer comme payée")}</Bouton>
                        )}
                        {deCaisse
                          ? <span className="sr-only">{t("Dépense sortie d'une caisse : elle se corrige depuis la session de caisse.")}</span>
                          : <BoutonIcone label={t("Supprimer la charge {0}", c.description)} variante="danger" onClick={() => setASupprimer(c)} disabled={!!enCours}><Trash2 size={15} aria-hidden /></BoutonIcone>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {charges.some((c) => c.sessionCaisseId) && (
              <p className="text-[11.5px] leading-relaxed text-[#666666]">{t("Les dépenses « Sortie de caisse » font partie du comptage d'une session : elles ne se suppriment pas ici, elles se corrigent par un mouvement de caisse « Correction ».")}</p>
            )}
          </>
        )}

      <Modale ouverte={!!aSupprimer} onFermer={() => setASupprimer(null)} taille="sm" verrouillee={!!enCours}
        titre={t("Supprimer la charge « {0} » ?", aSupprimer?.description ?? "")}
        description="Elle disparaîtra de la liste et ne sera plus déduite dans la Comptabilité. La suppression est tracée dans le journal d'audit."
        actions={<>
          <Bouton variante="secondaire" onClick={() => setASupprimer(null)} disabled={!!enCours}>{t("Garder la charge")}</Bouton>
          <Bouton variante="danger" onClick={() => aSupprimer && void supprimer(aSupprimer)} charge={!!enCours}>{t("Supprimer la charge")}</Bouton>
        </>}>
        {aSupprimer && <p className="text-[13px] text-[#555555]">{fmt(aSupprimer.montant)} · {new Date(aSupprimer.dateEnregistrement).toLocaleDateString(t.loc)}</p>}
      </Modale>
    </Page>
  );
}
