"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useT } from "@/components/I18nProvider";

export function BoutonDeconnexion({ className }: { className?: string }) {
  const t = useT();
  return (
    <button onClick={() => signOut({ callbackUrl: "/connexion" })} className={className}>
      <LogOut size={17} />{t("Se déconnecter")}
    </button>
  );
}
