"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiCall } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Map, Plus, Minus, Paintbrush, MousePointer, Users, Trash2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TokenData {
  id: string;
  characterId?: string | null;
  npcId?: string | null;
  x: number;
  y: number;
  character?: { id: string; nome: string; avatarUrl?: string | null; hpAtual: number; hpMax: number; isMob: boolean } | null;
  npc?: { id: string; nome: string; hpAtual: number; hpMax: number } | null;
}

interface MapData {
  id: string;
  campaignId: string;
  width: number;
  height: number;
  tiles: number[][];
  positions: TokenData[];
}

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

// ─── Constants ───────────────────────────────────────────────────────────────

const TILE_SIZE = 40;
const TILE_WALL = 1;

const FLOOR_COLOR = 0x1a1a2e;
const WALL_COLOR = 0x3a3a4e;
const GRID_COLOR = 0x2a2a3e;
const HOVER_COLOR = 0x7c3aed;
const TOKEN_STROKE = 0xa78bfa;
const MOB_STROKE = 0xef4444;
const NPC_STROKE = 0xf59e0b;
const DISTANCE_LINE_COLOR = 0xa78bfa;

type Tool = "select" | "wall" | "eraser";

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
        // Map doesn't exist — check if user is master to auto-create
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

  // ── Init Phaser ──
  useEffect(() => {
    if (!mapData || !containerRef.current || gameRef.current) return;

    import("phaser").then(Phaser => {
      if (!containerRef.current) return;
      const scene = new MapScene(mapData, backendToken, campaignId, userId, isMaster, {
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
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData !== null]);

  // ── Sync mapData → Phaser ──
  useEffect(() => {
    if (sceneRef.current && mapData) sceneRef.current.syncFromReact(mapData);
  }, [mapData]);

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

// ─── Phaser Scene ────────────────────────────────────────────────────────────

class MapScene extends Phaser.Scene {
  private mapWidth: number;
  private mapHeight: number;
  private tiles: number[][];
  private positions: TokenData[];
  private backendToken: string;
  private campaignId: string;
  private userId: string;
  isMaster: boolean;
  currentTool: Tool = "select";

  private tileRects: Phaser.GameObjects.Rectangle[][] = [];
  private tokenContainers = new window.Map<string, Phaser.GameObjects.Container>();
  private hoverRect: Phaser.GameObjects.Rectangle | null = null;
  private distLine: Phaser.GameObjects.Graphics | null = null;
  private draggingId: string | null = null;
  private isPanning = false;
  private panStart = { x: 0, y: 0 };

  private callbacks: {
    onSelectToken: (t: TokenData | null) => void;
    onDistanceChange: (d: string | null) => void;
  };

  constructor(
    data: MapData, backendToken: string, campaignId: string, userId: string, isMaster: boolean,
    callbacks: { onSelectToken: (t: TokenData | null) => void; onDistanceChange: (d: string | null) => void },
  ) {
    super({ key: "MapScene" });
    this.mapWidth = data.width;
    this.mapHeight = data.height;
    this.tiles = data.tiles;
    this.positions = data.positions;
    this.backendToken = backendToken;
    this.campaignId = campaignId;
    this.userId = userId;
    this.isMaster = isMaster;
    this.callbacks = callbacks;
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a0a0a");
    this.renderGrid();
    this.renderTokens();

    this.hoverRect = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, HOVER_COLOR, 0.15)
      .setOrigin(0).setDepth(5).setVisible(false);

    this.distLine = this.add.graphics().setDepth(8);

    // ── Input ──
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => this.onUp(p));

    this.input.on("wheel", (_p: Phaser.Input.Pointer, _go: unknown[], _dx: number, dy: number) => {
      const cam = this.cameras.main;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom + (dy > 0 ? -0.1 : 0.1), 0.3, 3));
    });

    this.game.canvas.addEventListener("contextmenu", e => e.preventDefault());

    // Center
    this.cameras.main.centerOn(this.mapWidth * TILE_SIZE / 2, this.mapHeight * TILE_SIZE / 2);
  }

  // ── Rendering ──

  renderGrid() {
    this.tileRects.forEach(row => row.forEach(r => r.destroy()));
    this.tileRects = [];

    for (let y = 0; y < this.mapHeight; y++) {
      const row: Phaser.GameObjects.Rectangle[] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        const isWall = this.tiles[y]?.[x] === TILE_WALL;
        const rect = this.add.rectangle(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, isWall ? WALL_COLOR : FLOOR_COLOR)
          .setOrigin(0).setStrokeStyle(0.5, GRID_COLOR, 0.4).setDepth(0);
        row.push(rect);
      }
      this.tileRects.push(row);
    }
  }

  renderTokens() {
    const currentIds = new Set(this.positions.map(p => p.id));

    // Remove old
    for (const [id, c] of this.tokenContainers) {
      if (!currentIds.has(id)) { c.destroy(); this.tokenContainers.delete(id); }
    }

    for (const pos of this.positions) {
      const tx = pos.x * TILE_SIZE + TILE_SIZE / 2;
      const ty = pos.y * TILE_SIZE + TILE_SIZE / 2;
      const existing = this.tokenContainers.get(pos.id);

      if (existing) {
        this.tweens.add({ targets: existing, x: tx, y: ty, duration: 300, ease: "Power2" });
        existing.setData("pos", pos);
      } else {
        const c = this.makeToken(pos, tx, ty);
        this.tokenContainers.set(pos.id, c);
      }
    }
  }

  makeToken(pos: TokenData, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(10);
    const isNpc = !!pos.npcId;
    const isMob = pos.character?.isMob ?? false;
    const stroke = isNpc ? NPC_STROKE : isMob ? MOB_STROKE : TOKEN_STROKE;
    const nome = pos.character?.nome ?? pos.npc?.nome ?? "?";

    // Circle
    this.add.circle(0, 0, TILE_SIZE * 0.38, 0x18181b).setStrokeStyle(2, stroke);
    const circle = this.add.circle(0, 0, TILE_SIZE * 0.38, 0x18181b).setStrokeStyle(2, stroke);
    container.add(circle);

    // Letter
    const letter = this.add.text(0, 0, nome.charAt(0).toUpperCase(), {
      fontSize: "16px",
      color: isNpc ? "#F59E0B" : isMob ? "#EF4444" : "#A78BFA",
      fontFamily: "Cinzel, serif",
      fontStyle: "bold",
    }).setOrigin(0.5);
    container.add(letter);

    // Name
    const label = this.add.text(0, TILE_SIZE * 0.48, nome.length > 10 ? nome.slice(0, 9) + "…" : nome, {
      fontSize: "8px", color: "#A1A1AA", fontFamily: "Inter, sans-serif",
    }).setOrigin(0.5, 0);
    container.add(label);

    // HP bar
    const entity = pos.character ?? pos.npc;
    if (entity) {
      const pct = Math.max(0, Math.min(1, entity.hpAtual / entity.hpMax));
      const bw = TILE_SIZE * 0.7;
      const bg = this.add.rectangle(0, -(TILE_SIZE * 0.45), bw, 3, 0x3f3f46).setOrigin(0.5);
      const fg = this.add.rectangle(
        -(bw / 2) + (bw * pct) / 2, -(TILE_SIZE * 0.45), bw * pct, 3,
        pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xf59e0b : 0xef4444,
      ).setOrigin(0.5);
      container.add([bg, fg]);
    }

    container.setData("pos", pos);
    return container;
  }

  // ── Input handlers ──

  private toTile(p: Phaser.Input.Pointer): { x: number; y: number } | null {
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const tx = Math.floor(w.x / TILE_SIZE);
    const ty = Math.floor(w.y / TILE_SIZE);
    if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight) return null;
    return { x: tx, y: ty };
  }

  onMove(p: Phaser.Input.Pointer) {
    // Pan
    if (this.isPanning) {
      const cam = this.cameras.main;
      cam.scrollX -= (p.x - this.panStart.x) / cam.zoom;
      cam.scrollY -= (p.y - this.panStart.y) / cam.zoom;
      this.panStart = { x: p.x, y: p.y };
      return;
    }

    const tile = this.toTile(p);
    if (!tile) { this.hoverRect?.setVisible(false); return; }
    this.hoverRect?.setPosition(tile.x * TILE_SIZE, tile.y * TILE_SIZE).setVisible(true);

    // Paint while dragging
    if (p.isDown && p.leftButtonDown() && this.isMaster) {
      if (this.currentTool === "wall") this.paintTile(tile.x, tile.y, TILE_WALL);
      else if (this.currentTool === "eraser") this.paintTile(tile.x, tile.y, 0);
    }

    // Distance line while dragging token
    if (this.draggingId && this.distLine) {
      const container = this.tokenContainers.get(this.draggingId);
      const pos = container?.getData("pos") as TokenData | undefined;
      if (container && pos) {
        const sx = container.x, sy = container.y;
        const ex = tile.x * TILE_SIZE + TILE_SIZE / 2;
        const ey = tile.y * TILE_SIZE + TILE_SIZE / 2;

        this.distLine.clear();
        this.distLine.lineStyle(1.5, DISTANCE_LINE_COLOR, 0.6);
        this.distLine.lineBetween(sx, sy, ex, ey);

        const dx = Math.abs(tile.x - pos.x);
        const dy = Math.abs(tile.y - pos.y);
        const dist = Math.max(dx, dy);
        this.callbacks.onDistanceChange(`${dist} tiles · ${(dist * 1.5).toFixed(1)}m`);
      }
    }
  }

  onDown(p: Phaser.Input.Pointer) {
    if (p.rightButtonDown() || p.middleButtonDown()) {
      this.isPanning = true;
      this.panStart = { x: p.x, y: p.y };
      return;
    }
    if (!p.leftButtonDown()) return;

    const tile = this.toTile(p);
    if (!tile) return;

    // Tile painting
    if (this.isMaster && this.currentTool === "wall") { this.paintTile(tile.x, tile.y, TILE_WALL); return; }
    if (this.isMaster && this.currentTool === "eraser") { this.paintTile(tile.x, tile.y, 0); return; }

    if (this.currentTool === "select") {
      const hit = this.positions.find(pos => pos.x === tile.x && pos.y === tile.y);
      if (hit) {
        if (this.isMaster) this.draggingId = hit.id;
        this.callbacks.onSelectToken(hit);
      } else {
        this.callbacks.onSelectToken(null);
      }
    }
  }

  onUp(p: Phaser.Input.Pointer) {
    this.isPanning = false;

    if (this.draggingId) {
      const tile = this.toTile(p);
      const pos = this.tokenContainers.get(this.draggingId)?.getData("pos") as TokenData | undefined;

      if (tile && pos && (tile.x !== pos.x || tile.y !== pos.y) && this.tiles[tile.y]?.[tile.x] !== TILE_WALL) {
        const socket = getSocket(this.backendToken);
        socket.emit("moveToken", {
          campaignId: this.campaignId,
          characterId: pos.characterId,
          npcId: pos.npcId,
          x: tile.x,
          y: tile.y,
        });
      }

      this.draggingId = null;
      this.distLine?.clear();
      this.callbacks.onDistanceChange(null);
    }
  }

  paintTile(x: number, y: number, type: number) {
    if (this.tiles[y]?.[x] === type) return;
    this.tiles[y][x] = type;
    this.tileRects[y]?.[x]?.setFillStyle(type === TILE_WALL ? WALL_COLOR : FLOOR_COLOR);

    const socket = getSocket(this.backendToken);
    socket.emit("placeTile", { campaignId: this.campaignId, x, y, tileType: type });
  }

  // ── React sync ──

  syncFromReact(data: MapData) {
    this.tiles = data.tiles;
    this.positions = data.positions;

    // Sync tiles
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const isWall = data.tiles[y]?.[x] === TILE_WALL;
        this.tileRects[y]?.[x]?.setFillStyle(isWall ? WALL_COLOR : FLOOR_COLOR);
      }
    }

    // Sync tokens
    this.renderTokens();
  }
}
