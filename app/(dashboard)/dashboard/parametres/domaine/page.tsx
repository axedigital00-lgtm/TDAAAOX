"use client";
// Domaine personnalisé — état réel lu chez Vercel via /api/domaine (voir lib/domaines.ts).
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Globe, AlertCircle, CheckCircle2, Clock, Copy, Loader2, RefreshCw, Trash2, ExternalLink, Sparkles } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { urlBoutique } from "@/lib/utils";
import { Alerte, Badge, Bouton, EtatChargement, EtatErreur, Saisie, classesBouton, useConfirmation } from "@/components/ui";
import { SectionParametres } from "../ui";

type Enregistrement = { type: string; nom: string; valeur: string; raison: string };
type Etat = { actif: boolean; verifie: boolean; dnsOk: boolean; enregistrements: Enregistrement[]; message?: string };
type Donnees = { slug?: string; sousDomaineAt?: string | null; publiee?: boolean; configure: boolean; domaine: string | null; etat?: Etat | null };

const CARTE = "rounded-carte border border-bordure bg-carte shadow-carte p-carte space-y-champs";

function copier(texte: string, message: string) {
  navigator.clipboard?.writeText(texte).then(() => toast.success(message)).catch(() => {});
}

export default function DomainePage() {
  const t = useT();
  const [d, setD] = useState<Donnees | null>(null);
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [verif, setVerif] = useState(false);
  const [origine, setOrigine] = useState("");
  const [erreurChargement, setErreurChargement] = useState(false);
  const { confirmer, dialogue } = useConfirmation();

  const charger = useCallback(async (verifier = false) => {
    setErreurChargement(false);
    const r = await fetch(`/api/domaine${verifier ? "?verifier=1" : ""}`).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) {
      if (r) toast.error(t(j.error) ?? t("Les informations du domaine n'ont pas pu être chargées."));
      setErreurChargement(true);
      return null;
    }
    setD(j); return j as Donnees;
  }, []);

  useEffect(() => { setOrigine(window.location.origin); charger(); }, [charger]);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!saisie.trim()) return;
    setEnvoi(true);
    try {
      const r = await fetch("/api/domaine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domaine: saisie }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      toast.success(t("Domaine ajouté — créez maintenant les enregistrements DNS ci-dessous"));
      setSaisie(""); await charger();
    } catch (err) { toast.error(err instanceof Error && err.message ? t(err.message) : t("Le domaine n'a pas pu être connecté. Vérifiez l'orthographe et réessayez.")); } finally { setEnvoi(false); }
  }

  async function verifier() {
    setVerif(true);
    const j = await charger(true);
    setVerif(false);
    if (j?.etat?.actif) toast.success(t("Domaine actif !"));
    else if (j?.etat) toast.message(t("Pas encore prêt"), { description: t("Le DNS peut mettre de quelques minutes à 48 h à se propager.") });
  }

  async function retirer() {
    if (!(await confirmer({
      titre: t("Retirer ce domaine ?"), objet: d?.domaine ?? "",
      description: t("La boutique restera accessible sur son adresse AXSO."),
      libelleConfirmer: t("Retirer le domaine"),
    }))) return;
    const r = await fetch("/api/domaine", { method: "DELETE" }).catch(() => null);
    if (r?.ok) { toast.success(t("Domaine {0} retiré : la boutique reste sur son adresse AXSO.", d?.domaine)); charger(); } else toast.error(t("Le domaine n'a pas pu être retiré. Réessayez dans un instant."));
  }

  const adresseAxso = d?.slug ? urlBoutique({ slug: d.slug, sousDomaineAt: d.sousDomaineAt }, "", origine) : "…"; // adresse AXSO (hors domaine personnalisé)
  const etat = d?.etat;

  return (
    <SectionParametres titre={t("Domaines")} description={t("Servez votre boutique sur votre propre nom de domaine (ex : boutique.mondomaine.com)")}>
      {dialogue}

      <div className="bg-primaire-fond border border-attention-bordure rounded-carte p-4 sm:p-5 min-w-0">
        <p className="text-attention font-semibold text-sm mb-1">{t("Adresse AXSO de la boutique")}</p>
        <p className="text-encre font-mono text-sm break-all">{t(adresseAxso)}</p>
      </div>

      {!d && erreurChargement ? (
        <EtatErreur titre={t("Les informations du domaine n'ont pas pu être chargées.")} texte={t("Vérifiez votre connexion puis réessayez.")} onReessayer={() => charger()} />
      ) : !d ? (
        <EtatChargement texte={t("Chargement du domaine…")} />
      ) : !d.configure ? (
        <Alerte ton="info" titre={t("Les domaines personnalisés ne sont pas encore activés sur ce serveur.")}>
          {t("L'administrateur doit renseigner")}{" "}<code className="text-xs bg-carte px-1 rounded">VERCEL_API_TOKEN</code> et <code className="text-xs bg-carte px-1 rounded">VERCEL_PROJECT_ID</code>.
        </Alerte>
      ) : !d.domaine ? (
        <>
        <SuggestionsDomaine />
        <GuideDomaine />
        <form onSubmit={enregistrer} className={CARTE}>
          <h2 className="ax-titre-section">{t("Connecter un domaine")}</h2>
          <Saisie label={t("Votre domaine")} value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="boutique.mondomaine.com" inputMode="url" autoCapitalize="none"
            aide={t("Conseil : un sous-domaine (boutique.…, shop.…) est le plus simple. Vous devez déjà posséder ce domaine chez un registraire (OVH, Namecheap, GoDaddy…).")} />
          {!d.publiee && <p className="ax-aide text-attention">{t("Votre boutique est en brouillon : le domaine l'affichera une fois la boutique publiée.")}</p>}
          <Bouton type="submit" className="w-full sm:w-auto" disabled={!saisie.trim()} charge={envoi} icone={<Globe size={15} aria-hidden />}>
            {t("Connecter ce domaine")}
          </Bouton>
        </form>
        </>
      ) : (
        <>
          <div className={CARTE}>
            <div className="flex flex-wrap items-center gap-3">
              <Globe size={18} className="text-doux flex-shrink-0" aria-hidden />
              <a href={`https://${d.domaine}`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-encre break-all hover:underline inline-flex items-center gap-1 min-w-0">{t(d.domaine)} <ExternalLink size={12} aria-hidden /></a>
              <Badge className="ml-auto" ton={etat?.actif ? "succes" : "attention"} icone={etat?.actif ? <CheckCircle2 aria-hidden /> : <Clock aria-hidden />}>
                {etat?.actif ? t("Actif") : t("En attente du DNS")}
              </Badge>
            </div>
            {etat?.message && <p className="ax-erreur-champ">{t(etat.message)}</p>}
            {etat && !etat.actif && (
              <ul className="text-sm text-doux space-y-1">
                <li className={etat.dnsOk ? "text-succes" : undefined}>{etat.dnsOk ? "✓" : "○"}{" "}{t("Enregistrement de routage (A / CNAME) détecté")}</li>
                <li className={etat.verifie ? "text-succes" : undefined}>{etat.verifie ? "✓" : "○"}{" "}{t("Propriété du domaine vérifiée")}</li>
              </ul>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <Bouton variante="secondaire" onClick={verifier} charge={verif} texteCharge={t("Vérification…")} icone={<RefreshCw size={14} aria-hidden />}>
                {t("Vérifier maintenant")}
              </Bouton>
              <Bouton variante="danger" onClick={retirer} icone={<Trash2 size={14} aria-hidden />}>
                {t("Retirer le domaine")}
              </Bouton>
            </div>
          </div>

          {etat && !etat.actif && etat.enregistrements.length > 0 && (
            <div className={CARTE}>
              <h2 className="ax-titre-section">{t("À créer chez votre registraire")}</h2>
              <p className="ax-texte-secondaire">{t("Dans la zone DNS de votre domaine, ajoutez exactement ces enregistrements :")}</p>
              <div className="space-y-3">
                {etat.enregistrements.map((e, i) => (
                  <div key={i} className="bg-carte-2 border border-bordure rounded-controle p-4 space-y-2">
                    <p className="ax-aide">{t(e.raison)}</p>
                    <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[70px_minmax(0,1fr)_minmax(0,2fr)] gap-x-3 gap-y-1 text-sm items-start">
                      <span className="text-doux text-xs sm:hidden">{t("Type")}</span><span className="font-mono font-bold text-attention">{t(e.type)}</span>
                      <span className="text-doux text-xs sm:hidden">{t("Nom")}</span>
                      <button onClick={() => copier(e.nom, t("Nom copié"))} title={t("Copier le nom")} className="font-mono text-encre text-left break-all inline-flex items-center gap-1.5 min-w-0 min-h-10 sm:min-h-0">{t(e.nom)} <Copy size={12} className="text-doux flex-shrink-0" aria-hidden /></button>
                      <span className="text-doux text-xs sm:hidden">{t("Valeur")}</span>
                      <button onClick={() => copier(e.valeur, t("Valeur copiée"))} title={t("Copier la valeur")} className="font-mono text-encre text-xs text-left break-all inline-flex items-center gap-1.5 min-w-0 min-h-10 sm:min-h-0">{t(e.valeur)} <Copy size={12} className="text-doux flex-shrink-0" aria-hidden /></button>
                    </div>
                  </div>
                ))}
              </div>
              <Alerte ton="info" titre={t("La propagation prend de quelques minutes à 48 h.")}>
                {t("Le certificat HTTPS est ensuite créé automatiquement. Cliquez sur « Vérifier maintenant » pour suivre l'avancement.")}
              </Alerte>
            </div>
          )}
          {etat && !etat.actif && <SiEchec />}
        </>
      )}
    </SectionParametres>
  );
}

type Offre = { domaine: string; prix?: number; renouvellement?: number; annees?: number; premium?: boolean; lienAchat: string };
type Suggestions = { fournisseur: string; suggestions: Offre[]; extensionPays: string | null };

const dollars = (n?: number) => (n == null ? "" : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ US`);

// Proposition d'Axia : noms dérivés du nom de la boutique, disponibilité et prix vérifiés chez le fournisseur.
function SuggestionsDomaine() {
  const t = useT();
  const [s, setS] = useState<Suggestions | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true); setErreur(null);
    try {
      const r = await fetch("/api/domaine/suggestions");
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error);
      setS(j);
    } catch (e) {
      setS(null);
      setErreur(e instanceof Error && e.message ? e.message : "Le service de vérification des domaines ne répond pas. Réessaie dans quelques minutes.");
    } finally { setChargement(false); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  return (
    <div className={CARTE}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-controle bg-primaire-fond text-attention flex items-center justify-center flex-shrink-0" aria-hidden><Sparkles size={17} /></span>
        <div className="min-w-0">
          <h2 className="ax-titre-section">{t("Pas encore de domaine ? Axia te propose des noms")}</h2>
          <p className="ax-texte-secondaire">{t("Disponibilité et prix vérifiés à l'instant chez {0}. L'achat se fait chez lui, pas dans Axso.", s?.fournisseur ?? "Vercel")}</p>
        </div>
      </div>
      {chargement ? (
        <EtatChargement compact texte={t("Vérification des noms disponibles…")} />
      ) : erreur ? (
        <EtatErreur compact titre={t(erreur)} texte={t("Aucun nom n'est proposé sans vérification.")} onReessayer={charger} />
      ) : !s?.suggestions.length ? (
        <p className="ax-texte-secondaire">{t("Aucun nom dérivé de ta boutique n'est disponible pour l'instant. Tu peux en chercher un autre directement chez {0}.", s?.fournisseur ?? "Vercel")}</p>
      ) : (
        <ul className="space-y-2">
          {s.suggestions.map((o) => (
            <li key={o.domaine} className="flex flex-col sm:flex-row sm:items-center gap-3 border border-bordure rounded-controle p-3.5">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-semibold text-encre break-all">{o.domaine}</p>
                <p className="text-xs text-doux mt-0.5">
                  {t("{0} la première année", dollars(o.prix))}
                  {o.renouvellement != null && o.renouvellement !== o.prix && <>{" · "}{t("puis {0} par an", dollars(o.renouvellement))}</>}
                  {o.premium && <>{" · "}{t("nom premium")}</>}
                </p>
              </div>
              <a href={o.lienAchat} target="_blank" rel="noopener noreferrer"
                className={classesBouton({ variante: "sombre", className: "shrink-0" })}>
                {t("Acheter chez {0}", s.fournisseur)} <ExternalLink size={13} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
      {s?.extensionPays && (
        <p className="ax-aide">{t("L'extension {0} n'est pas disponible chez {1} (déjà prise ou pas vendue). Tu peux l'acheter chez un registraire de ton pays, puis la connecter ici de la même façon.", s.extensionPays, s.fournisseur)}</p>
      )}
    </div>
  );
}

function GuideDomaine() {
  const t = useT();
  const etapes = [
    t("Achète le domaine chez le fournisseur (bouton « Acheter chez… » ou ton registraire habituel)."),
    t("Reviens sur cette page et saisis le domaine acheté ci-dessous, puis « Connecter ce domaine »."),
    t("Crée chez le fournisseur les enregistrements DNS qu'Axso t'affiche (dans la zone DNS du domaine)."),
    t("Clique sur « Vérifier maintenant » : le domaine devient l'adresse principale de ta boutique dès qu'il est actif."),
  ];
  return (
    <div className={CARTE}>
      <h2 className="ax-titre-section">{t("Comment ça marche")}</h2>
      <ol className="space-y-2 list-none">
        {etapes.map((e, i) => (
          <li key={i} className="flex gap-3 ax-texte">
            <span className="w-6 h-6 rounded-full bg-primaire-fond text-attention text-xs font-bold flex items-center justify-center flex-shrink-0" aria-hidden>{i + 1}</span>
            <span className="pt-0.5">{e}</span>
          </li>
        ))}
      </ol>
      <p className="ax-aide">{t("Délai normal : de quelques minutes à 48 h, le temps que les DNS se propagent. Le certificat HTTPS est ensuite créé automatiquement.")}</p>
    </div>
  );
}

function SiEchec() {
  const t = useT();
  return (
    <div className={CARTE}>
      <h2 className="ax-titre-section">{t("La vérification échoue ?")}</h2>
      <ul className="list-disc pl-5 space-y-1 ax-texte-secondaire">
        <li>{t("Vérifie que chaque valeur est copiée exactement (bouton copier), sans espace en trop.")}</li>
        <li>{t("Supprime les anciens enregistrements A ou CNAME qui portent le même nom : ils entrent en conflit.")}</li>
        <li>{t("Patiente : la propagation peut prendre jusqu'à 48 h, puis clique à nouveau sur « Vérifier maintenant ».")}</li>
        <li>{t("Toujours bloqué après 48 h ? Contacte le support Axso en indiquant ton domaine.")}</li>
      </ul>
    </div>
  );
}
