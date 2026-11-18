"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { User, Mail, ShieldCheck, Store, LogOut, Eye, EyeOff, Loader2, Check, Crown, CalendarDays, KeyRound, ArrowLeftRight, Camera, Trash2, ImagePlus } from "lucide-react";
import { ACCEPT, importerMedia } from "@/components/ui/MediaUpload";
import { annoncerPhoto } from "@/components/dashboard/AvatarCompte";
import { basculerBoutique } from "@/components/dashboard/BoutiqueSwitcher";
import { useT } from "@/components/I18nProvider";
import { NOMS_PALIERS } from "@/lib/plans";
import { Badge, Bouton, Champ, CLASSE_SAISIE, EnTetePage, EtatChargement, EtatErreur, Saisie } from "@/components/ui";

// « Mon profil » : le compte de la personne connectée (nom, photo, mot de
// passe, boutiques auxquelles elle a accès). Les réglages d'une boutique
// restent dans Réglages.
interface Compte { name: string | null; email: string | null; image: string | null; role: string; createdAt: string; aMotDePasse: boolean }
interface Boutique { id: string; nomBoutique: string; slug: string; logoUrl: string | null; planType: string; active: boolean; proprietaire: boolean }

const ROLES: Record<string, string> = { owner: "Propriétaire", admin: "Administrateur", superadmin: "Super administrateur", livreur: "Livreur", membre: "Membre d'équipe" };
const PALIERS: Record<string, string> = NOMS_PALIERS;

function initiales(nom: string) {
  return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join("") || "?";
}

export default function ProfilPage() {
  const t = useT();
  const router = useRouter();
  const [compte, setCompte] = useState<Compte | null>(null);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [nom, setNom] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurChargement, setErreurChargement] = useState(false);

  const charger = () => {
    setErreurChargement(false);
    fetch("/api/compte").then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then((c) => { setCompte(c); setNom(c.name ?? ""); }).catch(() => setErreurChargement(true));
    fetch("/api/boutiques").then((r) => r.json()).then((d) => setBoutiques(d.boutiques ?? [])).catch(() => {});
  };
  useEffect(charger, []);

  const majCompte = async (patch: { name?: string; image?: string | null }, message: string) => {
    setEnregistrement(true);
    try {
      const res = await fetch("/api/compte", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCompte((c) => (c ? { ...c, ...data } : c));
      if ("image" in patch) annoncerPhoto(data.image ?? null); // en-tête, menu mobile, AXIA
      toast.success(t(message));
      router.refresh(); // nom du header
    } catch (e) {
      toast.error(e instanceof Error && e.message ? t(e.message) : t("La modification n'a pas pu être enregistrée. Vérifie ta connexion et réessaie."));
    } finally { setEnregistrement(false); }
  };

  if (erreurChargement) {
    return <EtatErreur titre={t("Ton profil n'a pas pu être chargé.")} texte={t("Vérifie ta connexion puis réessaie.")} onReessayer={charger} />;
  }
  if (!compte) return <EtatChargement texte={t("Chargement de ton profil…")} />;

  const affiche = compte.name || compte.email || "Mon compte";
  const nomModifie = nom.trim() && nom.trim() !== (compte.name ?? "");

  return (
    <div className="space-y-section max-w-3xl w-full mx-auto pb-10">
      <EnTetePage className="mb-0" titre={t("Mon profil")} description={t("Ton compte personnel — les réglages de ta boutique sont dans Réglages.")} />

      {/* ── Identité ── */}
      <section className="rounded-carte border border-bordure bg-carte shadow-carte overflow-hidden">
        <div className="h-20 sm:h-24 bg-gradient-to-r from-primaire-fond to-primaire/60" aria-hidden />
        <div className="px-5 sm:px-6 pb-5 -mt-10 sm:-mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
          <CadrePhoto image={compte.image} initiales={initiales(affiche)} occupe={enregistrement}
            onChoisie={(url) => majCompte({ image: url }, "Photo mise à jour")}
            onRetirer={() => majCompte({ image: null }, "Photo retirée")} />
          <div className="min-w-0 flex-1 sm:pb-1">
            <h2 className="ax-titre-section truncate">{t(affiche)}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-doux">
              <span className="inline-flex items-center gap-1.5 min-w-0"><Mail size={13} className="flex-shrink-0" /><span className="truncate">{compte.email}</span></span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} />{t("Membre depuis")}{" "}{new Date(compte.createdAt).toLocaleDateString(t.loc, { month: "long", year: "numeric" })}</span>
            </div>
          </div>
          <Badge ton="accent" icone={<Crown aria-hidden />} className="self-start sm:self-end">{t(ROLES[compte.role]) ?? t(compte.role)}</Badge>
        </div>
      </section>

      {/* ── Informations ── */}
      <section className="rounded-carte border border-bordure bg-carte shadow-carte p-carte space-y-champs">
        <Titre Icon={User} titre={t("Informations personnelles")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Saisie label={t("Nom complet")} value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} autoComplete="name" />
          <Saisie label={t("Email de connexion")} value={compte.email ?? ""} readOnly disabled aide={t("Il sert à te connecter : il ne se modifie pas ici.")} />
        </div>
        <div className="flex justify-end">
          <Bouton onClick={() => majCompte({ name: nom.trim() }, "Nom mis à jour")} disabled={!nomModifie} charge={enregistrement} icone={<Check size={15} aria-hidden />}>
            {t("Enregistrer le nom")}
          </Bouton>
        </div>
      </section>

      {/* ── Sécurité ── */}
      <MotDePasse aMotDePasse={compte.aMotDePasse} />

      {/* ── Boutiques ── */}
      <section className="rounded-carte border border-bordure bg-carte shadow-carte p-carte space-y-champs">
        <Titre Icon={Store} titre={t("Mes boutiques")} sousTitre={t("{0} boutique{1} accessible{2} avec ce compte", boutiques.length, boutiques.length > 1 ? "s" : "", boutiques.length > 1 ? "s" : "")} />
        <ul className="divide-y divide-bordure">
          {boutiques.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-3">
              <span className="w-10 h-10 rounded-controle overflow-hidden bg-primaire-fond border border-attention-bordure flex items-center justify-center flex-shrink-0 text-sm font-bold text-attention" aria-hidden>
                {b.logoUrl ? <img src={b.logoUrl} alt="" className="w-full h-full object-cover" /> : b.nomBoutique.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-encre truncate">{t(b.nomBoutique)}</p>
                <p className="text-xs text-doux truncate">{b.proprietaire ? t("Propriétaire") : t("Membre de l'équipe")} · {t(PALIERS[b.planType]) ?? t(b.planType)}</p>
              </div>
              {b.active
                ? <Badge ton="succes" className="shrink-0">{t("Boutique actuelle")}</Badge>
                : <Bouton variante="secondaire" taille="compact" className="shrink-0" onClick={() => basculerBoutique(b.id, "/dashboard/profil")}
                    icone={<ArrowLeftRight size={14} aria-hidden />} aria-label={`${t("Passer sur la boutique")} ${b.nomBoutique}`}>
                    {t("Passer dessus")}
                  </Bouton>}
            </li>
          ))}
        </ul>
      </section>

      <Bouton variante="danger" className="w-full sm:w-auto" onClick={() => signOut({ callbackUrl: "/connexion" })} icone={<LogOut size={16} aria-hidden />}>
        {t("Se déconnecter")}
      </Bouton>
    </div>
  );
}

