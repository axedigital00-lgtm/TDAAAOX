// Mini-films de motion design en CSS et SVG : aucune vidéo, aucun script, lancés seulement à l'écran
// (attribut data-joue posé par MoteurMotion). Les valeurs affichées sont des exemples.
import { Check, Coffee, Droplet, Layers, MapPin, Package, Search, ShoppingBag, Sparkles, Truck } from "lucide-react";

type T = (s: string) => string;
export type TypeScene = "vitrine" | "whatsapp" | "caisse" | "stock" | "analyses" | "stella" | "livraison" | "promo" | "marches" | "paiement" | "gros" | "domaine" | "flux" | "compte" | "catalogue" | "taxes";

function Vitrine({ t, photo }: Illustration) {
  return <div className="axs-nav">
    <header><i /><i /><i /><span>votre-boutique.axsoafrica.com</span></header>
    <div className="axs-v-hero"><img src={photo} alt="" loading="lazy" /><b>{t("Nouvelle collection")}</b></div>
    <div className="axs-v-grille">{[ShoppingBag, Coffee, Layers].map((Icon, i) => <figure key={i}><Icon aria-hidden size={20} /><figcaption /></figure>)}</div>
    <span className="axs-curseur" />
  </div>;
}
function WhatsApp({ t }: { t: T }) {
  return <div className="axs-chat">
    <header><span className="axs-rond" /><b>{t("Votre boutique")}</b><small>{t("en ligne")}</small></header>
    <p className="c1">{t("Bonjour, ce sac est-il disponible ?")}</p>
    <p className="c2 moi">{t("Oui ! Il reste 3 pièces. Je vous prépare la commande ?")}</p>
    <p className="c3">{t("Oui, livraison à Douala")}</p>
    <div className="c4 axs-bon"><ShoppingBag aria-hidden size={24} /><div><b>{t("Commande confirmée")}</b><small>35 100 FCFA · {t("à la livraison")}</small></div><Check size={16} /></div>
  </div>;
}
function Caisse({ t }: { t: T }) {
  return <div className="axs-caisse"><div className="axs-scan"><span /><Coffee aria-hidden size={40} /></div>
    <div className="axs-ticket"><small>{t("Ticket de caisse")}</small>
      {[["Café en grains", "6 500"], ["Huile d’argan", "7 500"], ["Tissu kente", "18 000"]].map(([a, p], i) => <div key={a} style={{ "--i": i } as React.CSSProperties}><span>{t(a)}</span><b>{p}</b></div>)}
      <footer><span>{t("Total")}</span><b>32 000 FCFA</b></footer></div></div>;
}
function Stock({ t }: { t: T }) {
  return <div className="axs-stock">{[["Boutique", 76], ["Entrepôt", 52], ["En livraison", 28]].map(([n, v], i) => <div key={n} style={{ "--v": `${v}%`, "--i": i } as React.CSSProperties}><span>{t(String(n))}</span><i><b /></i><strong>{v}</strong></div>)}
    <p><Package size={15} />{t("Un seul stock, partout à jour")}</p></div>;
}
function Analyses({ t }: { t: T }) {
  return <div className="axs-graph"><small>{t("Exemple de ventes")}</small><strong>1 284 000 <em>FCFA</em></strong>
    <svg viewBox="0 0 320 120" preserveAspectRatio="none" aria-hidden><defs><linearGradient id="axsg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#EBA900" stopOpacity=".32" /><stop offset="1" stopColor="#EBA900" stopOpacity="0" /></linearGradient></defs>
      <path className="aire" d="M0 96 C30 90 44 70 72 74 S120 92 150 62 S204 56 232 36 S286 28 320 8 V120 H0Z" fill="url(#axsg)" />
      <path className="ligne" pathLength={1} d="M0 96 C30 90 44 70 72 74 S120 92 150 62 S204 56 232 36 S286 28 320 8" fill="none" stroke="#EBA900" strokeWidth="2.4" /></svg>
    <div className="axs-barres">{[38, 62, 46, 80, 58, 92, 72].map((h, i) => <i key={i} style={{ "--h": `${h}%`, "--i": i } as React.CSSProperties} />)}</div></div>;
}
function Stella({ t }: { t: T }) {
  return <div className="axs-stella"><header><img src="/brand/axia-mark.png" alt="" width={30} height={30} loading="lazy" /><b>Stella</b><Sparkles size={14} /></header>
    <p className="q">{t("Quels produits relancer cette semaine ?")}</p>
    <p className="r"><span>{t("Votre café se vend bien mais il reste peu de stock. Je vous prépare un réassort et un message pour vos clients fidèles ?")}</span></p>
    <div className="a"><button tabIndex={-1} type="button">{t("Préparer")}</button><button tabIndex={-1} type="button">{t("Plus tard")}</button></div></div>;
}
function Livraison({ t }: { t: T }) {
  return <div className="axs-route"><svg viewBox="0 0 340 170" aria-hidden><path d="M20 140 C70 140 70 60 130 62 S190 118 240 96 S290 36 322 30" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="9" strokeLinecap="round" /><path className="trace" pathLength={1} d="M20 140 C70 140 70 60 130 62 S190 118 240 96 S290 36 322 30" fill="none" stroke="#EBA900" strokeWidth="3" strokeLinecap="round" /><circle r="7" fill="#fff"><animateMotion dur="6s" repeatCount="indefinite" path="M20 140 C70 140 70 60 130 62 S190 118 240 96 S290 36 322 30" /></circle></svg>
    <span className="dep"><Package size={14} />{t("Préparé")}</span><span className="mil"><Truck size={14} />{t("En route")}</span><span className="arr"><MapPin size={14} />{t("Remis")}</span></div>;
}
function Promo({ t }: { t: T }) {
  return <div className="axs-promo"><div className="code"><small>{t("Code promo")}</small><b>BIENVENUE10</b></div><div className="prix"><s>20 000</s><strong>18 000 <em>FCFA</em></strong></div><span className="pastille">−10 %</span></div>;
}
function Marches({ t }: { t: T }) {
  return <div className="axs-devises"><small>{t("Le même produit, partout")}</small><div className="rail">{[["cm", "18 500 XAF"], ["sn", "18 500 XOF"], ["ng", "48 000 NGN"], ["fr", "28,20 EUR"], ["cm", "18 500 XAF"]].map(([d, p], i) => <div key={i}><img src={`/brand/drapeaux/${d}.png`} alt="" loading="lazy" /><b>{p}</b></div>)}</div></div>;
}
function Paiement({ t }: { t: T }) {
  return <div className="axs-paie"><div className="carte"><small>{t("À régler à la réception")}</small><strong>24 900 FCFA</strong><div className="logos"><img src="/brand/partenaires/orange-money.png" alt="Orange Money" loading="lazy" /><img src="/brand/partenaires/mtn-momo.png" alt="MTN MoMo" loading="lazy" /></div></div><p className="ok"><Check size={15} />{t("Commission AXSO : 0 FCFA")}</p></div>;
}
function Gros({ t }: { t: T }) {
  return <div className="axs-gros"><small>{t("Prix dégressifs")}</small>{[["1", "5 000", 100], ["12", "4 500", 78], ["50", "4 000", 56]].map(([q, p, l], i) => <div key={String(q)} style={{ "--l": `${l}%`, "--i": i } as React.CSSProperties}><span>{t("dès")} {q}</span><i /><b>{p}</b></div>)}<p>{t("Prix appliqué automatiquement au panier")}</p></div>;
}
function Domaine({ t }: { t: T }) {
  return <div className="axs-domaine"><div className="barre"><Search size={14} /><span>mamarque.com</span></div>{["Enregistrement DNS détecté", "Propriété vérifiée", "Certificat HTTPS actif"].map((l, i) => <p key={l} style={{ "--i": i } as React.CSSProperties}><Check size={14} />{t(l)}</p>)}</div>;
}
function Flux({ t }: { t: T }) {
  return <div className="axs-flux">{[["Quand", "Commande payée"], ["Si", "Total ≥ 100 000 FCFA"], ["Alors", "Classer le client VIP"]].map(([a, b], i) => <div key={a} style={{ "--i": i } as React.CSSProperties}><small>{t(a)}</small><b>{t(b)}</b></div>)}</div>;
}
function Compte({ t }: { t: T }) {
  return <div className="axs-compte"><header><span className="axs-rond" /><div><b>{t("Mon compte")}</b><small>{t("3 commandes")}</small></div></header>{[["#A95J4F", "Livrée"], ["#K21P8D", "En route"], ["#M07Q3C", "Préparée"]].map(([n, s], i) => <div key={n} style={{ "--i": i } as React.CSSProperties}><span>{n}</span><b>{t(s)}</b></div>)}</div>;
}
function Catalogue({ t }: { t: T }) {
  return <div className="axs-cat">{([[Layers, "Tissu kente", "18 000"], [Droplet, "Huile d’argan", "7 500"], [Coffee, "Café en grains", "6 500"], [ShoppingBag, "Cabas raphia", "39 000"]] as const).map(([Icon, n, p], i) => <figure key={n} style={{ "--i": i } as React.CSSProperties}><Icon aria-hidden size={24} /><figcaption><span>{t(n)}</span><b>{p}</b></figcaption></figure>)}</div>;
}
function Taxes({ t }: { t: T }) {
  return <div className="axs-facture"><small>{t("Facture")} FAC-2026-014</small>{[["Sous-total HT", "100 000"], ["TVA 19,25 %", "19 250"]].map(([a, b], i) => <div key={a} style={{ "--i": i } as React.CSSProperties}><span>{t(a)}</span><b>{b}</b></div>)}<footer><span>{t("Total TTC")}</span><b>119 250 FCFA</b></footer></div>;
}

type Illustration = { t: T; photo: string };

const SCENES: Record<TypeScene, (p: Illustration) => React.ReactNode> = {
  vitrine: Vitrine, whatsapp: WhatsApp, caisse: Caisse, stock: Stock, analyses: Analyses, stella: Stella, livraison: Livraison, promo: Promo,
  marches: Marches, paiement: Paiement, gros: Gros, domaine: Domaine, flux: Flux, compte: Compte, catalogue: Catalogue, taxes: Taxes,
};

export function Scene({ type, t, grande, photo }: { type: TypeScene; t: T; grande?: boolean; photo: string }) {
  const Composant = SCENES[type];
  return <div className={`axs axs--${type}${grande ? " axs--grande" : ""}`} role="img" aria-label={t("Animation d’illustration, valeurs d’exemple")}>{type !== "vitrine" && <img className="axs-editorial" src={photo} alt="" loading="lazy" />}<div className="axs-lueur" aria-hidden /><div aria-hidden className="axs-contenu"><Composant t={t} photo={photo} /></div></div>;
}
