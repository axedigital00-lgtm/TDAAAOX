"use client";
import { useEffect, useState } from "react";
import { Truck, ToggleRight, KeyRound, Settings } from "lucide-react";
import { toast } from "sonner";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
import { Badge, Bouton, EnTetePage, EtatErreur, Saisie, SqueletteListe } from "@/components/ui";
import { cn, formatMontant } from "@/lib/utils";

const TRANSPORTEURS_TUTORIAL_STEPS = [
  { Icon: Truck,        titre: "Tes partenaires de livraison", description: "Chaque transporteur est listé avec ses zones de couverture et son logo." },
  { Icon: ToggleRight,  titre: "Active un transporteur",       description: "Bascule l'interrupteur pour le rendre disponible lors de la création d'une livraison." },
  { Icon: KeyRound,     titre: "Configure la clé API",         description: "Ajoute la clé API du transporteur pour synchroniser le suivi des colis automatiquement." },
  { Icon: Settings,     titre: "Fixe un tarif",                description: "Renseigne un tarif fixe optionnel pour standardiser le coût de livraison de ce partenaire." },
];

// Codes de zone renvoyés par /api/transporteurs, dits en clair.
const ZONES: Record<string, string> = {
  international: "International", europe: "Europe", fr: "France", cm: "Cameroun",
  ci: "Côte d'Ivoire", sn: "Sénégal", ng: "Nigeria", gh: "Ghana",
};

type Transporteur = {
  code: string; nom: string; zones: string[]; logo: string;
  actif: boolean; apiKey: string; tarif: number | null;
};

export default function TransporteursPage() {
  const tr = useT();
  const { devise } = useDevise();
  const [liste, setListe] = useState<Transporteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [echec, setEchec] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [tarif, setTarif] = useState("");
  const [saving, setSaving] = useState(false);

  async function charger() {
    try {
      const r = await fetch("/api/transporteurs");
      if (!r.ok) throw new Error();
      setListe((await r.json()).transporteurs ?? []);
      setEchec(false);
    } catch {
      setEchec(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { charger(); }, []);

  async function patch(body: unknown) {
    const r = await fetch("/api/transporteurs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (r?.ok) return true;
    const d = await r?.json().catch(() => ({}));
    toast.error(d?.error ?? d?.message ? tr(d.error ?? d.message) : tr("Le changement n'a pas pu être enregistré. Vérifie ta connexion puis réessaie."));
    return false;
  }

  async function toggle(x: Transporteur) {
    setSaving(true);
    if (await patch({ code: x.code, actif: !x.actif })) {
      setListe(l => l.map(t => t.code === x.code ? { ...t, actif: !x.actif } : t));
      toast.success(x.actif ? tr("{0} désactivé.", x.nom) : tr("{0} activé.", x.nom));
    }
    setSaving(false);
  }

  async function saveConfig(x: Transporteur) {
    setSaving(true);
    // Clé vide = on garde la clé déjà enregistrée (l'API n'y touche que si elle est envoyée).
    if (await patch({ code: x.code, ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}), tarif: tarif ? parseFloat(tarif) : null })) {
      toast.success(tr("Réglages de {0} enregistrés.", x.nom));
      setEditing(null); setApiKey(""); setTarif("");
      await charger();
    }
    setSaving(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <ModuleTutorial moduleKey="transporteurs" titre={tr("Transporteurs")} sousTitre={tr("Partenaires de livraison")} steps={TRANSPORTEURS_TUTORIAL_STEPS} />
      <EnTetePage
        retour={{ href: "/dashboard/logistique", libelle: tr("Logistique") }}
        titre={tr("Transporteurs")}
        description={tr("Activez et configurez vos partenaires de livraison")}
        indicateurs={<BoutonRevoirTutoriel moduleKey="transporteurs" />}
        className="mb-0"
      />

      {loading ? (
        <SqueletteListe lignes={5} libelle={tr("Chargement des transporteurs…")} />
      ) : echec ? (
        <EtatErreur titre={tr("Les transporteurs n'ont pas pu être chargés")} texte={tr("Vérifie ta connexion puis réessaie.")} onReessayer={charger} />
      ) : (
        <ul className="space-y-3">
          {liste.map(t => (
            <li key={t.code} className="rounded-carte border border-bordure bg-carte p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl" aria-hidden>{t.logo}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-encre">{t.nom}</span>
                    <Badge ton={t.actif ? "succes" : "neutre"}>{t.actif ? tr("Activé") : tr("Désactivé")}</Badge>
                    {t.apiKey && <Badge ton="info" icone={<KeyRound aria-hidden />}>{tr("Clé API enregistrée")}</Badge>}
                  </div>
                  <p className="mt-0.5 ax-aide">
                    {t.zones.map(z => tr(ZONES[z] ?? z)).join(", ")}
                    {t.tarif ? ` · ${tr("Tarif fixe :")} ${formatMontant(t.tarif, devise)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {editing !== t.code && (
                    <Bouton taille="compact" variante="secondaire" icone={<Settings className="size-4" aria-hidden />}
                      onClick={() => { setEditing(t.code); setApiKey(""); setTarif(t.tarif?.toString() ?? ""); }}>
                      {tr("Configurer")}
                    </Bouton>
                  )}
                  <button type="button" role="switch" aria-checked={t.actif} disabled={saving} onClick={() => toggle(t)}
                    aria-label={tr(t.actif ? "Désactiver {0}" : "Activer {0}", t.nom)}
                    className="flex min-h-10 items-center px-1 disabled:opacity-50">
                    <span className={cn("relative inline-flex h-6 w-10 rounded-full transition-colors", t.actif ? "bg-succes" : "bg-bordure-forte")}>
                      <span className={cn("m-0.5 inline-block size-5 rounded-full bg-carte shadow transition-transform", t.actif && "translate-x-4")} />
                    </span>
                  </button>
                </div>
              </div>

              {editing === t.code && (
                <form className="mt-3 space-y-champs border-t border-bordure pt-3" onSubmit={(e) => { e.preventDefault(); saveConfig(t); }}>
                  <Saisie label={tr("Clé API")} type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)}
                    aide={t.apiKey ? tr("Une clé est déjà enregistrée. Laisse vide pour la garder.") : tr("Fournie par le transporteur, pour suivre les colis automatiquement.")} />
                  <Saisie label={tr("Tarif fixe")} mention="facultatif" type="number" inputMode="decimal" min={0} suffixe={devise}
                    value={tarif} onChange={e => setTarif(e.target.value)} />
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Bouton variante="secondaire" onClick={() => setEditing(null)}>{tr("Annuler")}</Bouton>
                    <Bouton type="submit" charge={saving} texteCharge={tr("Enregistrement…")}>{tr("Enregistrer les réglages")}</Bouton>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
