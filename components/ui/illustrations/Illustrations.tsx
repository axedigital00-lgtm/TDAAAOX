// Illustrations en aplats (§4.3), reprises du prototype (objet ILL, fonctions art*). Décoratives : aria-hidden.
// États vides : 200×150. Vignettes du fil d'accueil : 280×140 en « slice » (rognées, jamais déformées).
// Écartées (D3, D5) : Mobile Money, cartes-cadeaux, B2B, blog, catalogues — à ajouter le jour où l'écran existe.
type P = { className?: string };

const Vide = ({ className, children }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 200 150" width={200} height={150} className={className} aria-hidden focusable="false">{children}</svg>
);
const Vignette = ({ className, children }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 280 140" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden focusable="false">{children}</svg>
);
const Lignes = ({ x, y, l }: { x: number; y: number; l: number[] }) => (
  <>{l.map((w, i) => <rect key={i} x={x} y={y + i * 10} width={w} height={5} rx={2} fill="#e3e3e3" />)}</>
);

/* ── États vides ─────────────────────────────────────────────── */

export const IllustrationBrouillons = (p: P) => (
  <Vide {...p}>
    <ellipse cx={100} cy={128} rx={62} ry={8} fill="#f1f1f1" /><circle cx={100} cy={74} r={52} fill="#e8f5ef" />
    <rect x={66} y={30} width={68} height={88} rx={6} fill="#fff" stroke="#d4d4d4" /><rect x={76} y={44} width={30} height={22} rx={3} fill="#EBA900" />
    <Lignes x={76} y={74} l={[48, 40, 44]} /><path d="M58 120a42 18 0 0 1 84 0" fill="#1f7a55" />
  </Vide>
);

export const IllustrationBonsDeCommande = (p: P) => (
  <Vide {...p}>
    <circle cx={112} cy={72} r={46} fill="#fbecd0" /><rect x={58} y={34} width={58} height={80} rx={5} fill="#fff" stroke="#d4d4d4" />
    {[48, 66, 84].map((y) => <g key={y}><rect x={68} y={y} width={10} height={10} rx={2} fill="#1f7a55" /><rect x={84} y={y + 2} width={24} height={5} rx={2} fill="#e3e3e3" /></g>)}
    <path d="M118 52l30 10v44l-30-10z" fill="#e2a44a" /><path d="M118 52l-14 8v44l14-8z" fill="#c98a2e" />
  </Vide>
);

export const IllustrationTransferts = (p: P) => (
  <Vide {...p}>
    <circle cx={100} cy={72} r={50} fill="#f1f1f1" />
    <rect x={40} y={46} width={44} height={56} rx={6} fill="#fff" stroke="#d4d4d4" /><rect x={116} y={46} width={44} height={56} rx={6} fill="#fff" stroke="#d4d4d4" />
    <path d="M50 62h24v26H50z" fill="#9aa5b1" /><path d="M126 62h24v26h-24z" fill="#4fb3a9" />
    <circle cx={100} cy={74} r={15} fill="#1f7a55" /><path d="M93 74h13M101 69l5 5-5 5" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    <circle cx={62} cy={40} r={5} fill="#1f7a55" /><circle cx={138} cy={40} r={5} fill="#1f7a55" />
  </Vide>
);

export const IllustrationCampagnes = (p: P) => (
  <Vide {...p}>
    <path d="M58 42h34l8 8h42v62H58z" fill="#4fb3a9" />
    <circle cx={96} cy={84} r={16} fill="none" stroke="#fff" strokeWidth={7} strokeDasharray="60 40" />
    <rect x={118} y={74} width={16} height={4} rx={2} fill="#fff" /><rect x={118} y={84} width={12} height={4} rx={2} fill="#fff" />
  </Vide>
);

