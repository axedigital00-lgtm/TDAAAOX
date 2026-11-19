// Styles partagés des fiches produit (nouveau, [id]) au visuel du kit adm (masterprompt §7.3, §7.10).
// Même rendu que les champs de components/ui/adm/Form.tsx, pour les champs encore écrits à la main.
export const CHAMP =
  "w-full min-h-8 rounded-(--radius-md) border border-(--color-border-input) bg-[#fdfdfd] px-2.5 py-1.5 text-[13px] text-(--color-text-strong) outline-none " +
  "transition-[border-color,box-shadow] duration-(--duration-fast) placeholder:text-(--color-text-subdued) " +
  "focus:border-(--color-border-strong) focus:shadow-[0_0_0_1px_var(--color-border-strong)]";

/** Carte de section (fond blanc, rayon 12 px, ombre de carte). */
export const CARTE = "rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card) p-4";
