"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Truck, Plus, Trash2, Package, CheckCircle, Clock, MapPin, Bus, LayoutGrid, TableProperties } from "lucide-react";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { FulfillmentKanban } from "@/components/dashboard/logistique/FulfillmentKanban";
import { useT } from "@/components/I18nProvider";
import { PAYS_OPTIONS, GROUPES_PAYS } from "@/lib/devise-convert";
import { lireReglagesLivraison, trouverZone } from "@/lib/livraison-reglages";
import { formatMontant, cn } from "@/lib/utils";
import {
  Badge, BoutonIcone, Bouton, Champ, CLASSE_SAISIE, EtatErreur, EtatVide, Saisie, SqueletteListe, useConfirmation, type Ton,
} from "@/components/ui";

interface ReglePort {
  id: string;
  nom: string;
  pays: string[];
  zone: string;
  poidsMin: number;
  poidsMax: number | null;
  montantMin: number | null;
  frais: number;
  fraisKg: number;
  delai: string;
  transporteur: string | null;
  gratuit: boolean;
  actif: boolean;
  modeLivraison: string;
}

const MODES_LIVRAISON = [
  { id: "livreur_local", label: "Livreur local (moto)" },
  { id: "agence_voyage", label: "Agence de voyage" },
  { id: "transporteur_intl", label: "Transporteur international" },
];

const AGENCES_SUGGEST = ["GEV", "Touristique Express", "Buca Voyages", "Vatican Express", "Finex Voyages"];

interface Commande {
  id: string;
  numero: string;
  clientNom: string;
  montantTotal: number;
  devise: string;
  statut: string;
  livraisonStatut: string;
  transporteur: string | null;
  numeroSuivi: string | null;
  createdAt: string;
}

// Mêmes libellés que la page Commandes.
const STATUTS_LIVRAISON: Record<string, { label: string; ton: Ton }> = {
  non_expediee: { label: "Non expédiée", ton: "neutre" },
  en_preparation: { label: "En préparation", ton: "attention" },
  expediee: { label: "En livraison", ton: "info" },
  tentative_echouee: { label: "Échec livraison", ton: "erreur" },
  livree: { label: "Livrée", ton: "succes" },
  retour: { label: "Retour", ton: "erreur" },
};

const NOM_PAYS = Object.fromEntries(PAYS_OPTIONS.map((p) => [p.code, p.nom]));

const FORM_VIDE = {
  nom: "", pays: [] as string[], zone: "", poidsMin: 0, poidsMax: "", montantMin: "",
  frais: 0, fraisKg: 0, delai: "3-5 jours", transporteur: "", gratuit: false,
  modeLivraison: "livreur_local",
};

