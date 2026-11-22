"use client";
import { use } from "react";
import { EditeurDevis } from "@/components/dashboard/commerce/EditeurDevis";

export default function DevisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <EditeurDevis id={use(params).id} />;
}
