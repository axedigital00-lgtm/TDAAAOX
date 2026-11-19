"use client";
// Formulaires (masterprompt §7.10) : Field, TextField, Textarea, Select, Checkbox, Radio, Toggle.
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icones";

const INPUT =
  "w-full rounded-(--radius-md) border border-(--color-border-input) bg-[#fdfdfd] px-2.5 text-[13px] text-(--color-text-strong) outline-none " +
  "transition-[border-color,box-shadow] duration-(--duration-fast) placeholder:text-(--color-text-subdued) " +
  "focus:border-(--color-border-strong) focus:shadow-[0_0_0_1px_var(--color-border-strong)] " +
  "disabled:opacity-45 disabled:cursor-not-allowed aria-invalid:border-(--color-critical) aria-invalid:focus:shadow-[0_0_0_1px_var(--color-critical)]";

export type FieldProps = {
  label: React.ReactNode;
  helpText?: React.ReactNode;
  error?: React.ReactNode;
  /** Masque le libellé à l'écran (reste lu par les lecteurs d'écran). */
  labelHidden?: boolean;
  className?: string;
  /** Reçoit l'id et les attributs d'accessibilité à poser sur le contrôle. */
  children: (a: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }) => React.ReactNode;
};

export function Field({ label, helpText, error, labelHidden, className, children }: FieldProps) {
  const id = useId();
  const describedBy = [error && `${id}-err`, helpText && `${id}-aide`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("block", className)}>
      <label htmlFor={id} className={cn("mb-1 block text-[13px] text-(--color-text-strong)", labelHidden && "sr-only")}>{label}</label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error && (
        <p id={`${id}-err`} className="mt-1 flex items-center gap-1 text-xs text-(--color-critical-text)">
          <Icon name="info" /> {error}
        </p>
      )}
      {helpText && <p id={`${id}-aide`} className="mt-1 text-xs text-(--color-text-secondary)">{helpText}</p>}
    </div>
  );
}

type Shared = { label: React.ReactNode; helpText?: React.ReactNode; error?: React.ReactNode; labelHidden?: boolean; className?: string };

export function TextField({ label, helpText, error, labelHidden, className, ...input }: Shared & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} helpText={helpText} error={error} labelHidden={labelHidden} className={className}>
      {(a) => <input {...input} {...a} className={cn(INPUT, "h-8")} />}
    </Field>
  );
}

export function Textarea({ label, helpText, error, labelHidden, className, ...input }: Shared & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} helpText={helpText} error={error} labelHidden={labelHidden} className={className}>
      {(a) => <textarea {...input} {...a} className={cn(INPUT, "min-h-[72px] resize-y py-1.5")} />}
    </Field>
  );
}

export function Select({ label, helpText, error, labelHidden, className, options, ...input }: Shared & React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string; disabled?: boolean }[] }) {
  return (
    <Field label={label} helpText={helpText} error={error} labelHidden={labelHidden} className={className}>
      {(a) => (
        <div className="relative">
          <select {...input} {...a} className={cn(INPUT, "h-8 appearance-none pr-8")}>
            {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
          </select>
          <Icon name="chevronUpDown" className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-(--color-text-secondary)" />
        </div>
      )}
    </Field>
  );
}

const CHOICE = "peer size-4 shrink-0 appearance-none border-[1.5px] border-(--color-checkbox-border) bg-(--color-surface) transition-colors duration-(--duration-fast) disabled:opacity-45";

/** Case à cocher 16×16 ; `indeterminate` pour la case d'en-tête « tout / rien ». */
export function Checkbox({ label, labelHidden, indeterminate, className, ...input }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label: React.ReactNode; labelHidden?: boolean; indeterminate?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label className={cn("inline-flex items-center gap-2 text-(--color-text-strong)", input.disabled ? "cursor-not-allowed" : "cursor-pointer", className)}>
      <span className="relative inline-grid size-4 place-items-center">
        <input ref={ref} type="checkbox" aria-checked={indeterminate ? "mixed" : undefined} {...input}
          className={cn(CHOICE, "rounded-(--radius-sm) checked:border-(--color-primary) checked:bg-(--color-primary) indeterminate:border-(--color-primary) indeterminate:bg-(--color-primary)")} />
        <svg viewBox="0 0 16 16" className="pointer-events-none absolute hidden size-4 text-white peer-checked:block peer-indeterminate:hidden" aria-hidden>
          <path d="M4 8.5l2.5 2.5L12 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg viewBox="0 0 16 16" className="pointer-events-none absolute hidden size-4 text-white peer-indeterminate:block" aria-hidden>
          <path d="M4.5 8h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <span className={cn(labelHidden && "sr-only")}>{label}</span>
    </label>
  );
}

export function Radio({ label, labelHidden, className, ...input }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label: React.ReactNode; labelHidden?: boolean }) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-(--color-text-strong)", input.disabled ? "cursor-not-allowed" : "cursor-pointer", className)}>
      <input type="radio" {...input} className={cn(CHOICE, "rounded-full checked:border-[5px] checked:border-(--color-primary)")} />
      <span className={cn(labelHidden && "sr-only")}>{label}</span>
    </label>
  );
}

/** Interrupteur 32×18 (role="switch"). `label` est son nom accessible. */
export function Toggle({ checked, onChange, label, labelHidden = true, disabled, className }: { checked: boolean; onChange: (next: boolean) => void; label: string; labelHidden?: boolean; disabled?: boolean; className?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={labelHidden ? label : undefined} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("inline-flex items-center gap-2 disabled:opacity-45 disabled:pointer-events-none", className)}>
      <span className={cn("relative h-[18px] w-8 shrink-0 rounded-full transition-colors duration-150", checked ? "bg-(--color-primary)" : "bg-(--color-toggle-off)")}>
        <span className={cn("absolute top-0.5 size-3.5 rounded-full bg-white transition-[left] duration-150", checked ? "left-4" : "left-0.5")} />
      </span>
      {!labelHidden && <span className="text-(--color-text-strong)">{label}</span>}
    </button>
  );
}
