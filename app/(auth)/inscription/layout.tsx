import type { Metadata } from "next";
import { seoPage } from "@/lib/seo";

export const metadata: Metadata = seoPage("/inscription");

export default function InscriptionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