function Titre({ Icon, titre, sousTitre }: { Icon: typeof User; titre: string; sousTitre?: string }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 h-10 rounded-controle bg-primaire-fond border border-attention-bordure flex items-center justify-center flex-shrink-0" aria-hidden><Icon size={16} className="text-attention" /></span>
      <div className="min-w-0">
        <h2 className="ax-titre-section">{t(titre)}</h2>
        {sousTitre && <p className="ax-aide">{t(sousTitre)}</p>}
      </div>
    </div>
  );
}

function ChampSecret({ label, value, onChange, autoComplete, erreur, aide }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; erreur?: string; aide?: string }) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  return (
    <Champ label={t(label)} erreur={erreur} aide={aide}>
      {(a) => (
        <span className="relative block">
          <input {...a} type={visible ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className={`${CLASSE_SAISIE} pr-11`} />
          <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-controle flex items-center justify-center text-doux hover:text-encre">
            {visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        </span>
      )}
    </Champ>
  );
}

function MotDePasse({ aMotDePasse }: { aMotDePasse: boolean }) {
  const t = useT();
  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const differents = !!confirmation && nouveau !== confirmation;
  const pret = actuel && nouveau.length >= 8 && nouveau === confirmation;

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pret) return;
    setEnvoi(true);
    try {
      const res = await fetch("/api/compte/mot-de-passe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actuel, nouveau }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t("Mot de passe modifié : utilise-le à ta prochaine connexion."));
      setActuel(""); setNouveau(""); setConfirmation("");
    } catch (err) {
      toast.error(err instanceof Error && err.message ? t(err.message) : t("Le mot de passe n'a pas pu être modifié. Vérifie ta connexion et réessaie."));
    } finally { setEnvoi(false); }
  };

  return (
    <section className="rounded-carte border border-bordure bg-carte shadow-carte p-carte space-y-champs">
      <Titre Icon={ShieldCheck} titre={t("Sécurité")} sousTitre={t("Change ton mot de passe de connexion")} />
      {!aMotDePasse ? (
        <p className="ax-texte-secondaire bg-carte-2 rounded-controle px-4 py-3">{t("Ce compte se connecte sans mot de passe (connexion externe). Utilise « Mot de passe oublié » sur la page de connexion pour en définir un.")}</p>
      ) : (
        <form onSubmit={envoyer} className="space-y-4">
          <ChampSecret label={t("Mot de passe actuel")} value={actuel} onChange={setActuel} autoComplete="current-password" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChampSecret label={t("Nouveau mot de passe")} value={nouveau} onChange={setNouveau} autoComplete="new-password" aide={t("8 caractères minimum.")}
              erreur={nouveau && nouveau.length < 8 ? t("Ajoute des caractères : 8 au minimum.") : undefined} />
            <ChampSecret label={t("Confirmer le nouveau")} value={confirmation} onChange={setConfirmation} autoComplete="new-password"
              erreur={differents ? t("Les deux mots de passe ne correspondent pas.") : undefined} />
          </div>
          <div className="flex justify-end">
            <Bouton type="submit" variante="sombre" disabled={!pret} charge={envoi} icone={<KeyRound size={15} aria-hidden />}>
              {t("Modifier le mot de passe")}
            </Bouton>
          </div>
        </form>
      )}
    </section>
  );
}

