"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiCall } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Map } from "lucide-react";

interface SceneData {
  id: string;
  nome: string;
  imageUrl: string;
  isActive: boolean;
  campaignId: string;
}

export default function SceneViewPage() {
  const { id: sceneId } = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const backendToken = (session?.user as any)?.backendToken as string | undefined;

  const [scene, setScene] = useState<SceneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!backendToken || !sceneId) return;
    // Fetch scene by listing all scenes from campaigns the user has access to
    // We need a direct endpoint — let's use a simple approach: try fetching via scene ID
    // The backend doesn't have a direct /scenes/:id endpoint, so we'll add a query approach
    // For now, we embed the scene data in the URL or use a lookup
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/scenes/view/${sceneId}`, {
      headers: { Authorization: `Bearer ${backendToken}` },
    })
      .then(async res => {
        if (!res.ok) throw new Error("Cenário não encontrado");
        return res.json() as Promise<SceneData>;
      })
      .then(data => { setScene(data); setLoading(false); })
      .catch(() => { setError("Cenário não encontrado ou sem permissão."); setLoading(false); });
  }, [backendToken, sceneId]);

  // Listen for scene deactivation
  useEffect(() => {
    if (!backendToken || !scene?.campaignId) return;
    const socket = getSocket(backendToken);
    socket.emit("joinCampaign", { campaignId: scene.campaignId });

    const onDeactivated = () => setScene(prev => prev ? { ...prev, isActive: false } : prev);
    const onActivated = (data: { id: string; nome: string; imageUrl: string }) => {
      if (data.id === sceneId) {
        setScene(prev => prev ? { ...prev, isActive: true, nome: data.nome, imageUrl: data.imageUrl } : prev);
      }
    };

    socket.on("sceneDeactivated", onDeactivated);
    socket.on("sceneActivated", onActivated);
    return () => {
      socket.off("sceneDeactivated", onDeactivated);
      socket.off("sceneActivated", onActivated);
    };
  }, [backendToken, scene?.campaignId, sceneId]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !scene) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center flex-col gap-3">
        <Map size={32} className="text-text-ghost" />
        <p className="text-text-faint text-sm">{error || "Cenário não encontrado."}</p>
      </div>
    );
  }

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="h-[48px] bg-[rgba(10,10,10,0.95)] border-b border-[#1a1a1a] flex items-center px-5 shrink-0">
        <Map size={14} className="text-brand mr-2" />
        <span className="font-cinzel text-[12px] font-bold text-text-near tracking-[0.1em]">{scene.nome}</span>
        {scene.isActive && (
          <span className="ml-3 text-[8px] text-brand-light bg-brand/20 px-2 py-0.5 rounded-sm font-bold tracking-[0.1em] uppercase">
            Ao vivo
          </span>
        )}
      </div>

      {/* Scene image */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${BACKEND}${scene.imageUrl}`}
          alt={scene.nome}
          className="max-w-full max-h-full object-contain rounded"
          style={{ boxShadow: "0 0 60px rgba(0,0,0,0.8)" }}
        />
      </div>
    </div>
  );
}
