"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api";
import { Map } from "lucide-react";

interface CampaignItem {
  id: string;
  name: string;
}

export default function GamePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const backendToken = (session?.user as any)?.backendToken as string | undefined;

  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!backendToken) return;
    apiCall<CampaignItem[]>("/campaigns", backendToken)
      .then(setCampaigns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [backendToken]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen pt-[68px] bg-bg-dark flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[68px] bg-bg-dark px-6 py-8">
      <div className="max-w-[600px] mx-auto">
        <h1 className="font-cinzel text-lg font-bold text-text-base tracking-[0.1em] mb-6 flex items-center gap-3">
          <Map size={20} className="text-brand" />
          Game — Selecionar Campanha
        </h1>

        {campaigns.length === 0 ? (
          <p className="text-text-faint text-sm text-center py-10">Nenhuma campanha encontrada.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {campaigns.map(c => (
              <button
                key={c.id}
                onClick={() => router.push(`/game/${c.id}`)}
                className="w-full text-left px-5 py-4 bg-bg-surface border border-border rounded-sm cursor-pointer transition-all duration-150 hover:border-brand hover:bg-[rgba(124,58,237,0.06)]"
              >
                <span className="text-sm font-semibold text-text-base">{c.name}</span>
                <span className="block text-[10px] text-text-faint mt-0.5">Entrar no mapa da campanha</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