/**
 * Photo de profil : tout se fait en cliquant sur le cadre. Sans photo, il ouvre le choix du fichier ;
 * avec photo, un petit menu propose de la changer ou de la retirer.
 */
function CadrePhoto({ image, initiales, occupe, onChoisie, onRetirer }: {
  image: string | null; initiales: string; occupe: boolean; onChoisie: (url: string) => void; onRetirer: () => void;
}) {
  const t = useT();
  const fichier = useRef<HTMLInputElement>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [progression, setProgression] = useState<number | null>(null);

  useEffect(() => {
    if (!menu) return;
    const fermer = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !cadre.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", fermer);
    document.addEventListener("keydown", fermer);
    return () => { document.removeEventListener("mousedown", fermer); document.removeEventListener("keydown", fermer); };
  }, [menu]);

  const envoyer = async (f?: File) => {
    if (fichier.current) fichier.current.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return void toast.error(t("Choisis une image (JPG, PNG, WebP…)"));
    if (f.size > 10 * 1024 * 1024) return void toast.error(t("Image trop lourde (10 Mo maximum)"));
    setProgression(0);
    const url = await importerMedia("image", f, setProgression);
    setProgression(null);
    if (url) onChoisie(url); else toast.error(t("Import impossible : stockage des fichiers indisponible."));
  };
  const choisir = () => { setMenu(false); fichier.current?.click(); };
  const enCours = occupe || progression !== null;

  return (
    <div ref={cadre} className="relative flex-shrink-0">
      <input ref={fichier} type="file" accept={ACCEPT.image} className="hidden" onChange={(e) => envoyer(e.target.files?.[0])} />
      <button type="button" disabled={enCours} onClick={() => (image ? setMenu((m) => !m) : choisir())}
        aria-label={image ? t("Changer ou retirer la photo de profil") : t("Ajouter une photo de profil")} aria-haspopup={image ? "menu" : undefined} aria-expanded={image ? menu : undefined}
        className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-[#111111] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5A623]/40 disabled:cursor-wait">
        {image
          ? <img src={image} alt="" className="w-full h-full object-cover" />
          : <span className="text-[26px] font-bold text-[#F5A623]">{initiales}</span>}
        <span className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white transition-opacity ${enCours ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
          {enCours
            ? <><Loader2 size={20} className="animate-spin" />{progression !== null && <span className="text-[11px] font-semibold">{progression} %</span>}</>
            : <><Camera size={20} /><span className="text-[11px] font-semibold">{image ? t("Modifier") : t("Ajouter")}</span></>}
        </span>
      </button>
      {menu && (
        <div role="menu" className="absolute left-0 top-full mt-2 sm:left-full sm:top-1 sm:mt-0 sm:ml-3 z-20 w-52 p-1.5 rounded-controle bg-carte border border-bordure shadow-flottante">
          <button role="menuitem" type="button" onClick={choisir} className="w-full flex items-center gap-2.5 px-3 min-h-10 rounded-controle text-sm text-encre hover:bg-carte-2">
            <ImagePlus size={15} className="text-attention" aria-hidden />{" "}{t("Changer la photo")}
          </button>
          <button role="menuitem" type="button" onClick={() => { setMenu(false); onRetirer(); }} className="w-full flex items-center gap-2.5 px-3 min-h-10 rounded-controle text-sm text-erreur hover:bg-erreur-fond">
            <Trash2 size={15} />{" "}{t("Retirer la photo")}
          </button>
        </div>
      )}
    </div>
  );
}
