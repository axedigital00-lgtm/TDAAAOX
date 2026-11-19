"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Wallet, ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle2,
  XCircle, TrendingUp, ShieldCheck, Loader2, RefreshCw,
  Smartphone, Building2,
} from "lucide-react";
import { Alerte, Badge, Bouton, Champ, CLASSE_SAISIE, EtatErreur, EtatVide, Modale, Saisie, SqueletteListe, type Ton } from "@/components/ui";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { EnTeteModule } from "@/app/(dashboard)/dashboard/clients/EnTeteModule";
import { basculerBoutique } from "@/components/dashboard/BoutiqueSwitcher";
import { useT } from "@/components/I18nProvider";
import { exempleTelephone, normaliserTelephone } from "@/lib/devise-convert";

const WALLET_TUTORIAL_STEPS = [
  { Icon: ShieldCheck,     titre: "Séquestre 48h",      description: "Chaque vente payée en ligne reste 48h en séquestre (protection acheteur) avant de passer sur ton solde disponible." },
  { Icon: ArrowUpFromLine, titre: "Retirer mon argent", description: "Clique « Retirer mon argent » dès que ton solde disponible le permet (minimum l'équivalent de 1 000 FCFA) — par Mobile Money ou virement bancaire." },
  { Icon: TrendingUp,      titre: "Trois montants",     description: "Disponible (retirable maintenant), en attente (séquestre) et déjà retiré — tout est visible en un coup d'œil." },
  { Icon: Clock,           titre: "Suivi du retrait",   description: "Onglet Retraits : Demandé → En cours de validation (24 à 48 h ouvrées) → Payé. Tu es prévenu à chaque étape." },
];

// Suivi d'un retrait (validation manuelle par Axso, lib/wallet.ts) : statut serveur → étape affichée.
const ETAPES_RETRAIT = ["Demandé", "En cours de validation", "Payé"] as const;
const etapeRetrait = (statut: string) => statut === "complete" || statut === "completed" ? 2 : 1;

interface Transaction {
  id: string; type: string; montant: number; devise: string;
  description: string; reference?: string; statut: string; createdAt: string;
}
interface RetraitItem {
  id: string; montant: number; devise: string; methode: string;
  destinataire: string; operateur?: string; statut: string;
  reference?: string; createdAt: string;
}
interface WalletData {
  solde: number; totalRecu: number; totalRetire: number;
  totalCommission: number;
  retraitsEnAttente: number; devise: string;
  // Séquestre 48 h (lib/wallet.ts) : seul `disponible` est retirable.
  disponible?: number; enAttente?: number; liberations?: { montant: number; le: string }[]; minimumRetrait?: number;
  transactions: Transaction[]; retraits: RetraitItem[];
}
interface SoldeBoutique { id: string; nomBoutique: string; active: boolean; solde: number; devise: string; }

const OPERATEURS = [
  { id: "MTN",    label: "MTN Mobile Money"  },
  { id: "Orange", label: "Orange Money"      },
  { id: "Wave",   label: "Wave"              },
  { id: "Moov",   label: "Moov Money"        },
  { id: "Mpesa",  label: "M-Pesa"            },
  { id: "Airtel", label: "Airtel Money"      },
  { id: "Free",   label: "Free Money"        },
];

function fmt(n: number, devise = "XAF") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: devise,
    minimumFractionDigits: 0, maximumFractionDigits: devise === "XAF" || devise === "XOF" ? 0 : 2,
  }).format(n);
}

function StatutBadge({ statut }: { statut: string }) {
  const tr = useT();
  const map: Record<string, { label: string; ton: Ton; icon: any }> = {
    completed:  { label: "Complété",   ton: "succes",    icon: CheckCircle2 },
    complete:   { label: "Complété",   ton: "succes",    icon: CheckCircle2 },
    en_attente: { label: "En attente", ton: "attention", icon: Clock       },
    traitement: { label: "En cours",   ton: "info",      icon: Loader2     },
    en_cours:   { label: "En cours",   ton: "info",      icon: Loader2     },
    echoue:     { label: "Échoué",     ton: "erreur",    icon: XCircle     },
  };
  const s = map[statut] ?? map["en_attente"];
  const Icon = s.icon;
  return <Badge ton={s.ton} icone={<Icon aria-hidden />}>{tr(s.label)}</Badge>;
}

