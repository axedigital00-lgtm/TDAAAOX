"use client";
import { useParams } from "next/navigation";
import { SuiviCommande } from "@/components/tracking/SuiviCommande";

export default function TrackingPage() {
  const { token, slug } = useParams<{ token: string; slug: string }>();
  return <SuiviCommande key={token} token={token} slug={slug} url={`/api/tracking/${encodeURIComponent(token)}`}/>;
}
