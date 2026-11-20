"use client";
import { exempleTelephone } from "@/lib/devise-convert";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Truck, Plus, MapPin, Globe } from "lucide-react";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { Modal } from "@/components/dashboard/design-system/components/Modal";
import { Banner, Card, Field } from "@/components/dashboard/design-system/components/primitives";
import { LiveFleetMap } from "@/components/dashboard/logistique/LiveFleetMap";
import { RemunerationLivreur } from "@/components/dashboard/logistique/RemunerationLivreur";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { lireReglagesLivraison, normaliserZone } from "@/lib/livraison-reglages";

const LIVREURS_TUTORIAL_STEPS = [
  { Icon: Plus,   titre: "Crée un compte livreur",         description: "Ajoute un livreur à ton équipe avec nom, téléphone, véhicule et zone de couverture." },
  { Icon: Globe,  titre: "Livreurs de la plateforme",       description: "Bascule sur l'onglet Plateforme pour voir les livreurs indépendants disponibles à assigner." },
  { Icon: MapPin, titre: "Suis la flotte en direct",        description: "La carte en haut de page affiche la position en temps réel de tes livreurs actifs." },
  { Icon: Truck,  titre: "Disponibilité en un coup d'œil",  description: "Le point vert indique qu'un livreur est disponible pour prendre une nouvelle livraison." },
];

type Livreur = {
  id: string;
  nom: string;
  telephone: string;
  vehicule: string;
  zone: string | null;
  disponible: boolean;
  actif: boolean;
  user: { email: string };
  tenant: { nomBoutique: string } | null;
  _count: { commandes: number };
};

const VEHICULES: Record<string, string> = { moto: "Moto", voiture: "Voiture", velo: "Vélo", a_pied: "À pied" };

