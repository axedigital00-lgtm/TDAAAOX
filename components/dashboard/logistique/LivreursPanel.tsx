"use client";
import { exempleTelephone } from "@/lib/devise-convert";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Truck, Plus, Phone, MapPin, Globe, Bike, Car, User } from "lucide-react";
import { LiveFleetMap } from "@/components/dashboard/logistique/LiveFleetMap";
import { RemunerationLivreur } from "@/components/dashboard/logistique/RemunerationLivreur";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { lireReglagesLivraison, normaliserZone } from "@/lib/livraison-reglages";
import { Alerte, Badge, Bouton, Champ, CLASSE_SAISIE, EtatErreur, EtatVide, Saisie, SqueletteListe } from "@/components/ui";
import { cn } from "@/lib/utils";

const LIVREURS_TUTORIAL_STEPS = [
  { Icon: Plus,   titre: "Crée un compte livreur",         description: "Ajoute un livreur à ton équipe avec nom, téléphone, véhicule et zone de couverture." },
  { Icon: Globe,  titre: "Livreurs de la plateforme",       description: "Bascule sur l'onglet Plateforme pour voir les livreurs indépendants disponibles à assigner." },
  { Icon: MapPin, titre: "Suis la flotte en direct",        description: "La carte en haut de page affiche la position en temps réel de tes livreurs actifs." },
  { Icon: Truck,  titre: "Disponibilité en un coup d'œil",  description: "Le badge « Disponible » indique qu'un livreur peut prendre une nouvelle livraison." },
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

const VEHICULES: Record<string, { label: string; Icon: typeof Bike }> = {
  moto: { label: "Moto", Icon: Bike }, voiture: { label: "Voiture", Icon: Car },
  velo: { label: "Vélo", Icon: Bike }, a_pied: { label: "À pied", Icon: User },
};

const FORM_VIDE = { nom: "", email: "", telephone: "", password: "", vehicule: "moto", zone: "" };
type Erreurs = Partial<Record<"nom" | "email" | "telephone" | "password", string>>;

export function LivreursPanel() {
  const t = useT();
  const [mesPlateforme, setMesPlateforme] = useState<Livreur[]>([]);
  const [plateforme, setPlateforme] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(true);
  const [echec, setEchec] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [onglet, setOnglet] = useState<"miens" | "plateforme">("miens");
  const [form, setForm] = useState(FORM_VIDE);
  const [erreurs, setErreurs] = useState<Erreurs>({});
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
    setEchec(null);
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
      setEchec(err?.message === "Failed to fetch" ? "Vérifie ta connexion puis réessaie." : err?.message || "Impossible de charger les livreurs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { charger(); }, []);

  // Mêmes exigences que le serveur (app/api/livreurs), dites en clair sous chaque champ.
  function verifier(): Erreurs {
    const e: Erreurs = {};
    if (form.nom.trim().length < 2) e.nom = t("Indique le nom du livreur (2 caractères au moins).");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = t("Indique une adresse e-mail valide, par exemple nom@exemple.com.");
    if (form.telephone.trim().length < 8) e.telephone = t("Indique un numéro de téléphone complet (8 chiffres au moins).");
    if (form.password.length < 6) e.password = t("Choisis un mot de passe d'au moins 6 caractères.");
    return e;
  }

  async function creerLivreur(e: React.FormEvent) {
    e.preventDefault();
    const err = verifier();
    setErreurs(err);
    if (Object.keys(err).length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/livreurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Le compte du livreur n'a pas pu être créé. Réessaie.");
      toast.success(t("Compte de {0} créé : il peut se connecter avec son e-mail et son mot de passe.", form.nom.trim()));
      setShowForm(false);
      setForm(FORM_VIDE);
      setOnglet("miens");
      charger();
    } catch (err: any) {
      toast.error(t(err.message));
    } finally {
      setSaving(false);
    }
  }

  const listeAffichee = onglet === "miens" ? mesPlateforme : plateforme;
  const champ = (cle: keyof Erreurs) => ({
    value: form[cle], erreur: erreurs[cle],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setForm({ ...form, [cle]: e.target.value }); setErreurs((x) => ({ ...x, [cle]: undefined })); },
  });

  return (
    <div className="space-y-5">
      <ModuleTutorial moduleKey="logistique-livreurs" titre={t("Livreurs")} sousTitre={t("Ta flotte de livraison")} steps={LIVREURS_TUTORIAL_STEPS} />
      {!showForm && (
        <div className="flex items-center justify-end">
          <Bouton icone={<Plus className="size-4" aria-hidden />} onClick={() => setShowForm(true)}>{t("Ajouter un livreur")}</Bouton>
        </div>
      )}

      {/* Formulaire création */}
      {showForm && (
        <section className="rounded-carte border border-bordure bg-carte p-carte">
          <h2 className="ax-sous-titre mb-4">{t("Créer un compte livreur")}</h2>
          <form onSubmit={creerLivreur} className="space-y-champs" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Saisie label={t("Nom complet")} mention="obligatoire" placeholder={t("Mamadou Diallo")} autoComplete="off" {...champ("nom")} />
              <Saisie label={t("E-mail de connexion")} mention="obligatoire" type="email" placeholder="mamadou@exemple.com" autoComplete="off" {...champ("email")} />
              <Saisie label={t("Téléphone")} mention="obligatoire" type="tel" inputMode="tel" placeholder={exempleTelephone(pays)} {...champ("telephone")} />
              <Saisie label={t("Mot de passe")} mention="obligatoire" type="password" autoComplete="new-password" aide={t("6 caractères au moins. Donne-le au livreur.")} {...champ("password")} />
              <Champ label={t("Véhicule")}>
                {(a) => (
                  <select {...a} value={form.vehicule} onChange={(e) => setForm({ ...form, vehicule: e.target.value })} className={CLASSE_SAISIE}>
                    {Object.entries(VEHICULES).map(([v, { label }]) => <option key={v} value={v}>{t(label)}</option>)}
                  </select>
                )}
              </Champ>
              <div>
                <Saisie label={t("Zone de couverture")} mention="facultatif"
                  aide={zonesBoutique.length ? t("Touche les zones de ta boutique qu'il couvre : il sera proposé en premier pour ces commandes.") : undefined}
                  value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}
                  placeholder={zonesBoutique.length ? zonesBoutique.slice(0, 2).join(", ") : t("Dakar centre, Plateau...")} />
                {/* Les mêmes noms que les zones de la boutique : le livreur est alors proposé en tête pour ces commandes. */}
                {zonesBoutique.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {zonesBoutique.map(z => {
                      const choisies = form.zone.split(",").map(x => x.trim()).filter(Boolean);
                      const actif = choisies.some(x => normaliserZone(x) === normaliserZone(z));
                      return (
                        <button key={z} type="button" aria-pressed={actif}
                          onClick={() => setForm({ ...form, zone: (actif ? choisies.filter(x => normaliserZone(x) !== normaliserZone(z)) : [...choisies, z]).join(", ") })}
                          className={cn("min-h-10 rounded-full border px-3 text-sm transition-colors sm:min-h-8",
                            actif ? "border-primaire bg-primaire font-semibold text-sur-primaire" : "border-bordure text-doux hover:border-bordure-forte")}>
                          {z}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <Alerte ton="info" titre={t("Comment le livreur se connecte")}>
              {t("Le livreur pourra se connecter sur")}{" "}<strong>/connexion</strong>{" "}{t("avec cet email et mot de passe. Il sera redirigé vers son interface dédiée.")}
            </Alerte>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Bouton variante="secondaire" onClick={() => { setShowForm(false); setErreurs({}); }}>{t("Annuler")}</Bouton>
              <Bouton type="submit" charge={saving} texteCharge={t("Création du compte…")}>{t("Créer le compte livreur")}</Bouton>
            </div>
          </form>
        </section>
      )}

      {/* Carte flotte en direct */}
      <section className="rounded-carte border border-bordure bg-carte p-4">
        <h2 className="ax-titre-section mb-3">{t("Position en temps réel")}</h2>
        <LiveFleetMap />
      </section>

      {/* Onglets */}
      <div role="tablist" aria-label={t("Livreurs")} className="flex gap-1 rounded-controle border border-bordure bg-carte-2 p-1">
        {([["miens", t("Mon équipe"), mesPlateforme.length], ["plateforme", t("Plateforme"), plateforme.length]] as const).map(([cle, libelle, n]) => (
          <button key={cle} type="button" role="tab" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}
            className={cn("flex min-h-10 flex-1 items-center justify-center gap-2 rounded-controle text-sm font-semibold transition-colors",
              onglet === cle ? "bg-secondaire text-carte" : "text-doux hover:text-encre")}>
            {cle === "plateforme" && <Globe className="size-4" aria-hidden />}
            {libelle} ({n})
          </button>
        ))}
      </div>

      {/* Info plateforme */}
      {onglet === "plateforme" && (
        <Alerte ton="info" titre={t("Livreurs indépendants")}>
          {t("Ces livreurs sont indépendants et disponibles sur toute la plateforme Axso. Vous pouvez les assigner à vos commandes depuis l'onglet Livraison.")}
        </Alerte>
      )}

      {/* Liste */}
      {loading ? (
        <SqueletteListe lignes={3} libelle={t("Chargement des livreurs…")} />
      ) : echec ? (
        <EtatErreur titre={t("Les livreurs n'ont pas pu être chargés")} texte={t(echec)} onReessayer={charger} />
      ) : listeAffichee.length === 0 ? (
        onglet === "miens" ? (
          <EtatVide icone={<Truck />} titre={t("Aucun livreur dans votre équipe")}
            texte={t("Crée un compte pour chaque livreur : tu pourras ensuite lui assigner des commandes et suivre sa position.")}>
            {!showForm && <Bouton icone={<Plus className="size-4" aria-hidden />} onClick={() => setShowForm(true)}>{t("Ajouter un livreur")}</Bouton>}
          </EtatVide>
        ) : (
          <EtatVide icone={<Globe />} titre={t("Aucun livreur indépendant disponible")} texte={t("Les livreurs indépendants apparaîtront ici")} />
        )
      ) : (
        <ul className="space-y-3">
          {listeAffichee.map((l) => {
            const v = VEHICULES[l.vehicule] ?? { label: l.vehicule, Icon: Truck };
            return (
              <li key={l.id} className="space-y-3 rounded-carte border border-bordure bg-carte p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-controle bg-primaire-fond text-attention" title={t(v.label)}>
                    <v.Icon className="size-5" aria-hidden /><span className="sr-only">{t(v.label)}</span>
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-semibold text-encre">{t(l.nom)}</p>
                      <Badge ton={l.disponible ? "succes" : "neutre"}>{l.disponible ? t("Disponible") : t("Hors service")}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 ax-aide">
                      <a href={`tel:${l.telephone}`} className="flex min-h-8 items-center gap-1 hover:text-encre"><Phone className="size-3.5" aria-hidden />{l.telephone}</a>
                      {l.zone && <span className="flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{t(l.zone)}</span>}
                      {onglet === "plateforme" && (l.tenant ? <span>{t(l.tenant.nomBoutique)}</span> : <span className="italic">{t("Indépendant")}</span>)}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-lg font-bold tabular-nums text-encre">{l._count.commandes}</span>
                    <span className="ax-aide">{onglet === "plateforme" ? t("en cours") : t("livraisons")}</span>
                  </div>
                </div>
                <RemunerationLivreur livreurId={l.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