export function LivraisonPanel() {
  const tx = useT();
  const { confirmer, dialogue } = useConfirmation();
  const [tab, setTab] = useState<"commandes" | "regles">("commandes");
  const [vue, setVue] = useState<"kanban" | "table">("kanban");
  const [regles, setRegles] = useState<ReglePort[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [echecChargement, setEchecChargement] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erreurNom, setErreurNom] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [zonesConfigurees, setZonesConfigurees] = useState<string[]>([]);
  const [paysBoutique, setPaysBoutique] = useState("");

  function charger() {
    setLoading(true);
    setEchecChargement(false);
    const lire = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(); return r.json(); });
    Promise.all([lire("/api/livraison/regles"), lire("/api/commandes"), lire("/api/tenants/moi")])
      .then(([{ regles }, data, tenantData]) => {
        setRegles(regles ?? []);
        setCommandes(data?.commandes ?? []);
        setZonesConfigurees(lireReglagesLivraison(tenantData?.tenant?.parametresLivraison).zones.map((z) => z.nom));
        const paysT = tenantData?.tenant?.pays ?? "";
        setPaysBoutique(paysT);
        if (paysT) setForm((f) => ({ ...f, pays: [paysT] }));
      })
      .catch(() => setEchecChargement(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { charger(); }, []);

  const ajouterPays = (codes: string[]) => setForm((f) => ({ ...f, pays: [...new Set([...f.pays, ...codes])] }));
  const resumePays = (codes: string[]) => !codes.length ? tx("Tous les pays")
    : codes.length > 3 ? `${codes.slice(0, 3).map((c) => tx(NOM_PAYS[c] ?? c)).join(", ")} +${codes.length - 3}`
    : codes.map((c) => tx(NOM_PAYS[c] ?? c)).join(", ");

  async function saveRegle() {
    if (!form.nom.trim()) { setErreurNom(tx("Donne un nom à la règle, par exemple « Standard Douala »."));  return; }
    setErreurNom(null);
    setSaving(true);
    try {
      const res = await fetch("/api/livraison/regles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          poidsMax: form.poidsMax ? Number(form.poidsMax) : null,
          montantMin: form.montantMin ? Number(form.montantMin) : null,
          frais: Number(form.frais),
          fraisKg: Number(form.fraisKg),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.regle) throw new Error(data.error);
      setRegles((prev) => [data.regle, ...prev]);
      setForm({ ...FORM_VIDE, pays: paysBoutique ? [paysBoutique] : [] });
      setShowForm(false);
      toast.success(tx("Règle « {0} » ajoutée : elle s'applique aux prochaines commandes.", data.regle.nom));
    } catch (e: any) {
      toast.error(e?.message ? tx(e.message) : tx("La règle n'a pas pu être enregistrée. Vérifie ta connexion puis réessaie."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRegle(r: ReglePort) {
    const ok = await confirmer({
      titre: tx("Supprimer cette règle de livraison ?"),
      objet: r.nom,
      description: tx("Les clients concernés ne verront plus ce tarif. Les commandes déjà passées gardent leurs frais."),
      libelleConfirmer: tx("Supprimer la règle"),
    });
    if (!ok) return;
    const res = await fetch(`/api/livraison/regles?id=${r.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toast.error(tx("La règle n'a pas pu être supprimée. Réessaie.")); return; }
    setRegles((prev) => prev.filter((x) => x.id !== r.id));
    toast.success(tx("Règle « {0} » supprimée.", r.nom));
  }

  async function toggleRegle(regle: ReglePort) {
    const res = await fetch("/api/livraison/regles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: regle.id, actif: !regle.actif }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (data?.regle) {
      setRegles((prev) => prev.map((r) => r.id === regle.id ? data.regle : r));
      toast.success(data.regle.actif ? tx("Règle « {0} » activée.", regle.nom) : tx("Règle « {0} » désactivée : elle n'est plus proposée.", regle.nom));
    } else toast.error(tx("Le changement n'a pas pu être enregistré. Réessaie."));
  }

  const stats = {
    enPrep: commandes.filter((c) => c.livraisonStatut === "en_preparation").length,
    expediees: commandes.filter((c) => c.livraisonStatut === "expediee").length,
    livrees: commandes.filter((c) => c.livraisonStatut === "livree").length,
    nonExpediees: commandes.filter((c) => c.livraisonStatut === "non_expediee").length,
  };

  if (loading) return <SqueletteListe lignes={4} libelle={tx("Chargement des livraisons…")} />;
  if (echecChargement) return (
    <EtatErreur titre={tx("Les livraisons n'ont pas pu être chargées")} texte={tx("Vérifie ta connexion puis réessaie.")} onReessayer={charger} />
  );

  const ongletClasse = (actif: boolean) => cn(
    "flex min-h-10 items-center gap-1.5 rounded-controle px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-focus",
    actif ? "bg-carte text-encre shadow-carte" : "text-doux hover:text-encre",
  );

  return (
    <div className="space-y-5">
      {dialogue}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AgentActiveIndicator label={tx("Agent Livraison actif")} />
        {tab === "regles" && !showForm && (
          <Bouton icone={<Plus className="size-4" aria-hidden />} onClick={() => setShowForm(true)} className="ml-auto">{tx("Ajouter une règle")}</Bouton>
        )}
      </div>

      {/* Compteurs (statut de livraison des commandes chargées) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Non expédiées", value: stats.nonExpediees, icon: Clock },
          { label: "En préparation", value: stats.enPrep, icon: Package },
          { label: "En livraison", value: stats.expediees, icon: Truck },
          { label: "Livrées", value: stats.livrees, icon: CheckCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-carte border border-bordure bg-carte p-4">
            <p className="flex items-center gap-2 ax-aide"><Icon className="size-4" aria-hidden />{tx(label)}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-encre">{value}</p>
          </div>
        ))}
      </div>

      {/* Sous-onglets */}
      <div role="tablist" aria-label={tx("Livraison")} className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-controle bg-carte-2 border border-bordure p-1">
        {(["commandes", "regles"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={ongletClasse(tab === t)}>
            {t === "commandes" ? tx("Commandes à livrer") : tx("Tarifs de livraison")}
          </button>
        ))}
      </div>

      {/* Tarifs de livraison */}
      {tab === "regles" && (
        <div className="space-y-4">
          <p className="ax-texte-secondaire">{tx("Chaque règle fixe le prix de livraison payé par le client selon le pays, le quartier et le montant de la commande.")}</p>
          {showForm && (
            <form className="rounded-carte border border-bordure bg-carte p-carte space-y-champs" onSubmit={(e) => { e.preventDefault(); saveRegle(); }} noValidate>
              <h3 className="ax-sous-titre">{tx("Nouvelle règle de livraison")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Saisie label={tx("Nom de la règle")} mention="obligatoire" placeholder={tx("ex: Standard Cameroun")} value={form.nom}
                  erreur={erreurNom} onChange={(e) => { setErreurNom(null); setForm((f) => ({ ...f, nom: e.target.value })); }} />
                <Champ label={tx("Mode de livraison")}>
                  {(a) => (
                    <select {...a} className={CLASSE_SAISIE} value={form.modeLivraison} onChange={(e) => setForm((f) => ({ ...f, modeLivraison: e.target.value }))}>
                      {MODES_LIVRAISON.map((m) => <option key={m.id} value={m.id}>{tx(m.label)}</option>)}
                    </select>
                  )}
                </Champ>
                <Champ className="sm:col-span-2" label={tx("Pays desservis")} aide={tx("Aucun pays choisi = la règle vaut pour tous les pays.")}>
                  {(a) => (
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 rounded-controle border border-bordure bg-carte p-1.5 min-h-10">
                        {form.pays.length === 0 && <span className="px-1.5 text-sm text-doux">{tx("Tous les pays")}</span>}
                        {form.pays.map((c) => (
                          <span key={c} className="inline-flex items-center gap-1 rounded-full bg-primaire-fond py-0.5 pl-2.5 pr-0.5 text-sm text-encre">
                            {tx(NOM_PAYS[c] ?? c)}
                            <button type="button" aria-label={tx("Retirer {0}", tx(NOM_PAYS[c] ?? c))} onClick={() => setForm((f) => ({ ...f, pays: f.pays.filter((x) => x !== c) }))}
                              className="flex size-7 items-center justify-center rounded-full text-doux hover:bg-carte-2 hover:text-encre">×</button>
                          </span>
                        ))}
                        <select {...a} value="" onChange={(e) => e.target.value && ajouterPays([e.target.value])}
                          className="min-h-8 min-w-[140px] flex-1 bg-transparent text-sm text-doux outline-none">
                          <option value="">{tx("+ Ajouter un pays…")}</option>
                          {PAYS_OPTIONS.filter((p) => !form.pays.includes(p.code)).map((p) => <option key={p.code} value={p.code}>{tx(p.nom)}</option>)}
                        </select>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(GROUPES_PAYS).map(([nom, codes]) => (
                          <Bouton key={nom} variante="secondaire" taille="compact" onClick={() => ajouterPays(codes)}>+ {nom}</Bouton>
                        ))}
                        <Bouton variante="secondaire" taille="compact" onClick={() => setForm((f) => ({ ...f, pays: [] }))}>{tx("Tous les pays")}</Bouton>
                      </div>
                    </div>
                  )}
                </Champ>
                <div>
                  <Saisie label={tx("Quartier / ville")} mention="facultatif" list="zones-list" placeholder={tx("Vide = tout le pays")} value={form.zone}
                    aide={tx("Un tarif de quartier remplace le tarif du pays pour ce quartier. Les quartiers proposés aux clients se règlent dans Ma boutique → Livraison.")}
                    onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} />
                  <datalist id="zones-list">{zonesConfigurees.map((z) => <option key={z} value={z} />)}</datalist>
                </div>
                <div>
                  <Saisie label={form.modeLivraison === "agence_voyage" ? tx("Agence de voyage") : tx("Transporteur")} mention="facultatif"
                    list={form.modeLivraison === "agence_voyage" ? "agences-list" : undefined}
                    placeholder={form.modeLivraison === "agence_voyage" ? tx("GEV, Touristique Express...") : tx("Campost, DHL, MTN...")}
                    value={form.transporteur} onChange={(e) => setForm((f) => ({ ...f, transporteur: e.target.value }))} />
                  {form.modeLivraison === "agence_voyage" && (
                    <datalist id="agences-list">{AGENCES_SUGGEST.map((a) => <option key={a} value={a} />)}</datalist>
                  )}
                </div>
                <Saisie type="number" inputMode="decimal" min={0} label={tx("Frais de livraison")} aide={tx("Dans la devise de ta boutique.")} value={form.frais}
                  onChange={(e) => setForm((f) => ({ ...f, frais: Number(e.target.value) }))} />
                <Saisie type="number" inputMode="decimal" min={0} label={tx("Supplément par kg")} aide={tx("Ajouté pour chaque kilo du colis. 0 = pas de supplément.")} value={form.fraisKg}
                  onChange={(e) => setForm((f) => ({ ...f, fraisKg: Number(e.target.value) }))} />
                <Saisie label={tx("Délai estimé")} aide={tx("Affiché au client, par exemple « 24 h » ou « 3-5 jours ».")} value={form.delai}
                  onChange={(e) => setForm((f) => ({ ...f, delai: e.target.value }))} />
                <Saisie type="number" inputMode="decimal" min={0} label={tx("Montant minimum de commande")} mention="facultatif"
                  aide={tx("La règle ne s'applique qu'à partir de ce montant.")} placeholder="0" value={form.montantMin}
                  onChange={(e) => setForm((f) => ({ ...f, montantMin: e.target.value }))} />
                <label className="flex min-h-10 items-center gap-2 sm:col-span-2 ax-texte">
                  <input type="checkbox" className="size-5 accent-[var(--ax-primaire)]" checked={form.gratuit} onChange={(e) => setForm((f) => ({ ...f, gratuit: e.target.checked }))} />
                  {tx("Livraison gratuite (ignorer les frais)")}
                </label>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Bouton variante="secondaire" onClick={() => { setShowForm(false); setErreurNom(null); }}>{tx("Annuler")}</Bouton>
                <Bouton type="submit" charge={saving} texteCharge={tx("Enregistrement…")}>{tx("Enregistrer la règle")}</Bouton>
              </div>
            </form>
          )}

          {regles.length === 0 ? (
            !showForm && (
              <EtatVide icone={<MapPin />} titre={tx("Aucun tarif de livraison")}
                texte={tx("Sans règle, tes clients ne voient pas de frais de livraison au paiement. Crée ta première règle tarifaire.")}>
                <Bouton icone={<Plus className="size-4" aria-hidden />} onClick={() => setShowForm(true)}>{tx("Ajouter une règle")}</Bouton>
              </EtatVide>
            )
          ) : (
            <ul className="space-y-2">
              {regles.map((r) => (
                <li key={r.id} className={cn("rounded-carte border border-bordure bg-carte p-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3", !r.actif && "bg-carte-2")}>
                  <div className="flex min-w-[10rem] flex-1 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-controle bg-primaire-fond text-attention" aria-hidden>
                      <MapPin className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-encre">{tx(r.nom)}</p>
                        {r.modeLivraison === "agence_voyage" && <Badge ton="info" icone={<Bus aria-hidden />}>{tx("Agence")}</Badge>}
                        {!r.actif && <Badge>{tx("Désactivée")}</Badge>}
                      </div>
                      <p className="ax-aide">{resumePays(r.pays)}{r.zone ? ` · ${r.zone}` : ""} · {tx(r.delai)} {r.transporteur ? `· ${r.transporteur}` : ""}</p>
                      {/* Dans le pays de la boutique, le client choisit sa zone dans la liste : un quartier absent n'est jamais choisi. */}
                      {r.zone.trim() && zonesConfigurees.length > 0 && (!r.pays.length || r.pays.includes(paysBoutique)) && !trouverZone(zonesConfigurees.map((nom) => ({ nom, frais: null, delai: "" })), r.zone) && (
                        <p className="mt-0.5 text-xs font-medium text-attention">{tx("« {0} » n'est pas dans vos zones (Ma boutique → Livraison) : vos clients ne peuvent pas la choisir.", r.zone)}</p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-encre">
                      {r.gratuit ? tx("Gratuit") : `${r.frais.toLocaleString()} + ${r.fraisKg}/kg`}
                    </p>
                    {r.montantMin ? <p className="ax-aide">{tx("dès")}{" "}{r.montantMin.toLocaleString()}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <label className="flex min-h-10 cursor-pointer items-center gap-2 px-1 text-xs font-medium text-doux">
                      <button type="button" role="switch" aria-checked={r.actif} onClick={() => toggleRegle(r)}
                        aria-label={tx(r.actif ? "Désactiver la règle {0}" : "Activer la règle {0}", r.nom)}
                        className={cn("relative h-6 w-10 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-focus", r.actif ? "bg-succes" : "bg-bordure-forte")}>
                        <span className={cn("absolute top-0.5 size-5 rounded-full bg-carte shadow transition-all", r.actif ? "left-[18px]" : "left-0.5")} />
                      </button>
                      <span aria-hidden>{r.actif ? tx("Active") : tx("Désactivée")}</span>
                    </label>
                    <BoutonIcone label={tx("Supprimer la règle {0}", r.nom)} onClick={() => deleteRegle(r)} className="text-erreur">
                      <Trash2 className="size-4" aria-hidden />
                    </BoutonIcone>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Commandes */}
      {tab === "commandes" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <div role="group" aria-label={tx("Affichage")} className="flex gap-1 rounded-controle bg-carte-2 border border-bordure p-1">
              <button type="button" aria-pressed={vue === "kanban"} onClick={() => setVue("kanban")} className={ongletClasse(vue === "kanban")}>
                <LayoutGrid className="size-4" aria-hidden />{tx("Colonnes")}
              </button>
              <button type="button" aria-pressed={vue === "table"} onClick={() => setVue("table")} className={ongletClasse(vue === "table")}>
                <TableProperties className="size-4" aria-hidden />{tx("Tableau")}
              </button>
            </div>
          </div>

          {vue === "kanban" && <FulfillmentKanban />}

          {vue === "table" && (commandes.length === 0 ? (
            <EtatVide icone={<Truck />} titre={tx("Aucune commande à expédier pour l'instant.")}
              texte={tx("Les commandes de ta boutique apparaîtront ici dès qu'un client commande.")} />
          ) : (
            <div className="overflow-hidden rounded-carte border border-bordure bg-carte">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-carte-2">
                    <tr className="border-b border-bordure text-left text-xs font-semibold text-doux">
                      <th scope="col" className="px-4 py-3">{tx("Commande")}</th>
                      <th scope="col" className="px-4 py-3">{tx("Client")}</th>
                      <th scope="col" className="px-4 py-3 text-right">{tx("Montant")}</th>
                      <th scope="col" className="px-4 py-3">{tx("Livraison")}</th>
                      <th scope="col" className="px-4 py-3">{tx("N° de suivi")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commandes.map((c) => {
                      const s = STATUTS_LIVRAISON[c.livraisonStatut];
                      return (
                        <tr key={c.id} className="border-b border-bordure last:border-0">
                          <td className="px-4 py-3 font-mono text-encre">{c.numero}</td>
                          <td className="px-4 py-3 text-encre">{tx(c.clientNom)}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-encre">{formatMontant(c.montantTotal, c.devise)}</td>
                          <td className="px-4 py-3"><Badge ton={s?.ton ?? "neutre"}>{s ? tx(s.label) : c.livraisonStatut.replace(/_/g, " ")}</Badge></td>
                          <td className="px-4 py-3 text-doux">{c.numeroSuivi || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
