"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiCall } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Map, Plus, Minus, Paintbrush, MousePointer, Users, Trash2 } from "lucide-react";
import type { TokenData, MapData, Tool, MapScene } from "./MapScene";
import { createMapScene } from "./MapScene";

// ─── Sub-types for entity lists ──────────────────────────────────────────────

interface CharacterOption {
  id: string;
  nome: string;
  avatarUrl?: string | null;
  isMob: boolean;
}

interface NpcOption {
  id: string;
  nome: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GameMap({ campaignId, backendToken, userId }: {
  campaignId: string;
  backendToken: string;
  userId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MapScene | null>(null);

  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tool, setTool] = useState<Tool>("select");
  const [isMaster, setIsMaster] = useState(false);
  const [showAddToken, setShowAddToken] = useState(false);
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [npcs, setNpcs] = useState<NpcOption[]>([]);
  const [zoom, setZoom] = useState(1);
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<string | null>(null);

  // ── Load map data ──
  useEffect(() => {
    if (!backendToken) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await apiCall<MapData>(`/game-map/${campaignId}`, backendToken);
        if (!cancelled) { setMapData(data); setLoading(false); }
      } catch {
        try {
          const camp = await apiCall<{ masterId: string }>(`/campaigns/${campaignId}`, backendToken);
          if (camp.masterId === userId) {
            const created = await apiCall<MapData>(`/game-map/${campaignId}`, backendToken, { method: "POST", body: { width: 30, height: 30 } });
            if (!cancelled) { setMapData(created); setIsMaster(true); }
          } else {
            if (!cancelled) setError("O mestre ainda não criou o mapa para esta campanha.");
          }
        } catch {
          if (!cancelled) setError("Erro ao carregar campanha.");
        }
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [backendToken, campaignId, userId]);

  // Check if master + load entities
  useEffect(() => {
    if (!backendToken) return;
    apiCall<{ masterId: string }>(`/campaigns/${campaignId}`, backendToken)
      .then(camp => {
        setIsMaster(camp.masterId === userId);
        apiCall<CharacterOption[]>(`/characters/campaign/${campaignId}`, backendToken).then(setCharacters).catch(() => {});
        apiCall<NpcOption[]>(`/npcs/campaign/${campaignId}`, backendToken).then(setNpcs).catch(() => {});
      })
      .catch(() => {});
  }, [backendToken, campaignId, userId]);

  // ── WebSocket ──
  useEffect(() => {
    if (!backendToken || !campaignId) return;
    const socket = getSocket(backendToken);
    socket.emit("joinCampaign", { campaignId });

    const onTokenMoved = (position: TokenData) => {
      setMapData(prev => {
        if (!prev) return prev;
        const idx = prev.positions.findIndex(p => p.id === position.id);
        const newPositions = idx >= 0
          ? prev.positions.map(p => p.id === position.id ? position : p)
          : [...prev.positions, position];
        return { ...prev, positions: newPositions };
      });
    };

    const onTileUpdated = (data: { x: number; y: number; tileType: number }) => {
      setMapData(prev => {
        if (!prev) return prev;
        const newTiles = prev.tiles.map(row => [...row]);
        newTiles[data.y][data.x] = data.tileType;
        return { ...prev, tiles: newTiles };
      });
    };

    socket.on("tokenMoved", onTokenMoved);
    socket.on("tileUpdated", onTileUpdated);
    return () => {
      socket.off("tokenMoved", onTokenMoved);
      socket.off("tileUpdated", onTileUpdated);
      socket.emit("leaveCampaign", { campaignId });
    };
  }, [backendToken, campaignId]);

  // ── Init Phaser (dynamic import) ──
  useEffect(() => {
    if (!mapData || !containerRef.current || gameRef.current) return;

    let destroyed = false;

    (async () => {
      const Phaser = await import("phaser");

      if (destroyed || !containerRef.current) return;

      const scene = createMapScene(Phaser, mapData, backendToken, campaignId, isMaster, {
        onSelectToken: setSelectedToken,
        onDistanceChange: setDistanceInfo,
      });
      sceneRef.current = scene;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        backgroundColor: "#0a0a0a",
        scene,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      };

      gameRef.current = new Phaser.Game(config);
    })();

    return () => {
      destroyed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData !== null]);

  // ── Sync state → Phaser ──
  useEffect(() => { if (sceneRef.current && mapData) sceneRef.current.syncFromReact(mapData); }, [mapData]);
  useEffect(() => { if (sceneRef.current) sceneRef.current.currentTool = tool; }, [tool]);
  useEffect(() => { if (sceneRef.current) sceneRef.current.isMaster = isMaster; }, [isMaster]);

  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => {
      const next = Math.max(0.3, Math.min(3, prev + delta));
      sceneRef.current?.cameras?.main?.setZoom(next);
      return next;
    });
  }, []);

  const handlePlaceToken = async (type: "character" | "npc", entityId: string) => {
    try {
      const body = type === "character" ? { characterId: entityId, x: 0, y: 0 } : { npcId: entityId, x: 0, y: 0 };
      const position = await apiCall<TokenData>(`/game-map/${campaignId}/token`, backendToken, { method: "POST", body });
      setMapData(prev => {
        if (!prev) return prev;
        const idx = prev.positions.findIndex(p => p.id === position.id);
        const positions = idx >= 0
          ? prev.positions.map(p => p.id === position.id ? position : p)
          : [...prev.positions, position];
        return { ...prev, positions };
      });
      setShowAddToken(false);
    } catch { /* ignore */ }
  };

  const handleRemoveToken = async (positionId: string) => {
    try {
      await apiCall(`/game-map/${campaignId}/token/${positionId}`, backendToken, { method: "DELETE" });
      setMapData(prev => prev ? { ...prev, positions: prev.positions.filter(p => p.id !== positionId) } : prev);
      setSelectedToken(null);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="h-screen pt-[68px] bg-bg-dark flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen pt-[68px] bg-bg-dark flex items-center justify-center">
        <div className="text-center">
          <Map size={32} className="text-text-ghost mx-auto mb-3" />
          <p className="text-text-faint text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const alreadyPlaced = new Set(mapData?.positions.map(p => p.characterId ?? p.npcId) ?? []);

  return (
    <div className="h-screen pt-[68px] bg-bg-dark flex">
      {/* ── Toolbar ── */}
      <div className="w-[52px] bg-bg-surface border-r border-border flex flex-col items-center py-3 gap-1 shrink-0">
        <ToolBtn icon={<MousePointer size={16} />} active={tool === "select"} onClick={() => setTool("select")} title="Selecionar / Mover" />
        {isMaster && (
          <>
            <ToolBtn icon={<Paintbrush size={16} />} active={tool === "wall"} onClick={() => setTool("wall")} title="Pintar parede" />
            <ToolBtn icon={<Trash2 size={16} />} active={tool === "eraser"} onClick={() => setTool("eraser")} title="Apagar parede" />
            <div className="w-6 h-px bg-border my-1" />
            <ToolBtn icon={<Users size={16} />} active={showAddToken} onClick={() => setShowAddToken(!showAddToken)} title="Adicionar token" />
          </>
        )}
        <div className="flex-1" />
        <ToolBtn icon={<Plus size={16} />} active={false} onClick={() => handleZoom(0.2)} title="Zoom +" />
        <span className="text-[9px] text-text-faint">{Math.round(zoom * 100)}%</span>
        <ToolBtn icon={<Minus size={16} />} active={false} onClick={() => handleZoom(-0.2)} title="Zoom −" />
      </div>

      {/* ── Map canvas ── */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />

        {distanceInfo && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[rgba(10,10,10,0.9)] border border-brand/30 rounded px-3 py-1.5 pointer-events-none z-10">
            <span className="text-xs text-brand-light font-semibold">{distanceInfo}</span>
          </div>
        )}

        {selectedToken && (
          <div className="absolute bottom-3 left-3 bg-bg-surface border border-border rounded-sm px-4 py-3 min-w-[180px] z-10">
            <div className="text-xs font-bold text-text-base mb-1">
              {selectedToken.character?.nome ?? selectedToken.npc?.nome ?? "Token"}
            </div>
            <div className="text-[10px] text-text-faint">
              Posição: ({selectedToken.x}, {selectedToken.y})
            </div>
            {(selectedToken.character ?? selectedToken.npc) && (
              <div className="text-[10px] text-text-faint mt-0.5">
                HP: {(selectedToken.character?.hpAtual ?? selectedToken.npc?.hpAtual) ?? 0} / {(selectedToken.character?.hpMax ?? selectedToken.npc?.hpMax) ?? 0}
              </div>
            )}
            {isMaster && (
              <button
                onClick={() => handleRemoveToken(selectedToken.id)}
                className="mt-2 text-[10px] text-red-500 bg-transparent border border-red-900 rounded-sm px-2 py-0.5 cursor-pointer hover:bg-red-900/20 transition-colors"
              >Remover do mapa</button>
            )}
          </div>
        )}
      </div>

      {/* ── Add Token Panel ── */}
      {showAddToken && (
        <div className="w-[240px] bg-bg-surface border-l border-border overflow-y-auto p-4 shrink-0">
          <h3 className="text-[11px] font-bold text-text-base tracking-[0.12em] uppercase font-cinzel mb-3">Adicionar ao Mapa</h3>

          <div className="text-[9px] text-text-faint uppercase tracking-[0.1em] mb-1.5 font-cinzel">Personagens</div>
          {characters.filter(c => !alreadyPlaced.has(c.id)).length === 0 ? (
            <p className="text-[10px] text-text-ghost mb-3">Todos já estão no mapa</p>
          ) : (
            <div className="flex flex-col gap-1 mb-3">
              {characters.filter(c => !alreadyPlaced.has(c.id)).map(c => (
                <button key={c.id} onClick={() => handlePlaceToken("character", c.id)}
                  className="text-left px-3 py-2 bg-bg-input border border-border rounded-sm text-xs text-text-base cursor-pointer hover:border-brand transition-colors">
                  {c.nome} {c.isMob && <span className="text-[9px] text-red-400">(mob)</span>}
                </button>
              ))}
            </div>
          )}

          <div className="text-[9px] text-text-faint uppercase tracking-[0.1em] mb-1.5 font-cinzel">NPCs</div>
          {npcs.filter(n => !alreadyPlaced.has(n.id)).length === 0 ? (
            <p className="text-[10px] text-text-ghost">Todos já estão no mapa</p>
          ) : (
            <div className="flex flex-col gap-1">
              {npcs.filter(n => !alreadyPlaced.has(n.id)).map(n => (
                <button key={n.id} onClick={() => handlePlaceToken("npc", n.id)}
                  className="text-left px-3 py-2 bg-bg-input border border-border rounded-sm text-xs text-text-base cursor-pointer hover:border-amber-500 transition-colors">
                  {n.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Toolbar Button ──────────────────────────────────────────────────────────

function ToolBtn({ icon, active, onClick, title }: { icon: React.ReactNode; active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 flex items-center justify-center rounded-sm cursor-pointer border transition-colors duration-150 ${
        active
          ? "bg-brand/20 border-brand text-brand-light"
          : "bg-transparent border-transparent text-text-faint hover:text-text-base hover:bg-bg-input"
      }`}
    >
      {icon}
    </button>
  );
}
