"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window { fbq?: any; _fbq?: any; }
}

interface Props { pixelIds: string[]; }

/** Charge le Meta Pixel (un ou plusieurs IDs) et déclenche PageView à chaque changement de route ; chaque événement part vers tous les pixels. */
export function MetaPixel({ pixelIds }: Props) {
  const cle = pixelIds.join(",");
  const pathname = usePathname();
  const initRef = useRef(false);

  useEffect(() => {
    if (!pixelIds.length || typeof window === "undefined") return;

    if (!initRef.current) {
      initRef.current = true;
      (function (f: any, b: any, e: string, v: string) {
        if (f.fbq) return;
        const n: any = (f.fbq = function (...args: any[]) {
          n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
        });
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
        const t = b.createElement(e); t.async = true; t.src = v;
        const s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      for (const id of pixelIds) window.fbq("init", id);
    }
    window.fbq?.("track", "PageView");
  }, [cle, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pixelIds.length) return null;
  return (
    <noscript>
      {pixelIds.map((id) => (
        <img key={id} height="1" width="1" style={{ display: "none" }} alt=""
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`} />
      ))}
    </noscript>
  );
}

/** Helper à appeler depuis n'importe où côté client pour déclencher un événement standard */
export function trackPixelEvent(event: string, params?: Record<string, any>) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", event, params);
}
