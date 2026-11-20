// Famille d'icônes unique de l'admin (MASTERPROMPT §4.2) : trait 1,5 sur une
// grille 20×20. Paths repris de l'objet `P` du prototype de référence.

const PATHS = {
  home: "M3.5 9 10 3.8 16.5 9v7a1 1 0 0 1-1 1H12v-4.5H8V17H4.5a1 1 0 0 1-1-1z",
  orders: "M3 11h4l1 2h4l1-2h4M4.5 4h11l1.5 7v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5z",
  tag: "M10.6 3H16a1 1 0 0 1 1 1v5.4l-7.6 7.6a1 1 0 0 1-1.4 0L3 12a1 1 0 0 1 0-1.4zM13.5 6.5h.01",
  user: "M10 10a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM3.8 17c.6-3 3-4.6 6.2-4.6s5.6 1.6 6.2 4.6",
  users: "M7.5 9.5a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6zM2.5 16c.4-2.6 2.4-4 5-4s4.6 1.4 5 4M13 4.2a2.8 2.8 0 0 1 0 5.4M14.5 12.3c1.6.4 2.7 1.7 3 3.7",
  gauge: "M3.2 14.5a7 7 0 1 1 13.6 0M10 13.5l3.2-3.6M10 13.5h.01",
  discount: "M10 2.6l1.8 1.3 2.2-.2.8 2.1 2.1.8-.2 2.2 1.3 1.8-1.3 1.8.2 2.2-2.1.8-.8 2.1-2.2-.2L10 17.4l-1.8-1.3-2.2.2-.8-2.1-2.1-.8.2-2.2L2 10l1.3-1.8-.2-2.2 2.1-.8.8-2.1 2.2.2zM7.6 12.4l4.8-4.8M7.8 8h.01M12.2 12h.01",
  image: "M3.5 4.5h13v11h-13zM3.5 12.5l3.8-3.8 3.7 3.8 2-2 3.5 3.5M12.8 7.6h.01",
  globe: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM3 10h14M10 3c1.9 2 2.8 4.4 2.8 7s-.9 5-2.8 7c-1.9-2-2.8-4.4-2.8-7S8.1 5 10 3z",
  bars: "M4.5 16v-5M8.2 16V5.5M11.8 16V8.5M15.5 16V4",
  store: "M3.2 7.6 4.6 4h10.8l1.4 3.6v.6a2.1 2.1 0 0 1-3.8 1.2 2.2 2.2 0 0 1-3 .6 2.2 2.2 0 0 1-3-.6A2.1 2.1 0 0 1 3.2 8.2zM4.4 10.4V16h11.2v-5.6M8.4 16v-3.4h3.2V16",
  sparkle: "M10 3.2l1.5 4.2 4.3 1.6-4.3 1.6L10 14.8l-1.5-4.2L4.2 9l4.3-1.6zM15.5 13.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z",
  meta: "M6 6.5c-2 0-3 2-3 3.8C3 12 3.9 13.5 5.4 13.5c2.6 0 4.6-7 7.4-7 1.9 0 3.2 2 3.2 4 0 1.7-.9 3-2.4 3-2.8 0-4.4-7-7.6-7z",
  whatsapp: "M10 3a7 7 0 0 0-6.1 10.4L3 17l3.7-.9A7 7 0 1 0 10 3zM7.6 7.4c.2-.4.5-.4.7-.4h.4c.2 0 .3 0 .4.3l.6 1.4c0 .2 0 .3-.1.4l-.4.5c-.1.1-.1.3 0 .4.6 1 1.4 1.7 2.4 2.2.2.1.3.1.4 0l.5-.6c.1-.1.3-.2.4-.1l1.4.6c.2.1.3.2.3.4 0 .7-.6 1.4-1.3 1.5-2.6.3-5.6-2.6-5.7-5.1 0-.5.2-1.1.4-1.5z",
  gear: "M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8.6 2.8h2.8l.4 2 1.4.8 1.9-.7 1.4 2.4-1.5 1.4v1.6l1.5 1.4-1.4 2.4-1.9-.7-1.4.8-.4 2H8.6l-.4-2-1.4-.8-1.9.7-1.4-2.4 1.5-1.4V9.2L3.5 7.8l1.4-2.4 1.9.7 1.4-.8z",
  search: "M8.8 15a6.2 6.2 0 1 0 0-12.4 6.2 6.2 0 0 0 0 12.4zM13.2 13.2 17 17",
  plus: "M10 4.5v11M4.5 10h11",
  chevronRight: "M8 5l5 5-5 5",
  chevronDown: "M5 8l5 5 5-5",
  chevronLeft: "M12 5l-5 5 5 5",
  chevronUpDown: "M7 8l3-3 3 3M7 12l3 3 3-3",
  x: "M5.5 5.5l9 9M14.5 5.5l-9 9",
  mic: "M10 12.5a2.5 2.5 0 0 0 2.5-2.5V5.5a2.5 2.5 0 0 0-5 0V10a2.5 2.5 0 0 0 2.5 2.5zM5.5 9.5a4.5 4.5 0 0 0 9 0M10 14v2.5",
  wave: "M4 8.5v3M7 6v8M10 4v12M13 6.5v7M16 8.5v3",
  history: "M3.8 10a6.2 6.2 0 1 0 1.8-4.4M3.5 3.8v2.6h2.6M10 6.8V10l2.2 1.4",
  columns: "M3.5 4.5h13v11h-13zM8 4.5v11M12 4.5v11",
  sort: "M6.5 4v12M4 6.5 6.5 4 9 6.5M13.5 16V4M11 13.5l2.5 2.5 2.5-2.5",
  calendar: "M4 5.5h12v10.5H4zM4 9h12M7.5 3.5v3M12.5 3.5v3",
  eye: "M2.8 10s2.6-5 7.2-5 7.2 5 7.2 5-2.6 5-7.2 5-7.2-5-7.2-5zM10 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z",
  bell: "M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.2 1.5H4.3zM8.5 16.8h3",
  export: "M10 12.5V3.5M6.8 6.5 10 3.4l3.2 3.1M4 11.5V16h12v-4.5",
  import: "M10 3.5v9M6.8 9.5 10 12.6l3.2-3.1M4 11.5V16h12v-4.5",
  grid: "M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z",
  info: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 9v4.5M10 6.6h.01",
  checkCircle: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM7 10.2l2 2 4-4.2",
  lock: "M5.5 9h9v7.5h-9zM7.5 9V6.5a2.5 2.5 0 0 1 5 0V9",
  dots: "M5 10h.01M10 10h.01M15 10h.01",
  panel: "M3.5 4.5h13v11h-13zM8 4.5v11",
  box: "M10 2.8 16.5 6v8L10 17.2 3.5 14V6zM3.5 6 10 9.3 16.5 6M10 9.3v7.9",
  truck: "M2.8 5.5h9v8h-9zM11.8 8.5h3l2.4 2.6v2.4h-5.4M6 15.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM14.4 15.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z",
  card: "M3 5.5h14v9H3zM3 8.5h14M6 12h3",
  money: "M3 6h14v8H3zM10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 8.5v3M14.5 8.5v3",
  pin: "M10 17s5.5-4.6 5.5-9a5.5 5.5 0 0 0-11 0c0 4.4 5.5 9 5.5 9zM10 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  receipt: "M5 3h10v14l-2-1.3-1.7 1.3L10 15.7 8.7 17 7 15.7 5 17zM7.5 7h5M7.5 10h5",
  mail: "M3 5h14v10H3zM3.5 5.5 10 10.5l6.5-5",
  language: "M3 5h8M7 3.5V5M4.8 5c.6 2.8 2.6 5 5 6M9.4 5c-.7 3-2.8 5.4-5.4 6.4M10.5 17l3-7.5 3 7.5M11.5 14.5h4",
  shield: "M10 2.8 16 5v4.5c0 3.8-2.6 6.4-6 7.7-3.4-1.3-6-3.9-6-7.7V5z",
  doc: "M5 3h7l3 3v11H5zM12 3v3h3M7.5 10h5M7.5 13h5",
  link: "M8.5 11.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2l-.8.8M11.5 8.5a3 3 0 0 0-4.2 0L5 10.8a3 3 0 0 0 4.2 4.2l.8-.8",
  bolt: "M11 2.8 4.5 11H10l-1 6.2L15.5 9H10z",
  database: "M10 7c3.6 0 6.5-1 6.5-2.3S13.6 2.5 10 2.5 3.5 3.4 3.5 4.7 6.4 7 10 7zM3.5 4.7v10.6C3.5 16.6 6.4 17.5 10 17.5s6.5-.9 6.5-2.2V4.7M3.5 10c0 1.3 2.9 2.3 6.5 2.3s6.5-1 6.5-2.3",
  folder: "M3 5h5l1.5 1.8H17v9H3z",
  menu: "M4 6h12M4 10h12M4 14h12",
  pen: "M12.8 4.2l3 3L7.5 15.5l-3.7.7.7-3.7z",
  external: "M11 4h5v5M16 4l-7 7M14 12v4H4V6h4",
  arrowRight: "M4.5 10h11M11 5.5l4.5 4.5-4.5 4.5",
  arrowUp: "M10 15.5v-11M5.5 9 10 4.5 14.5 9",
  fullscreen: "M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4",
  star: "M10 3l2.1 4.4 4.8.6-3.5 3.3.9 4.8L10 13.8l-4.3 2.3.9-4.8L3.1 8l4.8-.6z",
  flag: "M5 17V3.5M5 4h9l-1.8 3L14 10H5",
  logout: "M8 4H4.5v12H8M12 6.5 15.5 10 12 13.5M15.5 10H7.5",
  help: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8 8a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2v.5M10 13.6h.01",
  monitor: "M3 4.5h14v9H3zM7.5 16.5h5M10 13.5v3",
  wallet: "M3.5 6.5h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-12zM3.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h9v3M13.5 11.5h.01",
  map: "M3 5.5 7.5 3.5l5 2 4.5-2v11l-4.5 2-5-2L3 16.5zM7.5 3.5v11M12.5 5.5v11",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className, title }: { name: IconName; size?: 16 | 18 | 20 | 14; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 20 20" width={size} height={size} className={className}
      fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={title ? undefined : true} role={title ? "img" : undefined} focusable="false"
      style={{ flex: "none" }}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Logo Stella. `surface="dark"` : variante à coiffure claire pour les fonds sombres. */
export function AxiaMark({ size = 22, surface = "light" }: { size?: number; surface?: "light" | "dark" }) {
  return (
    <span className="ax-axia-mark" style={{ width: size, height: size }} aria-hidden>
      <img src={surface === "dark" ? "/brand/axia-mark-dark.png" : "/brand/axia-mark.png"} alt="" width={size} height={size} />
    </span>
  );
}
