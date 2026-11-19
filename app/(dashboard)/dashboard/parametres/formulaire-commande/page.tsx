"use client";
// Paramètres › Formulaire de commande (§9.2-6, D25) : informations demandées à l'acheteur
// qui choisit « Commander maintenant » (sans passer par WhatsApp).
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { EtatErreur } from "@/components/ui";
import { Card, ContextualSaveBar, ResourceList, SettingsRow, SkeletonPage, TextField, Toggle } from "@/components/ui/adm";
import { SectionParametres, SousSection, modifie } from "../ui";

type Form = { demanderEmail: boolean; demanderGps: boolean; champActif: boolean; champLabel: string };
const CASES = [
  ["demanderEmail", "Demander l'adresse email"],
  ["demanderGps", "Proposer le partage de la position GPS"],
  ["champActif", "Ajouter un champ personnalisé"],
] as const;

export default function FormulaireCommandePage() {
  const t = useT();
  const [form, setForm] = useState<Form>({ demanderEmail: true, demanderGps: true, champActif: false, champLabel: "" });
  const [enregistre, setEnregistre] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [etat, setEtat] = useState<"chargement" | "pret" | "erreur">("chargement");

  const charger = () => {
    setEtat("chargement");
    fetch("/api/tenants/moi-complet").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
      const pc = data?.parametresCommande || {};
      const f = { demanderEmail: pc.demanderEmail ?? true, demanderGps: pc.demanderGps ?? true, champActif: pc.champPersonnalise?.actif ?? false, champLabel: pc.champPersonnalise?.label ?? "" };
      setForm(f); setEnregistre(f); setEtat("pret");
    }).catch(() => setEtat("erreur"));
  };
  useEffect(charger, []);

  async function sauvegarder() {
    setSaving(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parametresCommande: { demanderEmail: form.demanderEmail, demanderGps: form.demanderGps, champPersonnalise: { actif: form.champActif, label: form.champLabel } } }),
      });
      if (!res.ok) throw new Error();
      setEnregistre(form);
      toast.success(t("Formulaire de commande mis à jour !"));
    } catch { toast.error(t("Le formulaire de commande n'a pas pu être enregistré. Vérifiez votre connexion et réessayez.")); }
    finally { setSaving(false); }
  }

  return (
    <SectionParametres titre={t("Formulaire de commande")} description={t("Personnalisez les informations demandées à l'acheteur qui choisit \"Commander maintenant\" (sans passer par WhatsApp).")}>
      <ContextualSaveBar dirty={modifie(form, enregistre)} saving={saving} onSave={sauvegarder} onDiscard={() => enregistre && setForm(enregistre)} />
      {etat === "chargement" && <SkeletonPage label={t("Chargement…")} />}
      {etat === "erreur" && <EtatErreur titre={t("Vos réglages n'ont pas pu être chargés.")} texte={t("Vérifiez votre connexion puis réessayez.")} onReessayer={charger} />}
      {etat === "pret" && (
        <SousSection titre={t("Champs du formulaire")}>
          <ResourceList>
            {CASES.map(([cle, titre]) => (
              <SettingsRow key={cle} title={t(titre)} end={<Toggle label={t(titre)} checked={form[cle]} onChange={v => setForm(f => ({ ...f, [cle]: v }))} />} />
            ))}
          </ResourceList>
          {form.champActif && (
            <Card>
              <TextField label={t("Libellé du champ")} value={form.champLabel} onChange={e => setForm(f => ({ ...f, champLabel: e.target.value }))}
                placeholder={t("Ex : Précisions sur la commande, Code postal…")} />
            </Card>
          )}
        </SousSection>
      )}
    </SectionParametres>
  );
}
