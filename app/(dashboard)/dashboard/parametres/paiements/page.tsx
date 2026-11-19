"use client";
// Paramètres › Paiements (§9.2-5, D3) : seuls les moyens réellement disponibles sont activables ;
// Mobile Money, Wave et cartes sont annoncés « Bientôt disponible », sans bouton d'activation.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { lireReglagesPaiement, type ReglagesPaiement } from "@/lib/paiement-pays";
import { EtatErreur } from "@/components/ui";
import { Badge, Banner, ContextualSaveBar, ResourceList, SettingsRow, SkeletonPage, Toggle } from "@/components/ui/adm";
import { SectionParametres, SousSection, modifie } from "../ui";

const ACTIFS = [
  ["livraison", "Paiement à la livraison", "Le client paie le livreur en espèces ou par Mobile Money à la réception."],
  ["whatsapp", "Commande via WhatsApp", "La commande arrive sur votre WhatsApp, payée à la livraison."],
  ["livraisonHorsPays", "Paiement à la livraison hors de votre pays", "Désactivé : un client d'un autre pays ne peut pas commander. Évite les colis envoyés loin puis refusés."],
] as const;
const BIENTOT = ["MTN Mobile Money", "Orange Money", "Wave", "Cartes bancaires"];

export default function PaiementsPage() {
  const t = useT();
  const [brut, setBrut] = useState<Record<string, unknown>>({});
  const [paiement, setPaiement] = useState<ReglagesPaiement>(lireReglagesPaiement({}));
  const [enregistre, setEnregistre] = useState<ReglagesPaiement | null>(null);
  const [saving, setSaving] = useState(false);
  const [etat, setEtat] = useState<"chargement" | "pret" | "erreur">("chargement");

  const charger = () => {
    setEtat("chargement");
    fetch("/api/tenants/moi-complet").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
      const p = lireReglagesPaiement(data?.parametresPaiement);
      setBrut(data?.parametresPaiement || {}); setPaiement(p); setEnregistre(p); setEtat("pret");
    }).catch(() => setEtat("erreur"));
  };
  useEffect(charger, []);

  async function sauvegarder() {
    if (!paiement.livraison && !paiement.whatsapp) { toast.error(t("Gardez au moins un moyen de paiement activé avant d'enregistrer.")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parametresPaiement: { ...brut, ...paiement } }),
      });
      if (!res.ok) throw new Error();
      setBrut(b => ({ ...b, ...paiement })); setEnregistre(paiement);
      toast.success(t("Moyens de paiement mis à jour !"));
    } catch { toast.error(t("Les moyens de paiement n'ont pas pu être enregistrés. Vérifiez votre connexion et réessayez.")); }
    finally { setSaving(false); }
  }

  return (
    <SectionParametres titre={t("Paiements")} description={t("Ce que vos clients peuvent choisir pour vos produits physiques.")}>
      <ContextualSaveBar dirty={modifie(paiement, enregistre)} saving={saving} onSave={sauvegarder} onDiscard={() => enregistre && setPaiement(enregistre)} />
      {etat === "chargement" && <SkeletonPage label={t("Chargement…")} />}
      {etat === "erreur" && <EtatErreur titre={t("Vos réglages n'ont pas pu être chargés.")} texte={t("Vérifiez votre connexion puis réessayez.")} onReessayer={charger} />}
      {etat === "pret" && <>
        <SousSection titre={t("Moyens de paiement")}>
          <ResourceList>
            {ACTIFS.map(([cle, titre, aide]) => (
              <SettingsRow key={cle} icon={cle === "whatsapp" ? "whatsapp" : "money"} title={t(titre)} subtitle={t(aide)}
                end={<Toggle label={t(titre)} checked={paiement[cle]} disabled={cle === "livraisonHorsPays" && !paiement.livraison && !paiement.whatsapp}
                  onChange={v => setPaiement(p => ({ ...p, [cle]: v }))} />} />
            ))}
          </ResourceList>
        </SousSection>
        <SousSection titre={t("Paiement en ligne")}>
          <Banner tone="info">{t("Le paiement en ligne arrive bientôt. En attendant, vos clients paient à la livraison ou via WhatsApp.")}</Banner>
          <ResourceList>
            {BIENTOT.map(nom => (
              <SettingsRow key={nom} icon="card" title={nom} end={<Badge tone="neutral">{t("Bientôt disponible")}</Badge>} />
            ))}
          </ResourceList>
        </SousSection>
      </>}
    </SectionParametres>
  );
}