function SuiviRetrait({ statut }: { statut: string }) {
  const tr = useT();
  const etape = etapeRetrait(statut);
  return (
    <div className="pl-12 mt-2">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs">
        {ETAPES_RETRAIT.map((e, i) => (
          <li key={e} className="flex items-center gap-1.5" aria-current={i === etape ? "step" : undefined}>
            {i > 0 && <span className="w-3 h-px bg-bordure-forte" aria-hidden />}
            <span className={`inline-flex items-center gap-1 font-semibold ${i < etape || etape === 2 ? "text-succes" : i === etape ? "text-attention" : "text-discret"}`}>
              {i < etape || etape === 2 ? <CheckCircle2 size={11} /> : i === etape ? <Clock size={11} /> : null}{tr(e)}
            </span>
          </li>
        ))}
      </ol>
      {etape < 2 && <p className="ax-aide mt-1">{tr("Délai : 24 à 48 h ouvrées.")}</p>}
    </div>
  );
}

// ─── Onglet « Paiements reçus » (reprise de l'ancienne page Paiements, sans son solde en doublon) ───
const STATUT_PAIEMENT: Record<string, { label: string; ton: Ton }> = {
  pending:   { label: "En attente", ton: "attention" },
  completed: { label: "Payé",       ton: "succes" },
  failed:    { label: "Échoué",     ton: "erreur" },
  refunded:  { label: "Remboursé",  ton: "neutre" },
  refunding: { label: "Remboursement en cours", ton: "attention" },
};
const METHODE_LABEL: Record<string, string> = {
  card: "Carte", mobilemoney: "Mobile Money", banktransfer: "Virement", notchpay: "Paiement en ligne",
  whatsapp_cod: "Paiement à la livraison (WhatsApp)", direct_cod: "Paiement à la livraison", en_attente: "En attente de paiement",
};
function methodeLabel(m: string | null) {
  if (!m) return "—";
  if (m.startsWith("campay:")) return `Campay · ${m.split(":")[1]?.toUpperCase() ?? ""}`;
  if (m.startsWith("cinetpay:")) return `CinetPay · ${m.split(":")[1]?.toUpperCase() ?? ""}`;
  return METHODE_LABEL[m] ?? m;
}
interface PaiementsData {
  commandes: { id: string; numero: string; clientNom: string | null; montantTotal: number; methodePaiement: string | null; paiementStatut: string; createdAt: string; client: { nom: string } | null }[];
  commissions: { id: string; montantCommande: number; montantCommission: number; montantMarchand: number; devise: string; createdAt: string }[];
}

