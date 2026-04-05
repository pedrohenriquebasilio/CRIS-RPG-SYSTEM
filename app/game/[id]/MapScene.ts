import { getSocket } from "@/lib/socket";

// ─── Types (exported for use in GameMap.tsx) ─────────────────────────────────

export interface TokenData {
  id: string;
  characterId?: string | null;
  npcId?: string | null;
  x: number;
  y: number;
  character?: { id: string; nome: string; avatarUrl?: string | null; hpAtual: number; hpMax: number; isMob: boolean } | null;
  npc?: { id: string; nome: string; hpAtual: number; hpMax: number } | null;
}

export interface MapData {
  id: string;
  campaignId: string;
  width: number;
  height: number;
  tiles: number[][];
  positions: TokenData[];
}

export type Tool = "select" | "wall" | "eraser";

export interface SceneCallbacks {
  onSelectToken: (t: TokenData | null) => void;
  onDistanceChange: (d: string | null) => void;
}

// Opaque type — consumers only need to call syncFromReact / set fields
export interface MapScene {
  currentTool: Tool;
  isMaster: boolean;
  cameras: { main: { setZoom: (z: number) => void } };
  syncFromReact: (data: MapData) => void;
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

// ─── Factory ─────────────────────────────────────────────────────────────────
// Called after dynamic `import("phaser")` — Phaser is passed as argument.

export function createMapScene(
  Phaser: typeof import("phaser"),
  data: MapData,
  backendToken: string,
  campaignId: string,
  isMaster: boolean,
  callbacks: SceneCallbacks,
): MapScene {

  class MapSceneImpl extends Phaser.Scene {
    private mapWidth: number;
    private mapHeight: number;
    private tiles: number[][];
    private positions: TokenData[];
    private backendToken: string;
    private campaignId: string;
    isMaster: boolean;
    currentTool: Tool = "select";

    private tileRects: Phaser.GameObjects.Rectangle[][] = [];
    private tokenContainers = new Map<string, Phaser.GameObjects.Container>();
    private hoverRect: Phaser.GameObjects.Rectangle | null = null;
    private distLine: Phaser.GameObjects.Graphics | null = null;
    private draggingId: string | null = null;
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private callbacks: SceneCallbacks;

    constructor() {
      super({ key: "MapScene" });
      this.mapWidth = data.width;
      this.mapHeight = data.height;
      this.tiles = data.tiles;
      this.positions = data.positions;
      this.backendToken = backendToken;
      this.campaignId = campaignId;
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

      this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.onMove(p));
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onDown(p));
      this.input.on("pointerup", () => this.onUp());

      this.input.on("wheel", (_p: Phaser.Input.Pointer, _go: unknown[], _dx: number, dy: number) => {
        const cam = this.cameras.main;
        cam.setZoom(Phaser.Math.Clamp(cam.zoom + (dy > 0 ? -0.1 : 0.1), 0.3, 3));
      });

      this.game.canvas.addEventListener("contextmenu", e => e.preventDefault());
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

      const circle = this.add.circle(0, 0, TILE_SIZE * 0.38, 0x18181b).setStrokeStyle(2, stroke);
      container.add(circle);

      const letter = this.add.text(0, 0, nome.charAt(0).toUpperCase(), {
        fontSize: "16px",
        color: isNpc ? "#F59E0B" : isMob ? "#EF4444" : "#A78BFA",
        fontFamily: "Cinzel, serif",
        fontStyle: "bold",
      }).setOrigin(0.5);
      container.add(letter);

      const label = this.add.text(0, TILE_SIZE * 0.48, nome.length > 10 ? nome.slice(0, 9) + "…" : nome, {
        fontSize: "8px", color: "#A1A1AA", fontFamily: "Inter, sans-serif",
      }).setOrigin(0.5, 0);
      container.add(label);

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

    // ── Input ──

    private toTile(p: Phaser.Input.Pointer): { x: number; y: number } | null {
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      const tx = Math.floor(w.x / TILE_SIZE);
      const ty = Math.floor(w.y / TILE_SIZE);
      if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight) return null;
      return { x: tx, y: ty };
    }

    onMove(p: Phaser.Input.Pointer) {
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

      if (p.isDown && p.leftButtonDown() && this.isMaster) {
        if (this.currentTool === "wall") this.paintTile(tile.x, tile.y, TILE_WALL);
        else if (this.currentTool === "eraser") this.paintTile(tile.x, tile.y, 0);
      }

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

    onUp() {
      if (this.draggingId) {
        const container = this.tokenContainers.get(this.draggingId);
        const pos = container?.getData("pos") as TokenData | undefined;
        const pointer = this.input.activePointer;
        const tile = this.toTile(pointer);

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
      this.isPanning = false;
    }

    paintTile(x: number, y: number, type: number) {
      if (this.tiles[y]?.[x] === type) return;
      this.tiles[y][x] = type;
      this.tileRects[y]?.[x]?.setFillStyle(type === TILE_WALL ? WALL_COLOR : FLOOR_COLOR);

      const socket = getSocket(this.backendToken);
      socket.emit("placeTile", { campaignId: this.campaignId, x, y, tileType: type });
    }

    syncFromReact(newData: MapData) {
      this.tiles = newData.tiles;
      this.positions = newData.positions;

      for (let y = 0; y < this.mapHeight; y++) {
        for (let x = 0; x < this.mapWidth; x++) {
          const isWall = newData.tiles[y]?.[x] === TILE_WALL;
          this.tileRects[y]?.[x]?.setFillStyle(isWall ? WALL_COLOR : FLOOR_COLOR);
        }
      }

      this.renderTokens();
    }
  }

  return new MapSceneImpl() as unknown as MapScene;
}
