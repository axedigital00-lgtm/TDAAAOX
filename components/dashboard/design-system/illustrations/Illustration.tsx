import { ILL, artConversion, artMomo, artDomain, artShip, artCatalog, artApps, artBoxes } from "./svg";

export type EmptyIllustration = keyof typeof ILL;
const FEED = { conversion: artConversion, momo: artMomo, domain: artDomain, ship: artShip, catalog: artCatalog, apps: artApps, boxes: artBoxes } as const;
export type FeedIllustration = keyof typeof FEED;

/** Illustration d'état vide, 200×150 (§7.7). */
export function EmptyArt({ name }: { name: EmptyIllustration }) {
  return <div className="ax-empty-art" aria-hidden dangerouslySetInnerHTML={{ __html: ILL[name] }} />;
}

/** Vignette du fil d'accueil, 280×140 en `slice` (§8.1). */
export function FeedArt({ name, domaine }: { name: FeedIllustration; /** Texte affiché dans la vignette « domaine ». */ domaine?: string }) {
  let svg: string = FEED[name]();
  if (domaine) svg = svg.replace("maisonndolo.cm", domaine.replace(/[<>&"]/g, ""));
  return <div className="ax-feed-art" aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />;
}
