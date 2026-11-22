"use client";

import { usePathname } from "next/navigation";
import { visuelEspace } from "@/lib/visuels-espaces";
import "./visuel-espace.css";

export function VisuelEspace() {
  const pathname = usePathname();
  const src = visuelEspace(pathname);
  return src ? <img key={src} className="ax-photo-espace" src={src} alt=""
    width={1280} height={260} loading="lazy" decoding="async" /> : null;
}
