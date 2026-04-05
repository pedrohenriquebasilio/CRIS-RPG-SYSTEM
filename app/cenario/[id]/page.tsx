"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiCall } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Map, Users, Trash2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TokenEntity {
  id: string;
  nome: string;
  avatarUrl?: string | null;
  hpAtual: number;
  hpMax: number;
  isMob?: boolean;
}

interface SceneTokenData {
  id: string;
  sceneId: string;
  characterId?: string | null;
  npcId?: string | null;
  xPct: number;
  yPct: number;
  character?: TokenEntity | null;
  npc?: (Omit<TokenEntity, "avatarUrl" | "isMob"> ) | null;
}

interface SceneData {
  id: string;
  nome: string;
  imageUrl: string;
  isActive: boolean;
  campaignId: string;
  tokens?: SceneTokenData[];
}

interface CharOption { id: string; nome: string; avatarUrl?: string | null; isMob: boolean }
interface NpcOption { id: string; nome: string }

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SceneViewPage() {
  const { id: sceneId } = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const backendToken = (session?.user as any)?.backendToken as string | undefined;
  const userId = (session?.user as any)?.backendUserId as string | undefined;

  const [scene, setScene] = useState<SceneData | null>(null);
  const [tokens, setTokens] = useState<SceneTokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMaster, setIsMaster] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [characters, setCharacters] = useState<CharOption[]>([]);
  const [npcs, setNpcs] = useState<NpcOption[]>([]);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  // ── Load scene ──
  useEffect(() => {
    if (!backendToken || !sceneId) return;
    apiCall<SceneData>(`/scenes/view/${sceneId}`, backendToken)
      .then(data => {
        setScene(data);
        setTokens(data.tokens ?? []);
        setLoading(false);
      })
      .catch(() => { setError("Cenário não encontrado."); setLoading(false); });
  }, [backendToken, sceneId]);

  // ── Check master + load entities ──
  useEffect(() => {
    if (!backendToken || !scene?.campaignId || !userId) return;
    apiCall<{ masterId: string }>(`/campaigns/${scene.campaignId}`, backendToken)
      .then(camp => {
        const master = camp.masterId === userId;
        setIsMaster(master);
        if (master) {
          apiCall<CharOption[]>(`/characters/campaign/${scene.campaignId}`, backendToken).then(setCharacters).catch(() => {});
          apiCall<NpcOption[]>(`/npcs/campaign/${scene.campaignId}`, backendToken).then(setNpcs).catch(() => {});
        }
      })
      .catch(() => {});
  }, [backendToken, scene?.campaignId, userId]);

  // ── WebSocket ──
  useEffect(() => {
    if (!backendToken || !scene?.campaignId) return;
    const socket = getSocket(backendToken);
    socket.emit("joinCampaign", { campaignId: scene.campaignId });

    const onTokenUpdated = (token: SceneTokenData) => {
      setTokens(prev => {
        const idx = prev.findIndex(t => t.id === token.id);
        return idx >= 0 ? prev.map(t => t.id === token.id ? token : t) : [...prev, token];
      });
    };
    const onTokenRemoved = (data: { tokenId: string }) => {
      setTokens(prev => prev.filter(t => t.id !== data.tokenId));
    };
    const onDeactivated = () => setScene(prev => prev ? { ...prev, isActive: false } : prev);
    const onActivated = (data: { id: string; nome: string; imageUrl: string }) => {
      if (data.id === sceneId) setScene(prev => prev ? { ...prev, isActive: true } : prev);
    };

    socket.on("sceneTokenUpdated", onTokenUpdated);
    socket.on("sceneTokenRemoved", onTokenRemoved);
    socket.on("sceneDeactivated", onDeactivated);
    socket.on("sceneActivated", onActivated);
    return () => {
      socket.off("sceneTokenUpdated", onTokenUpdated);
      socket.off("sceneTokenRemoved", onTokenRemoved);
      socket.off("sceneDeactivated", onDeactivated);
      socket.off("sceneActivated", onActivated);
    };
  }, [backendToken, scene?.campaignId, sceneId]);

  // ── Drag handlers ──
  const handlePointerDown = useCallback((tokenId: string) => {
    if (!isMaster) return;
    setDraggingId(tokenId);
  }, [isMaster]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingId || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    // Optimistic local update
    setTokens(prev => prev.map(t => t.id === draggingId ? { ...t, xPct, yPct } : t));
  }, [draggingId]);

  const handlePointerUp = useCallback(async () => {
    if (!draggingId || !backendToken || !sceneId) return;
    const token = tokens.find(t => t.id === draggingId);
    if (token) {
      apiCall(`/scenes/tokens/${sceneId}/${draggingId}`, backendToken, {
        method: "PATCH",
        body: { xPct: token.xPct, yPct: token.yPct },
      }).catch(() => {});
    }
    setDraggingId(null);
  }, [draggingId, tokens, backendToken, sceneId]);

  // ── Place / Remove ──
  const handlePlace = async (type: "character" | "npc", entityId: string) => {
    if (!backendToken || !sceneId) return;
    try {
      const body = type === "character" ? { characterId: entityId } : { npcId: entityId };
      const token = await apiCall<SceneTokenData>(`/scenes/tokens/${sceneId}`, backendToken, { method: "POST", body });
      setTokens(prev => {
        const idx = prev.findIndex(t => t.id === token.id);
        return idx >= 0 ? prev.map(t => t.id === token.id ? token : t) : [...prev, token];
      });
    } catch { /* ignore */ }
  };

  const handleRemove = async (tokenId: string) => {
    if (!backendToken || !sceneId) return;
    try {
      await apiCall(`/scenes/tokens/${sceneId}/${tokenId}`, backendToken, { method: "DELETE" });
      setTokens(prev => prev.filter(t => t.id !== tokenId));
    } catch { /* ignore */ }
  };

  // ── Render ──

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
  const placedIds = new Set(tokens.map(t => t.characterId ?? t.npcId));

  return (
    <div className="min-h-screen bg-black flex flex-col select-none">
      {/* Header */}
      <div className="h-[48px] bg-[rgba(10,10,10,0.95)] border-b border-[#1a1a1a] flex items-center px-5 shrink-0 gap-3">
        <Map size={14} className="text-brand" />
        <span className="font-cinzel text-[12px] font-bold text-text-near tracking-[0.1em]">{scene.nome}</span>
        {scene.isActive && (
          <span className="text-[8px] text-brand-light bg-brand/20 px-2 py-0.5 rounded-sm font-bold tracking-[0.1em] uppercase">
            Ao vivo
          </span>
        )}
        <div className="flex-1" />
        {isMaster && (
          <button
            onClick={() => setShowAddPanel(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] font-bold tracking-[0.08em] cursor-pointer transition-colors border ${
              showAddPanel
                ? "bg-brand/20 border-brand text-brand-light"
                : "bg-transparent border-[#2a2a2a] text-text-faint hover:text-text-base hover:border-[#3a3a3a]"
            }`}
          >
            <Users size={12} /> Tokens
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Scene area */}
        <div
          className="flex-1 flex items-center justify-center overflow-auto p-4 relative"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div ref={imageRef} className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${BACKEND}${scene.imageUrl}`}
              alt={scene.nome}
              className="max-w-full max-h-[calc(100vh-48px-32px)] object-contain rounded"
              style={{ boxShadow: "0 0 60px rgba(0,0,0,0.8)" }}
              draggable={false}
            />

            {/* Tokens overlay */}
            {tokens.map(t => {
              const entity = t.character ?? t.npc;
              if (!entity) return null;
              const isNpc = !!t.npcId;
              const isMob = (t.character as TokenEntity)?.isMob ?? false;
              const borderColor = isNpc ? "#F59E0B" : isMob ? "#EF4444" : "#A78BFA";
              const avatarUrl = (t.character as TokenEntity)?.avatarUrl;

              return (
                <div
                  key={t.id}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `${t.xPct}%`,
                    top: `${t.yPct}%`,
                    transform: "translate(-50%, -50%)",
                    cursor: isMaster ? "grab" : "default",
                    zIndex: draggingId === t.id ? 50 : 10,
                    transition: draggingId === t.id ? "none" : "left 0.3s ease, top 0.3s ease",
                  }}
                  onPointerDown={e => { e.preventDefault(); handlePointerDown(t.id); }}
                >
                  {/* Token circle */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                    style={{
                      background: "#18181B",
                      border: `2.5px solid ${borderColor}`,
                      boxShadow: `0 0 8px ${borderColor}44, 0 2px 8px rgba(0,0,0,0.6)`,
                    }}
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${BACKEND}${avatarUrl}`}
                        alt={entity.nome}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <span
                        className="text-sm font-bold font-cinzel"
                        style={{ color: borderColor }}
                      >
                        {entity.nome.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* HP bar */}
                  <div className="w-8 h-[3px] bg-[#3f3f46] rounded-full mt-0.5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, (entity.hpAtual / entity.hpMax) * 100))}%`,
                        background: entity.hpAtual / entity.hpMax > 0.5 ? "#22C55E" : entity.hpAtual / entity.hpMax > 0.25 ? "#F59E0B" : "#EF4444",
                      }}
                    />
                  </div>

                  {/* Name */}
                  <span className="text-[8px] text-[#A1A1AA] mt-px whitespace-nowrap max-w-[60px] overflow-hidden text-ellipsis text-center"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
                  >
                    {entity.nome}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Token Panel (master only) */}
        {showAddPanel && isMaster && (
          <div className="w-[220px] bg-[rgba(10,10,10,0.98)] border-l border-[#1a1a1a] overflow-y-auto p-4 shrink-0">
            <h3 className="text-[10px] font-bold text-text-base tracking-[0.12em] uppercase font-cinzel mb-3">Tokens no Cenário</h3>

            {/* Currently placed */}
            {tokens.length > 0 && (
              <div className="mb-4">
                <div className="text-[8px] text-text-ghost uppercase tracking-[0.1em] mb-1.5">No mapa</div>
                <div className="flex flex-col gap-1">
                  {tokens.map(t => {
                    const name = t.character?.nome ?? t.npc?.nome ?? "?";
                    return (
                      <div key={t.id} className="flex items-center justify-between px-2 py-1.5 bg-[#111] border border-[#1f1f1f] rounded-sm">
                        <span className="text-[10px] text-text-base">{name}</span>
                        <button
                          onClick={() => handleRemove(t.id)}
                          className="bg-transparent border-none cursor-pointer text-text-ghost p-0.5 hover:text-red-400 transition-colors"
                        ><Trash2 size={10} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add characters */}
            <div className="text-[8px] text-text-ghost uppercase tracking-[0.1em] mb-1.5">Personagens</div>
            {characters.filter(c => !placedIds.has(c.id)).length === 0 ? (
              <p className="text-[9px] text-text-ghost mb-3">Todos no cenário</p>
            ) : (
              <div className="flex flex-col gap-1 mb-3">
                {characters.filter(c => !placedIds.has(c.id)).map(c => (
                  <button key={c.id} onClick={() => handlePlace("character", c.id)}
                    className="text-left px-2 py-1.5 bg-[#111] border border-[#1f1f1f] rounded-sm text-[10px] text-text-base cursor-pointer hover:border-brand transition-colors">
                    {c.nome} {c.isMob && <span className="text-[8px] text-red-400">(mob)</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Add NPCs */}
            <div className="text-[8px] text-text-ghost uppercase tracking-[0.1em] mb-1.5">NPCs</div>
            {npcs.filter(n => !placedIds.has(n.id)).length === 0 ? (
              <p className="text-[9px] text-text-ghost">Todos no cenário</p>
            ) : (
              <div className="flex flex-col gap-1">
                {npcs.filter(n => !placedIds.has(n.id)).map(n => (
                  <button key={n.id} onClick={() => handlePlace("npc", n.id)}
                    className="text-left px-2 py-1.5 bg-[#111] border border-[#1f1f1f] rounded-sm text-[10px] text-text-base cursor-pointer hover:border-amber-500 transition-colors">
                    {n.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