export const IllustrationCommandes = (p: P) => (
  <Vide {...p}>
    <ellipse cx={100} cy={128} rx={62} ry={8} fill="#f1f1f1" /><circle cx={100} cy={72} r={50} fill="#fbecd0" />
    <path d="M100 32l40 18v46l-40 18-40-18V50z" fill="#e2a44a" /><path d="M100 32l40 18-40 18-40-18z" fill="#f0c27a" />
    <path d="M100 68v46" stroke="#c98a2e" strokeWidth={2} /><rect x={110} y={80} width={20} height={12} rx={2} fill="#fff" transform="skewY(-24)" />
  </Vide>
);

export const IllustrationProduits = (p: P) => (
  <Vide {...p}>
    <ellipse cx={100} cy={128} rx={62} ry={8} fill="#f1f1f1" /><circle cx={100} cy={72} r={50} fill="#e8f5ef" />
    <path d="M104 34h30a4 4 0 0 1 4 4v30l-40 40a4 4 0 0 1-6 0L64 80a4 4 0 0 1 0-6z" fill="#4fb3a9" />
    <path d="M104 34h30a4 4 0 0 1 4 4v30L118 88z" fill="#2f8f85" /><circle cx={124} cy={48} r={6} fill="#fff" />
  </Vide>
);

export const IllustrationClients = (p: P) => (
  <Vide {...p}>
    <circle cx={100} cy={72} r={50} fill="#f1f1f1" />
    <circle cx={80} cy={62} r={14} fill="#4fb3a9" /><path d="M56 110c2-18 12-28 24-28s22 10 24 28z" fill="#2f8f85" />
    <circle cx={124} cy={58} r={16} fill="#EBA900" /><path d="M96 112c2-20 14-32 28-32s26 12 28 32z" fill="#1f7a55" />
  </Vide>
);

export const IllustrationFichiers = (p: P) => (
  <Vide {...p}>
    <circle cx={100} cy={72} r={50} fill="#e8f5ef" />
    <rect x={74} y={30} width={60} height={78} rx={6} fill="#e3e3e3" transform="rotate(-8 104 69)" />
    <rect x={70} y={36} width={60} height={78} rx={6} fill="#fff" stroke="#d4d4d4" />
    <rect x={80} y={48} width={40} height={30} rx={3} fill="#cfe7f5" /><path d="M80 78l12-12 9 9 6-6 13 9z" fill="#4fb3a9" />
    <Lignes x={80} y={88} l={[40, 30]} />
  </Vide>
);

export const IllustrationReductions = (p: P) => (
  <Vide {...p}>
    <ellipse cx={100} cy={128} rx={62} ry={8} fill="#f1f1f1" /><circle cx={100} cy={72} r={50} fill="#fbecd0" />
    <path d="M100 26l9 7 11-1 4 10 10 4-1 11 7 9-7 9 1 11-10 4-4 10-11-1-9 7-9-7-11 1-4-10-10-4 1-11-7-9 7-9-1-11 10-4 4-10 11 1z" fill="#EBA900" />
    <path d="M88 86l24-24" stroke="#0A1A33" strokeWidth={4} strokeLinecap="round" /><circle cx={89} cy={63} r={5} fill="#0A1A33" /><circle cx={111} cy={85} r={5} fill="#0A1A33" />
  </Vide>
);

export const IllustrationGenerique = (p: P) => (
  <Vide {...p}>
    <ellipse cx={100} cy={128} rx={62} ry={8} fill="#f1f1f1" /><circle cx={100} cy={74} r={52} fill="#f1f1f1" />
    <rect x={62} y={40} width={76} height={70} rx={8} fill="#fff" stroke="#d4d4d4" /><rect x={62} y={40} width={76} height={16} rx={8} fill="#e3e3e3" />
    <Lignes x={74} y={68} l={[52, 40, 46]} /><circle cx={136} cy={102} r={12} fill="#1f7a55" />
    <path d="M131 102l4 4 7-7" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" />
  </Vide>
);

/* ── Vignettes du fil d'accueil ─────────────────────────────── */

