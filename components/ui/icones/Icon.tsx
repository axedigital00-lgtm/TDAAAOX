import { CHEMINS, type IconName } from "./chemins";

export type { IconName };

/** Icône au trait (une seule famille, §4.2) : 20 px en navigation, 16 px dans le contenu. */
export function Icon({ name, size = 16, className, label }: { name: IconName; size?: 16 | 18 | 20 | 22 | 24; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 20 20" width={size} height={size} className={className}
      fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label}
      style={{ flex: "none" }}
    >
      <path d={CHEMINS[name]} />
    </svg>
  );
}
