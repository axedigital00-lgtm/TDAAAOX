"use client"

import { usePathname } from "next/navigation"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  // Admin marchand refondu (§7.12) : toasts centrés à 76 px du bas, au-dessus du dock AXIA.
  const adm = usePathname()?.startsWith("/dashboard")
  return (
    <Sonner
      // L'interface n'a pas de mode sombre (pas de ThemeProvider) : en « system », les
      // notifications passaient en noir sur un téléphone réglé en sombre, au milieu d'écrans clairs.
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
      {...(adm && { position: "bottom-center" as const, offset: 76, mobileOffset: 76 })}
    />
  )
}

export { Toaster }