export const VignetteConversion = (p: P) => (
  <Vignette {...p}>
    <rect width={280} height={140} fill="#fbe3c0" />
    <path d="M40 110c40-40 60 20 110-30s70-10 100-40" stroke="#e8b45a" strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.6} />
    <rect x={38} y={62} width={58} height={54} rx={10} fill="#EBA900" />
    <path d="M52 78h30l-4 16H56z" fill="none" stroke="#0A1A33" strokeWidth={3} strokeLinejoin="round" />
    <circle cx={60} cy={102} r={3} fill="#0A1A33" /><circle cx={76} cy={102} r={3} fill="#0A1A33" />
    <circle cx={222} cy={46} r={24} fill="#EBA900" /><path d="M214 38l18 8-8 2-2 8z" fill="#0A1A33" /><path d="M140 70l14 4-6 3-2 6z" fill="#0A1A33" />
  </Vignette>
);

/** `domaine` : le nom proposé à la boutique (jamais un exemple inventé en production). */
export const VignetteDomaine = ({ domaine, ...p }: P & { domaine: string }) => (
  <Vignette {...p}>
    <rect width={280} height={140} fill="#f3f3f3" /><rect x={48} y={44} width={184} height={36} rx={18} fill="#fff" stroke="#e3e3e3" />
    <text x={140} y={67} textAnchor="middle" fontSize={13} fill="#5b3cc4" fontFamily="var(--font-inter), Inter, sans-serif">{domaine}</text>
    <path d="M196 74l22 22-9 1 6 11-4 2-6-11-7 6z" fill="#1a1a1a" stroke="#fff" strokeWidth={1.5} />
  </Vignette>
);

export const VignetteLivraison = (p: P) => (
  <Vignette {...p}>
    <rect width={280} height={140} fill="#f3f3f3" />
    <g transform="translate(96 24)">
      <path d="M44 0l44 20v52L44 92 0 72V20z" fill="#e3e3e3" /><path d="M44 0l44 20-44 20L0 20z" fill="#fff" stroke="#d4d4d4" /><path d="M44 40v52" stroke="#d4d4d4" />
    </g>
    <g transform="translate(40 76)"><rect width={52} height={30} rx={6} fill="#EBA900" /><circle cx={12} cy={32} r={6} fill="#0A1A33" /><circle cx={40} cy={32} r={6} fill="#0A1A33" /></g>
  </Vignette>
);

export const VignetteWhatsApp = (p: P) => (
  <Vignette {...p}>
    <rect width={280} height={140} fill="#e6f4ea" /><rect x={100} y={16} width={80} height={124} rx={14} fill="#fff" stroke="#cfe3d6" />
    <rect x={110} y={34} width={44} height={16} rx={8} fill="#d9fdd3" /><rect x={126} y={56} width={44} height={16} rx={8} fill="#f1f1f1" />
    <rect x={110} y={78} width={60} height={30} rx={6} fill="#fbe3c0" />
    <circle cx={212} cy={40} r={18} fill="#25d366" /><path d="M204 40l5 5 10-10" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" />
  </Vignette>
);

export const VignetteApplications = (p: P) => (
  <Vignette {...p}>
    <rect width={280} height={140} fill="#f3f3f3" />
    {([[70, 34, "#1a1a1a"], [122, 34, "#EBA900"], [174, 34, "#4fb3a9"], [70, 80, "#2f8f85"], [122, 80, "#0A1A33"], [174, 80, "#e3e3e3"]] as const).map(([x, y, c]) => (
      <rect key={`${x}-${y}`} x={x} y={y} width={40} height={40} rx={10} fill={c} />
    ))}
  </Vignette>
);

export const VignetteCartons = (p: P) => (
  <Vignette {...p}>
    <rect width={280} height={140} fill="#7a3e2b" />
    <rect x={60} y={56} width={74} height={60} fill="#c8915a" /><rect x={60} y={56} width={74} height={10} fill="#b07a45" />
    <rect x={128} y={40} width={88} height={76} fill="#d9a46a" /><rect x={128} y={40} width={88} height={12} fill="#bf8a52" /><rect x={164} y={40} width={14} height={76} fill="#e9c08f" />
  </Vignette>
);
