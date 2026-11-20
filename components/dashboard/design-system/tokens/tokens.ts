// Export typé des tokens (MASTERPROMPT §3) : références aux variables CSS de
// tokens.css, pour les styles inline et les SVG (graphiques, illustrations).

export const color = {
  frame: "var(--color-frame)",
  surface: "var(--color-surface)",
  surfaceSecondary: "var(--color-surface-secondary)",
  surfaceTertiary: "var(--color-surface-tertiary)",
  border: "var(--color-border)",
  borderSecondary: "var(--color-border-secondary)",
  text: "var(--color-text)",
  textStrong: "var(--color-text-strong)",
  textSecondary: "var(--color-text-secondary)",
  textSubdued: "var(--color-text-subdued)",
  link: "var(--color-link)",
  criticalText: "var(--color-critical-text)",
  brand: "var(--color-brand)",
  brandInk: "var(--color-brand-ink)",
  live: "var(--color-live)",
  notification: "var(--color-notification)",
} as const;

export const chart = {
  primary: "var(--chart-primary)",
  compare: "var(--chart-compare)",
  cyan: "var(--chart-cyan)",
  violet: "var(--chart-violet)",
  grid: "var(--chart-grid)",
  axisText: "var(--chart-axis-text)",
  funnel: ["var(--chart-funnel-1)", "var(--chart-funnel-2)", "var(--chart-funnel-3)"],
  mapLand: "var(--map-land)",
  mapSea: "var(--map-sea)",
} as const;

export const space = {
  0: "var(--space-0)", 50: "var(--space-050)", 100: "var(--space-100)", 150: "var(--space-150)",
  200: "var(--space-200)", 300: "var(--space-300)", 400: "var(--space-400)", 500: "var(--space-500)",
  600: "var(--space-600)", 800: "var(--space-800)", 1000: "var(--space-1000)", 1200: "var(--space-1200)",
  1600: "var(--space-1600)",
} as const;

export const radius = {
  sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)", xl: "var(--radius-xl)",
  "2xl": "var(--radius-2xl)", "3xl": "var(--radius-3xl)", full: "var(--radius-full)",
} as const;

export const breakpoints = { xs: 480, sm: 820, md: 1040, lg: 1440 } as const;

export type Tone = "success" | "attention" | "warning" | "critical" | "info" | "neutral";
