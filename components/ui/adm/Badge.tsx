// Badge de statut (masterprompt §7.2). Le texte porte le sens ; la couleur et la pastille le renforcent.
import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "attention" | "warning" | "critical" | "info" | "neutral";
export type BadgeProgress = "none" | "incomplete" | "partial" | "complete";

const TONES: Record<BadgeTone, string> = {
  success: "bg-(--badge-success-bg) text-(--badge-success-text)",
  attention: "bg-(--badge-attention-bg) text-(--badge-attention-text)",
  warning: "bg-(--badge-warning-bg) text-(--badge-warning-text)",
  critical: "bg-(--badge-critical-bg) text-(--badge-critical-text)",
  info: "bg-(--badge-info-bg) text-(--badge-info-text)",
  neutral: "bg-(--badge-neutral-bg) text-(--badge-neutral-text)",
};

const PROGRESS: Record<Exclude<BadgeProgress, "none">, string> = {
  incomplete: "",
  partial: "bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]",
  complete: "bg-current",
};

export function Badge({ tone = "neutral", progress = "none", size = "md", className, children }: { tone?: BadgeTone; progress?: BadgeProgress; size?: "md" | "sm"; className?: string; children: React.ReactNode }) {
  return (
    <span data-tone={tone} className={cn(
      "inline-flex items-center gap-1 whitespace-nowrap rounded-(--radius-md) font-[550]",
      size === "md" ? "h-5 px-2 text-xs" : "h-[18px] px-1.5 text-[11px]", TONES[tone], className,
    )}>
      {progress !== "none" && <span data-progress={progress} aria-hidden className={cn("size-2 shrink-0 rounded-full border-[1.5px] border-current", PROGRESS[progress])} />}
      {children}
    </span>
  );
}
