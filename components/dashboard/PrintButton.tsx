"use client";

import { Printer } from "lucide-react";
import { useT } from "@/components/I18nProvider";

export function PrintButton() {
  const t = useT();
  return (
    <button type="button" onClick={() => window.print()} className="axd-btn">
      <Printer size={13} />{" "}{t("Imprimer / PDF")}
    </button>
  );
}
