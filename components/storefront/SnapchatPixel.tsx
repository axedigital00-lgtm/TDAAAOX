"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window { snaptr?: any; }
}

interface Props { pixelIds: string[]; }

/** Charge le Snapchat Pixel et déclenche une page view à chaque changement de route */
export function SnapchatPixel({ pixelIds }: Props) {
  const cle = pixelIds.join(",");
  const pathname = usePathname();
  const initRef = useRef(false);

  useEffect(() => {
    if (!pixelIds.length || typeof window === "undefined") return;

    if (!initRef.current) {
      initRef.current = true;
      (function (w: any, d: Document, src: string) {
        if (w.snaptr) return;
        const snaptr: any = (w.snaptr = function (...args: any[]) {
          snaptr.handleRequest ? snaptr.handleRequest.apply(snaptr, args) : snaptr.queue.push(args);
        });
        snaptr.queue = [];
        const script = d.createElement("script");
        script.async = true;
        script.src = src;
        const first = d.getElementsByTagName("script")[0];
        first.parentNode?.insertBefore(script, first);
      })(window, document, "https://sc-static.net/scevent.min.js");
      for (const id of pixelIds) window.snaptr("init", id);
    }
    window.snaptr?.("track", "PAGE_VIEW");
  }, [cle, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export function trackSnapchatEvent(event: string, params?: Record<string, any>) {
  if (typeof window === "undefined" || !window.snaptr) return;
  window.snaptr("track", event, params);
}
