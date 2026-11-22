"use client";
// Alertes, son, push et Stella : chargés après l'affichage pour ne pas ralentir la navigation.
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const NotificationSound = dynamic(() => import("@/components/ui/NotificationSound").then((m) => m.NotificationSound), { ssr: false });
const AlerteCommande = dynamic(() => import("@/components/dashboard/AlerteCommande").then((m) => m.AlerteCommande), { ssr: false });
const ActivationPush = dynamic(() => import("@/components/ActivationPush").then((m) => m.ActivationPush), { ssr: false });
const AxiaBulle = dynamic(() => import("@/components/dashboard/AxiaBulle").then((m) => m.AxiaBulle), { ssr: false });

export function ExtrasDashboard() {
  const [pret, setPret] = useState(false);
  useEffect(() => {
    const go = () => setPret(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(go, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(go, 1200);
    return () => clearTimeout(id);
  }, []);
  if (!pret) return null;
  return <><NotificationSound /><AlerteCommande /><ActivationPush espace="dashboard" /><AxiaBulle /></>;
}