export function LivreursPanel() {
  const t = useT();
  const [mesPlateforme, setMesPlateforme] = useState<Livreur[]>([]);
  const [plateforme, setPlateforme] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [onglet, setOnglet] = useState<"miens" | "plateforme">("miens");
  const [form, setForm] = useState({
    nom: "", email: "", telephone: "", password: "", vehicule: "moto", zone: "",
  });
  const [pays, setPays] = useState("");
  const [zonesBoutique, setZonesBoutique] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/tenants/moi").then(r => r.json()).then(d => {
      setPays(d?.tenant?.pays ?? "");
      setZonesBoutique(lireReglagesLivraison(d?.tenant?.parametresLivraison).zones.map(z => z.nom));
    }).catch(() => {});
  }, []);

  // Une erreur (droits, réseau) est dite : sinon elle passait pour « aucun livreur », ou le chargement ne finissait jamais.
  async function charger() {
    setLoading(true);
    const lire = (url: string) => fetch(url).then(async r => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Impossible de charger les livreurs");
      return (d.livreurs || []) as Livreur[];
    });
    try {
      const [miens, autres] = await Promise.all([lire("/api/livreurs"), lire("/api/livreurs/plateforme")]);
      setMesPlateforme(miens);
      setPlateforme(autres);
    } catch (err: any) {
      toast.error(t(err.message || "Impossible de charger les livreurs"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { charger(); }, []);

  async function creerLivreur(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/livreurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success(t("Livreur créé avec succès !"));
      setShowForm(false);
      setForm({ nom: "", email: "", telephone: "", password: "", vehicule: "moto", zone: "" });
      charger();
    } catch (err: any) {
      toast.error(t(err.message));
    } finally {
      setSaving(false);
    }
  }

  const listeAffichee = onglet === "miens" ? mesPlateforme : plateforme;

  return (
    <div className="axd-stack">
      <ModuleTutorial moduleKey="logistique-livreurs" titre={t("Livreurs")} sousTitre={t("Ta flotte de livraison")} steps={LIVREURS_TUTORIAL_STEPS} />

      <Card title={t("Position en temps réel")}>
        <LiveFleetMap />
      </Card>

      <div className="axd-card" style={{ overflow: "hidden" }}>
        <div className="axd-ix-bar">
          <div className="axd-ix-tabs" role="tablist">
            <button type="button" role="tab" className="axd-ix-tab" aria-selected={onglet === "miens"} onClick={() => setOnglet("miens")}>{t("Mon équipe")} · {mesPlateforme.length}</button>
            <button type="button" role="tab" className="axd-ix-tab" aria-selected={onglet === "plateforme"} onClick={() => setOnglet("plateforme")}>{t("Livreurs indépendants")} · {plateforme.length}</button>
          </div>
          <span style={{ flex: 1 }} />
          <Button size="sm" onClick={() => setShowForm(true)}>{t("Ajouter un livreur")}</Button>
        </div>

        {onglet === "plateforme" && (
          <div style={{ padding: "var(--space-300) var(--space-400) 0" }}>
            <Banner>{t("Ces livreurs sont indépendants et disponibles sur toute la plateforme Axso. Vous pouvez les assigner à vos commandes depuis l'onglet Livraison.")}</Banner>
          </div>
        )}

        {loading ? (
          <p className="axd-fichiers__etat">{t("Chargement…")}</p>
        ) : listeAffichee.length === 0 ? (
          <div className="axd-empty">
            <h3>{onglet === "miens" ? t("Aucun livreur dans votre équipe") : t("Aucun livreur indépendant disponible")}</h3>
            <p>{onglet === "miens" ? t("Créez un compte pour chaque livreur : il reçoit ses courses sur son téléphone et vous suivez sa position.") : t("Les livreurs indépendants apparaîtront ici")}</p>
            {onglet === "miens" && <div className="axd-empty__actions"><Button variant="primary" onClick={() => setShowForm(true)}>{t("Ajouter un livreur")}</Button></div>}
          </div>
        ) : (
          <div>
            {listeAffichee.map((l) => (
              <div key={l.id} className="axd-livreur">
                <div className="axd-livreur__ligne">
                  <span className="axd-thumb" aria-hidden><Truck size={18} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <b style={{ color: "var(--color-text-strong)" }}>{t(l.nom)}</b>
                      <Badge tone={l.disponible ? "success" : "neutral"}>{l.disponible ? t("Disponible") : t("Hors service")}</Badge>
                    </div>
                    <div className="axd-muted" style={{ fontSize: 12, display: "flex", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                      <span>{l.telephone}</span>
                      <span>{t(VEHICULES[l.vehicule] ?? l.vehicule)}</span>
                      {l.zone && <span>{t(l.zone)}</span>}
                      {onglet === "plateforme" && <span>{l.tenant ? t(l.tenant.nomBoutique) : t("Indépendant")}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 650, color: "var(--color-text-strong)" }}>{l._count.commandes.toLocaleString(t.loc)}</div>
                    <div className="axd-muted" style={{ fontSize: 12 }}>{onglet === "plateforme" ? t("en cours") : t("livraisons")}</div>
                  </div>
                </div>
                <RemunerationLivreur livreurId={l.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t("Ajouter un livreur")} size="lg"
        footer={<><Button onClick={() => setShowForm(false)}>{t("Annuler")}</Button><Button variant="primary" type="submit" loading={saving} onClick={() => (document.getElementById("form-livreur") as HTMLFormElement | null)?.requestSubmit()}>{t("Créer le compte")}</Button></>}>
        <form id="form-livreur" onSubmit={creerLivreur} style={{ display: "grid", gap: "var(--space-300)", padding: "var(--space-400)" }}>
          <div className="axd-grid axd-g2" style={{ gap: "var(--space-300)" }}>
            <Field label={t("Nom complet")}>{(p) => <input {...p} required className="axd-input" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder={t("Mamadou Diallo")} />}</Field>
            <Field label={t("E-mail")}>{(p) => <input {...p} required type="email" className="axd-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="mamadou@exemple.com" />}</Field>
            <Field label={t("Téléphone")}>{(p) => <input {...p} required className="axd-input" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder={exempleTelephone(pays)} />}</Field>
            <Field label={t("Mot de passe")} help={t("Min. 6 caractères")}>{(p) => <input {...p} required type="password" className="axd-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</Field>
            <Field label={t("Véhicule")}>{(p) => (
              <select {...p} className="axd-input" value={form.vehicule} onChange={(e) => setForm({ ...form, vehicule: e.target.value })}>
                {Object.entries(VEHICULES).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
              </select>
            )}</Field>
            <Field label={t("Zone de couverture")}>{(p) => (
              <input {...p} className="axd-input" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}
                placeholder={zonesBoutique.length ? zonesBoutique.slice(0, 2).join(", ") : t("Dakar centre, Plateau...")} />
            )}</Field>
          </div>
          {/* Les mêmes noms que les zones de la boutique : le livreur est alors proposé en tête pour ces commandes. */}
          {zonesBoutique.length > 0 && (
            <div className="axd-chips" style={{ margin: 0 }}>
              {zonesBoutique.map(z => {
                const choisies = form.zone.split(",").map(x => x.trim()).filter(Boolean);
                const actif = choisies.some(x => normaliserZone(x) === normaliserZone(z));
                return (
                  <button key={z} type="button" className="axd-chip" aria-pressed={actif}
                    onClick={() => setForm({ ...form, zone: (actif ? choisies.filter(x => normaliserZone(x) !== normaliserZone(z)) : [...choisies, z]).join(", ") })}>
                    {z}
                  </button>
                );
              })}
            </div>
          )}
          <Banner>{t("Le livreur pourra se connecter sur")}{" "}<strong>/connexion</strong>{" "}{t("avec cet email et mot de passe. Il sera redirigé vers son interface dédiée.")}</Banner>
        </form>
      </Modal>
    </div>
  );
}
