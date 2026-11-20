"use client";
// Son des notifications de la plateforme (public/sons/notification.mp3), joué à
// chaque toast. Les nouvelles commandes ont leur propre son (AlerteCommande,
// public/sons/commande.mp3) et Stella le sien (AxiaBulle).
import { useEffect } from "react";

let audio: HTMLAudioElement | null = null;
let dernier = 0;

function jouerNotification() {
  // Plusieurs toasts d'affilée : un seul son.
  const maintenant = Date.now();
  if (maintenant - dernier < 800) return;
  dernier = maintenant;
  try {
    audio ??= new Audio("/sons/notification.mp3");
    audio.volume = 0.7;
    audio.currentTime = 0;
    audio.play().catch(() => { /* lecture bloquée avant un geste de l'utilisateur */ });
  } catch { /* audio indisponible */ }
}

export function NotificationSound() {
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (
            node instanceof HTMLElement &&
            (node.hasAttribute("data-sonner-toast") ||
              node.querySelector("[data-sonner-toast]"))
          ) {
            jouerNotification();
            return;
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