function PaiementsRecus({ devise }: { devise: string }) {
  const tr = useT();
  const [data, setData] = useState<PaiementsData | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const charger = () => {
    setErreur(null); setData(null);
    fetch("/api/wallet/paiements").then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErreur(d.error ?? tr("Les paiements reçus n'ont pas pu être chargés.")); else setData(d);
    }).catch(() => setErreur(tr("Connexion impossible : vérifie ton réseau.")));
  };
  useEffect(charger, []);
  if (erreur) return <div className="p-4"><EtatErreur compact titre={tr(erreur)} onReessayer={charger} /></div>;
  if (!data) return <div className="p-4"><SqueletteListe lignes={4} libelle={tr("Chargement des paiements reçus…")} /></div>;
  const completed = data.commandes.filter(c => c.paiementStatut === "completed");
  const pending = data.commandes.filter(c => c.paiementStatut === "pending");
  const date = (d: string) => new Date(d).toLocaleDateString(tr.loc, { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Paiements en attente", value: String(pending.length) },
          { label: "Total perçu", value: fmt(completed.reduce((s, c) => s + c.montantTotal, 0), devise) },
          { label: "Commissions Axso", value: fmt(data.commissions.reduce((s, c) => s + c.montantCommission, 0), devise) },
        ].map(m => (
          <div key={m.label} className="rounded-carte bg-carte-2 border border-bordure p-3">
            <p className="ax-aide">{tr(m.label)}</p>
            <p className="text-base font-bold text-encre tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>

      {data.commandes.length === 0 ? (
        <EtatVide compact icone={<ArrowDownToLine />} titre={tr("Aucun paiement reçu")}
          texte={tr("Les paiements de tes commandes apparaîtront ici dès ta première vente.")} />
      ) : (
      <div className="overflow-x-auto rounded-carte border border-bordure">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-carte-2 border-b border-bordure">
              {["Référence", "Client", "Montant", "Méthode", "Statut", "Date"].map(h => (
                <th key={h} scope="col" className="text-left text-xs text-doux font-semibold px-4 py-2.5 whitespace-nowrap">{tr(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-bordure">
            {data.commandes.map(cmd => {
              const st = STATUT_PAIEMENT[cmd.paiementStatut] ?? { label: cmd.paiementStatut, ton: "neutre" as Ton };
              return (
                <tr key={cmd.id}>
                  <td className="px-4 py-3 font-mono text-xs text-encre whitespace-nowrap">{cmd.numero}</td>
                  <td className="px-4 py-3 text-encre font-medium whitespace-nowrap">{cmd.client?.nom ?? cmd.clientNom ?? "—"}</td>
                  <td className="px-4 py-3 font-bold text-encre whitespace-nowrap tabular-nums">{fmt(cmd.montantTotal, devise)}</td>
                  <td className="px-4 py-3 text-doux text-xs whitespace-nowrap">{tr(methodeLabel(cmd.methodePaiement))}</td>
                  <td className="px-4 py-3"><Badge ton={st.ton}>{tr(st.label)}</Badge></td>
                  <td className="px-4 py-3 text-doux text-xs whitespace-nowrap">{date(cmd.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      <div className="rounded-carte border border-bordure overflow-hidden">
        <h3 className="px-4 py-3 ax-sous-titre border-b border-bordure">{tr("Commissions Axso")}</h3>
        <div className="divide-y divide-bordure">
          {data.commissions.length === 0 ? (
            <p className="text-center ax-texte-secondaire py-8 px-4">{tr("Aucune commission prélevée pour l'instant : elles apparaissent sur les ventes payées en ligne.")}</p>
          ) : data.commissions.map(c => (
            <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-encre tabular-nums">{fmt(c.montantCommande, c.devise)}</p>
                <p className="ax-aide">{date(c.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-erreur tabular-nums">-{fmt(c.montantCommission, c.devise)}</p>
                <p className="text-xs text-succes tabular-nums">{tr("+{0} net", fmt(c.montantMarchand, c.devise))}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TxIcon({ type }: { type: string }) {
  const map: Record<string, { classes: string; Icon: any }> = {
    CREDIT:        { classes: "bg-succes-fond text-succes",       Icon: ArrowDownToLine  },
    COMMISSION:    { classes: "bg-carte-2 text-doux",             Icon: ShieldCheck      },
    RETRAIT:       { classes: "bg-info-fond text-info",           Icon: ArrowUpFromLine  },
    REMBOURSEMENT: { classes: "bg-attention-fond text-attention", Icon: RefreshCw        },
    LIVREUR:       { classes: "bg-primaire-fond text-attention",  Icon: ArrowUpFromLine  }, // part du livreur (lib/gains-livreur.ts)
  };
  const s = map[type] ?? map["CREDIT"];
  const Icon = s.Icon;
  return (
    <div className={`w-9 h-9 rounded-controle flex items-center justify-center flex-shrink-0 ${s.classes}`} aria-hidden>
      <Icon className="size-4" />
    </div>
  );
}

export default function WalletPage() {
  const tr = useT();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [pays, setPays] = useState<string | null>(null);
  const [boutiques, setBoutiques] = useState<SoldeBoutique[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [showRetrait, setShowRetrait] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"transactions" | "retraits" | "paiements">("transactions");
  const ouvertureAuto = useRef(false);
  // Ancienne page /dashboard/paiements : redirigée ici, sur l'onglet « Paiements reçus ».
  useEffect(() => { if (new URLSearchParams(window.location.search).get("onglet") === "paiements") setTab("paiements"); }, []);

  const [form, setForm] = useState({
    montant: "",
    methode: "mobile_money" as "mobile_money" | "virement_bancaire",
    destinataire: "",
    operateur: "MTN",
    notes: "",
  });

  async function charger() {
    setLoading(true);
    setErreurChargement(false);
    try {
      const res = await fetch("/api/wallet");
      const data = await res.json();
      if (!res.ok || !data.wallet) throw new Error();
      setWallet(data.wallet);
      setBoutiques(data.boutiques ?? []);
      setPays(data.pays ?? null);
    } catch {
      // Pas de solde à 0 affiché à la place d'un vrai montant : on dit que le chargement a échoué.
      setWallet(null);
      setErreurChargement(true);
    }
    finally { setLoading(false); }
  }

  useEffect(() => { charger(); }, []);

  async function soumettrRetrait(e: React.FormEvent) {
    e.preventDefault();
    if (erreurMontant || erreurDestinataire || !form.montant || !form.destinataire.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/retrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, montant: Number(form.montant) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ? tr(data.error) : tr("Le retrait n'a pas pu être demandé. Vérifie le montant et le numéro, puis réessaie.")); return; }
      toast.success(tr("Retrait demandé ! Axso l'envoie sous 24–48h ouvrées et vous prévient dès que c'est fait."));
      setShowRetrait(false);
      setForm({ montant: "", methode: "mobile_money", destinataire: "", operateur: "MTN", notes: "" });
      setTab("retraits"); // le suivi du retrait demandé
      charger();
    } catch {
      toast.error(tr("Connexion impossible : ton retrait n'a pas été demandé. Vérifie ton réseau et réessaie."));
    } finally { setSubmitting(false); }
  }

  const devise = wallet?.devise ?? "XAF";
  // Retirable : le solde hors ventes encore en séquestre 48 h.
  const solde = wallet?.disponible ?? wallet?.solde ?? 0;
  const enAttente = wallet?.enAttente ?? 0;
  // totalRetire compte aussi les retraits pas encore payés (débités dès la demande) : on les sépare.
  const enValidation = wallet?.retraitsEnAttente ?? 0;
  const dejaRetire = Math.max(0, (wallet?.totalRetire ?? 0) - enValidation);
  const MINIMUM_RETRAIT = wallet?.minimumRetrait ?? 1000; // calculé par le serveur dans la devise du wallet
  const montant = Number(form.montant);
  // Mêmes règles que le serveur (lib/wallet.ts), dites avant l'envoi plutôt qu'après.
  const erreurMontant = !form.montant ? null
    : !(montant >= MINIMUM_RETRAIT) ? tr("Le minimum de retrait est de {0}.", fmt(MINIMUM_RETRAIT, devise))
    : montant > solde ? tr("Ce montant dépasse votre solde disponible ({0}).", fmt(solde, devise))
      + ((wallet?.enAttente ?? 0) > 0 && wallet?.liberations?.[0]
        ? " " + tr("{0} sont encore en séquestre 48 h, libérés à partir du {1}.", fmt(wallet.enAttente!, devise),
            new Date(wallet.liberations[0].le).toLocaleString(tr.loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))
        : "")
    : null;
  // Même normalisation que le serveur : indicatif du pays de la boutique.
  const telInternational = form.methode === "mobile_money" ? normaliserTelephone(form.destinataire, pays) : null;
  const erreurDestinataire = !form.destinataire.trim() ? null
    : form.methode === "mobile_money" && !telInternational ? tr("Numéro invalide : vérifie-le, avec l'indicatif de ton pays s'il est à l'étranger.")
    : form.methode === "virement_bancaire" && form.destinataire.trim().length < 10 ? tr("Ce numéro de compte est trop court.")
    : null;

  /** Ouvre le formulaire prérempli : tout le disponible, et le destinataire du dernier retrait (il change rarement). */
  function ouvrirRetrait() {
    const dernier = wallet?.retraits?.[0];
    setForm(f => ({
      ...f,
      montant: f.montant || (solde > 0 ? String(solde) : ""),
      ...(dernier && !f.destinataire ? { methode: dernier.methode === "virement_bancaire" ? "virement_bancaire" : "mobile_money", destinataire: dernier.destinataire, operateur: dernier.operateur ?? f.operateur } : {}),
    }));
    setShowRetrait(true);
  }

  // Lien « Retirer mon argent » du Tableau de bord (?retrait=1) : formulaire ouvert une fois les données chargées.
  useEffect(() => {
    if (loading || !wallet || ouvertureAuto.current) return;
    ouvertureAuto.current = true;
    const url = new URL(window.location.href);
    if (url.searchParams.get("retrait") !== "1") return;
    ouvrirRetrait();
    url.searchParams.delete("retrait");
    window.history.replaceState(null, "", url);
  }, [loading, wallet]);

  return (
    <div className="space-y-5 max-w-5xl">
      <ModuleTutorial moduleKey="wallet" titre={tr("Mon argent")} sousTitre={tr("Ton solde et tes retraits")} steps={WALLET_TUTORIAL_STEPS} />

      <EnTeteModule icon="money" title={tr("Mon argent")} tutoriel="wallet"
        secondaryActions={[{ content: loading ? tr("Actualisation…") : tr("Actualiser"), onAction: charger, disabled: loading }]}
      />

      {loading && !wallet ? (
        <div className="space-y-3" role="status" aria-busy="true">
          <span className="sr-only">{tr("Chargement de ton solde…")}</span>
          <div className="ax-skeleton rounded-carte h-48" />
          <SqueletteListe lignes={3} libelle={tr("Chargement des montants…")} />
        </div>
      ) : erreurChargement || !wallet ? (
        <EtatErreur titre={tr("Ton solde n'a pas pu être chargé")}
          texte={tr("Aucun argent n'est perdu : l'affichage a simplement échoué. Vérifie ta connexion et réessaie.")}
          onReessayer={charger} libelleReessayer={tr("Recharger mon solde")} />
      ) : (
        <>
          {/* ── Wallet card ── */}
          <div className="relative rounded-carte overflow-hidden p-6 sm:p-8 text-white"
            style={{
              background: "linear-gradient(135deg, #1a0e02 0%, #c17f14 45%, #F5A623 75%, #e09010 100%)",
              boxShadow: "0 20px 60px rgba(245,166,35,0.30), 0 4px 16px rgba(0,0,0,0.12)",
            }}>
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-[0.07]"
              style={{ background: "radial-gradient(circle, white, transparent 70%)", transform: "translate(30%,-30%)" }} />
            <div className="absolute bottom-0 left-20 w-48 h-48 rounded-full opacity-[0.06]"
              style={{ background: "radial-gradient(circle, white, transparent 70%)", transform: "translateY(40%)" }} />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-5 opacity-80">
                  <ShieldCheck size={13} />
                  <span className="text-[11px] font-semibold tracking-[0.15em] uppercase">{tr("Wallet Axso · Sécurisé")}</span>
                </div>
                <p className="text-sm opacity-80 mb-1.5">{tr("Disponible")}</p>
                <p className="text-[32px] md:text-[48px] font-black tracking-tight leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {fmt(solde, devise)}
                </p>
                <p className="text-[12.5px] opacity-80 mt-2">{tr("Tu peux le retirer maintenant.")}</p>
              </div>
              <div className="flex flex-col sm:items-end gap-2.5">
                <Bouton variante="sombre" taille="grand" onClick={ouvrirRetrait} icone={<ArrowUpFromLine className="size-4" aria-hidden />}>
                  {tr("Retirer mon argent")}
                </Bouton>
                <p className="text-xs opacity-80 sm:text-right">{tr("Minimum {0}", fmt(MINIMUM_RETRAIT, devise))}</p>
              </div>
            </div>
          </div>

          {/* ── Toutes mes boutiques : total par devise + solde de chacune ── */}
          {boutiques.length > 1 && (
            <div className="ax-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <h2 className="ax-sous-titre">{tr("Toutes mes boutiques")}</h2>
                <p className="ax-texte-secondaire">
                  {tr("Total :")}{" "}
                  {Object.entries(boutiques.reduce<Record<string, number>>((acc, b) => ({ ...acc, [b.devise]: (acc[b.devise] ?? 0) + b.solde }), {}))
                    .map(([dev, total]) => fmt(total, dev)).join(" + ")}
                </p>
              </div>
              <div className="divide-y divide-bordure">
                {boutiques.map(b => (
                  <div key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm text-encre truncate">{tr(b.nomBoutique)}</span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-encre tabular-nums">{fmt(b.solde, b.devise)}</span>
                      {b.active
                        ? <Badge>{tr("affichée")}</Badge>
                        : <Bouton variante="fantome" taille="compact" onClick={() => basculerBoutique(b.id, "/dashboard/wallet")}>{tr("Ouvrir")}</Bouton>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Les autres montants, une phrase chacun ── */}
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-3">
            {[
              { Icon: ShieldCheck, label: "En attente", val: enAttente, ton: "bg-info-fond text-info",
                aide: wallet?.liberations?.[0]
                  ? tr("Ventes payées en ligne gardées 48 h (protection de l'acheteur). Libération à partir du {0}.", new Date(wallet.liberations[0].le).toLocaleString(tr.loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))
                  : tr("Ventes payées en ligne gardées 48 h (protection de l'acheteur), puis disponibles.") },
              ...(enValidation > 0 ? [{ Icon: Clock, label: "En cours de validation", val: enValidation, ton: "bg-attention-fond text-attention",
                aide: tr("Retraits demandés : Axso les valide et les envoie sous 24 à 48 h ouvrées.") }] : []),
              { Icon: ArrowUpFromLine, label: "Déjà retiré", val: dejaRetire, ton: "bg-primaire-fond text-attention",
                aide: tr("Argent déjà envoyé sur ton Mobile Money ou ton compte.") },
            ].map((s, i) => {
              const Icon = s.Icon;
              return (
                <div key={i} className="ax-card p-5">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <h2 className="ax-label">{tr(s.label)}</h2>
                    <div className={`w-8 h-8 rounded-controle flex items-center justify-center flex-shrink-0 ${s.ton}`} aria-hidden>
                      <Icon className="size-3.5" strokeWidth={1.8} />
                    </div>
                  </div>
                  <p className="text-[20px] font-bold text-encre leading-none tabular-nums tracking-tight">
                    {fmt(s.val, devise)}
                  </p>
                  <p className="ax-aide mt-2">{s.aide}</p>
                </div>
              );
            })}
          </div>

          {/* ── Séquestre expliqué ── */}
          <Alerte ton="info" titre={tr("Pourquoi une partie est en attente ?")}>
            <p>
              {tr("Chaque vente payée en ligne reste")}{" "}<strong>{tr("48h en séquestre")}</strong>{" "}{tr("(protection acheteur) : elle apparaît tout de suite en attente, puis passe sur votre solde disponible, retirable. Un remboursement pendant ce délai reprend d'abord l'argent en attente. Vous recevez l'intégralité de votre prix : la commission Axso et les frais de paiement (10 %, ou 13 % pour un produit numérique) sont ajoutés au prix payé par le client.")}
            </p>
          </Alerte>

          {/* ── Onglets + historique ── */}
          <div className="ax-card overflow-hidden">
            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-bordure" role="tablist" aria-label={tr("Historique")}>
              {([
                { key: "transactions", label: `Transactions (${wallet?.transactions?.length ?? 0})` },
                { key: "retraits",     label: `Retraits (${wallet?.retraits?.length ?? 0})` },
                { key: "paiements",    label: "Paiements reçus" },
              ] as const).map(t => (
                <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                  className={`flex-1 min-h-12 px-3 whitespace-nowrap text-sm font-semibold transition-colors border-b-2 ${tab === t.key ? "text-encre border-primaire" : "text-doux border-transparent hover:text-encre"}`}>
                  {tr(t.label)}
                </button>
              ))}
            </div>

            {/* Transactions */}
            {tab === "transactions" && (
              <div className="divide-y divide-bordure">
                {(wallet?.transactions ?? []).length === 0 ? (
                  <EtatVide className="m-4" icone={<Wallet />} titre={tr("Aucune transaction pour le moment")}
                    texte={tr("Les mouvements apparaîtront ici après tes premières ventes payées en ligne.")} />
                ) : (wallet?.transactions ?? []).map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
                    <TxIcon type={tx.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-encre truncate">{tr(tx.description)}</p>
                      {tx.reference && <p className="text-xs text-doux font-mono truncate">{tx.reference}</p>}
                      <p className="text-xs text-doux">
                        {new Date(tx.createdAt).toLocaleDateString(tr.loc, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold tabular-nums ${tx.montant >= 0 ? "text-succes" : "text-erreur"}`}>
                        {tx.montant >= 0 ? "+" : ""}{fmt(tx.montant, tx.devise)}
                      </p>
                      <div className="mt-0.5"><StatutBadge statut={tx.statut} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "paiements" && <PaiementsRecus devise={devise} />}

            {/* Retraits */}
            {tab === "retraits" && (
              <div className="divide-y divide-bordure">
                {(wallet?.retraits ?? []).length === 0 ? (
                  <EtatVide className="m-4" icone={<ArrowUpFromLine />} titre={tr("Aucun retrait effectué")}
                    texte={tr("Quand ton solde disponible atteint le minimum, retire-le vers ton Mobile Money ou ton compte.")}>
                    {solde >= MINIMUM_RETRAIT && <Bouton onClick={ouvrirRetrait}>{tr("Retirer mon argent")}</Bouton>}
                  </EtatVide>
                ) : (wallet?.retraits ?? []).map(r => (
                  <div key={r.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-controle flex items-center justify-center flex-shrink-0 ${r.methode === "mobile_money" ? "bg-attention-fond text-attention" : "bg-info-fond text-info"}`} aria-hidden>
                      {r.methode === "mobile_money" ? <Smartphone className="size-4" /> : <Building2 className="size-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-encre">
                        {r.methode === "mobile_money" ? tr("Mobile Money · {0}", r.operateur ?? "") : tr("Virement bancaire")}
                      </p>
                      <p className="text-xs text-doux truncate">{tr(r.destinataire)}</p>
                      <p className="text-xs text-doux">
                        {new Date(r.createdAt).toLocaleDateString(tr.loc, { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-encre tabular-nums">-{fmt(r.montant, r.devise)}</p>
                      {r.statut === "echoue" && <div className="mt-0.5"><StatutBadge statut={r.statut} /></div>}
                      {r.reference && <p className="text-xs text-doux font-mono mt-0.5">{r.reference}</p>}
                    </div>
                    </div>
                    {r.statut === "echoue"
                      ? <p className="text-xs font-medium text-erreur mt-2 pl-12">{tr("Le retrait n'a pas pu être fait : le montant a été remis sur ton solde.")}</p>
                      : <SuiviRetrait statut={r.statut} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Retrait : le bouton final récapitule le montant (c'est la confirmation) ── */}
      <Modale ouverte={showRetrait} onFermer={() => setShowRetrait(false)} verrouillee={submitting}
        titre={tr("Retirer mon argent")}
        description={<>{tr("Disponible :")}{" "}<strong className="text-encre tabular-nums">{fmt(solde, devise)}</strong></>}
        actions={<>
          <Bouton variante="secondaire" onClick={() => setShowRetrait(false)} disabled={submitting}>{tr("Annuler")}</Bouton>
          <Bouton type="submit" form="form-retrait" charge={submitting} texteCharge={tr("Traitement…")}
            disabled={!form.montant || !form.destinataire.trim() || !!erreurMontant || !!erreurDestinataire}
            icone={<ArrowUpFromLine className="size-4" aria-hidden />}>
            {montant > 0 ? tr("Confirmer le retrait de {0}", fmt(montant, devise)) : tr("Confirmer le retrait")}
          </Bouton>
        </>}>
        <form id="form-retrait" onSubmit={soumettrRetrait} className="space-y-champs">
          <div>
            <Saisie label={tr("Montant")} required type="number" inputMode="numeric" autoFocus
              value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
              placeholder={tr("Ex: 50 000")} min={MINIMUM_RETRAIT} max={solde}
              suffixe={tr(devise)} classeChamp="text-lg font-bold tabular-nums"
              aide={tr("Minimum {0}.", fmt(MINIMUM_RETRAIT, devise))} erreur={erreurMontant ?? undefined} />
            <div className="flex gap-2 mt-2" role="group" aria-label={tr("Part du solde disponible")}>
              {[25, 50, 75, 100].map(pct => (
                <Bouton key={pct} variante="secondaire" taille="compact" className="flex-1"
                  onClick={() => setForm(f => ({ ...f, montant: String(Math.floor(solde * pct / 100)) }))}>
                  {pct}%
                </Bouton>
              ))}
            </div>
          </div>

          <fieldset>
            <legend className="ax-libelle mb-2">{tr("Méthode")}</legend>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: "mobile_money",     label: "Mobile Money",  Icon: Smartphone, desc: "MTN, Orange, Wave…" },
                { id: "virement_bancaire", label: "Virement",      Icon: Building2,  desc: "IBAN / Compte" },
              ].map(m => {
                const Icon = m.Icon;
                const active = form.methode === m.id;
                return (
                  <button key={m.id} type="button" aria-pressed={active}
                    onClick={() => setForm(f => ({ ...f, methode: m.id as any }))}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-carte border-2 transition-colors ${active ? "border-primaire bg-primaire-fond" : "border-bordure bg-carte-2 hover:border-bordure-forte"}`}>
                    <Icon className={`size-5 ${active ? "text-attention" : "text-doux"}`} aria-hidden />
                    <span className={`text-sm font-bold ${active ? "text-encre" : "text-doux"}`}>{tr(m.label)}</span>
                    <span className="text-xs text-doux">{tr(m.desc)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {form.methode === "mobile_money" && (
            <fieldset>
              <legend className="ax-libelle mb-2">{tr("Opérateur")}</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {OPERATEURS.map(op => (
                  <button key={op.id} type="button" aria-pressed={form.operateur === op.id}
                    onClick={() => setForm(f => ({ ...f, operateur: op.id }))}
                    className={`min-h-10 px-2 text-xs font-bold rounded-controle border transition-colors ${form.operateur === op.id ? "border-primaire bg-primaire-fond text-encre" : "border-bordure bg-carte-2 text-doux hover:border-bordure-forte"}`}>
                    {tr(op.label)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <Saisie required
            label={form.methode === "mobile_money" ? tr("Numéro Mobile Money") : tr("IBAN ou numéro de compte")}
            type={form.methode === "mobile_money" ? "tel" : "text"}
            inputMode={form.methode === "mobile_money" ? "tel" : "text"}
            autoComplete={form.methode === "mobile_money" ? "tel" : "off"}
            value={form.destinataire}
            onChange={e => setForm(f => ({ ...f, destinataire: e.target.value }))}
            placeholder={form.methode === "mobile_money" ? exempleTelephone(pays) : tr("FR76 XXXX XXXX XXXX")}
            erreur={erreurDestinataire ?? undefined}
            aide={!erreurDestinataire && telInternational ? tr("Envoi vers le {0}", telInternational) : undefined} />

          <details>
            <summary className="min-h-10 flex items-center text-sm font-semibold text-doux cursor-pointer select-none">{tr("Ajouter une note (facultatif)")}</summary>
            <Champ label={tr("Note")} labelMasque>
              {(a) => <input {...a} type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder={tr("Ex: Virement mensuel…")} className={CLASSE_SAISIE} />}
            </Champ>
          </details>

          {form.montant && montant > 0 && !erreurMontant && (
            <div className="bg-carte-2 border border-bordure rounded-carte p-4 space-y-2">
              {[
                { label: "Montant demandé", value: fmt(Number(form.montant), devise) },
                // Aucun frais retenu sur un retrait (lib/wallet.ts débite exactement le montant demandé).
                { label: "Frais de retrait", value: fmt(0, devise) },
                { label: "Solde après retrait", value: fmt(solde - montant, devise) },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-doux">{tr(row.label)}</span>
                  <span className="font-semibold text-encre tabular-nums">{tr(row.value)}</span>
                </div>
              ))}
              <div className="border-t border-bordure pt-2 flex justify-between text-sm font-bold">
                <span className="text-encre">{tr("Vous recevrez")}</span>
                <span className="text-encre tabular-nums">{fmt(Number(form.montant), devise)}</span>
              </div>
            </div>
          )}

          <Alerte ton="attention" titre={tr("Validation par Axso sous 24 à 48 h ouvrées. Le montant quitte ton solde dès la demande ; tu es prévenu quand il est payé.")} />
        </form>
      </Modale>
    </div>
  );
}
