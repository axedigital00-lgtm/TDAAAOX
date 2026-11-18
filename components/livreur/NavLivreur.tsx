"use client";
// Navigation de l'espace livreur : barre du bas (mobile) ou liens d'en-tête (PC).
// Montre la page active ; « Se déconnecter » ferme vraiment la session (avant : simple lien vers /connexion).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Home, List, LogOut } from "lucide-react";
import { useT } from "@/components/I18nProvider";

const LIENS = [
  { href: "/livreur", label: "Accueil", Icon: Home },
  { href: "/livreur/commandes", label: "Mes livraisons", Icon: List },
];

export function NavLivreur({ variante }: { variante: "bas" | "haut" }) {
  const t = useT();
  const chemin = usePathname();
  // La fiche d'une course appartient à « Mes livraisons ».
  const actif = (href: string) => href === "/livreur" ? chemin === "/livreur" : chemin.startsWith("/livreur/command");
  const quitter = () => signOut({ callbackUrl: "/connexion" });

  if (variante === "haut") return (
    <nav aria-label={t("Navigation livreur")} className="hidden lg:flex items-center gap-1 text-sm">
      {LIENS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={actif(href) ? "page" : undefined}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors hover:bg-white/5 ${actif(href) ? "text-[#F5A623] bg-white/5" : "text-gray-400 hover:text-[#F5A623]"}`}>
          <Icon size={16} />{t(label)}
        </Link>
      ))}
      <button type="button" onClick={quitter} className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors">
        <LogOut size={16} />{t("Se déconnecter")}
      </button>
    </nav>
  );

  return (
    <nav aria-label={t("Navigation livreur")} className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
      <div className="max-w-2xl mx-auto px-2 grid grid-cols-3">
        {LIENS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} aria-current={actif(href) ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 min-h-14 py-2 transition-colors ${actif(href) ? "text-[#F5A623]" : "text-gray-400 hover:text-[#F5A623]"}`}>
            <Icon size={20} />
            <span className="text-xs">{t(label)}</span>
          </Link>
        ))}
        <button type="button" onClick={quitter} className="flex flex-col items-center justify-center gap-1 min-h-14 py-2 text-gray-400 hover:text-red-400 transition-colors">
          <LogOut size={20} />
          <span className="text-xs">{t("Se déconnecter")}</span>
        </button>
      </div>
    </nav>
  );
}
