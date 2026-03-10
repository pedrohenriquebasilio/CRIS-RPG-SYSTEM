"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Zap, Shield, Star, Swords, User, Trash2, Dices, Pencil } from "lucide-react";
import { apiCall } from "@/lib/api";
import { getSocket } from "@/lib/socket";

// ─── Types ────────────────────────────────────────────────────────────────────
export type Attrs = { FOR: number; AGI: number; VIG: number; INT: number; PRE: number };

export interface CharSkill {
  skill: { id?: string; nome: string; atributoBase: string };
  treinada: boolean;
  pontosInvestidos?: number;
}
export interface Technique {
  id?: string;
  nome: string; nivel: number; custoEnergia: number;
  atributoBase: string; skillNome?: string | null;
  descricaoLivre: string; tipoDano: string | null;
  damageDice?: string | null;
}
export interface WeaponTemplate {
  id: string; nome: string; categoria: string;
  damageDice: string; tipoDano: string; distancia: string;
  duasMaos: boolean; requiresMarcial: boolean;
  regraEspecial?: string; threatRange: number; criticalMultiplier: number;
}
export interface TechTemplate {
  id: string; nome: string; nivel: number;
  atributoBase: string; custoEnergia: number;
  tipoDano: string | null; cd: number | null;
  descricaoLivre: string; isSystem: boolean;
}
export interface Weapon {
  id: string; nome: string; damageDice: string; damageType: string;
  threatRange: number; criticalMultiplier: number; descricao?: string;
  skill?: { id: string; nome: string; atributoBase: string } | null;
  skillId?: string | null;
}
export interface InventoryItemData {
  id: string;
  itemId: string;
  quantidade: number;
  equipado: boolean;
  notas: string;
  item: {
    id: string;
    nome: string;
    descricao: string;
    tipo: string;
    peso: number;
    valor: number;
  };
}

export interface ItemCatalog {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  peso: number;
  valor: number;
}
export interface AptitudeSeed {
  id: string;
  nome: string;
  descricao: string;
  prerequisitoNivel: number;
  tipo: string;
  cooldown: number;
  prerequisitoAptidao: { id: string; nome: string } | null;
}
export interface Aptitude {
  id: string;
  aptitude: { id?: string; nome: string; descricao: string };
  adquiridaNoNivel?: number;
  tipo?: string;
  cooldown?: number;
  ativo?: boolean;
  prerequisitoNivel?: number;
}
export interface CharacterAbility {
  id: string;
  nome: string;
  tipo: string;
  custo: string;
  alcance: string;
  duracao: string;
  descricao: string;
  damageDice?: string | null;
  atributoBase?: string | null;
}
export interface TalentoData {
  id: string;
  nome: string;
  tipo: string;
  custo: string;
  alcance: string;
  duracao: string;
  descricao: string;
  damageDice?: string | null;
  atributoBase?: string | null;
}
export interface CharacterTalentoLink {
  id: string;
  talentoId: string;
  talento: TalentoData;
}
export interface Character {
  id: string; nome: string; origem?: string;
  campaignId?: string;
  origemId?: string | null;
  nivel: number; xpAtual: number;
  hpAtual: number; hpMax: number;
  energiaAtual: number; energiaMax: number;
  maestriaBonus: number; isApproved: boolean;
  grau: string;
  pendingAptidaoSlots: number;
  specialization: { id?: string; nome: string; bonusAtributos?: Record<string, number>; habilidadesTreinadas?: string[] } | null;
  origemRelacao?: { id?: string; nome: string; bonusAtributos?: Record<string, number>; habilidadesTreinadas?: string[] } | null;
  campaign: { name: string };
  attributes: Attrs | null;
  skills: CharSkill[]; techniques: Technique[];
  weapons: Weapon[]; aptitudes: Aptitude[];
  inventory?: InventoryItemData[];
  abilities?: CharacterAbility[];
  talentos?: CharacterTalentoLink[];
}

export interface SpecSeed {
  id: string; nome: string; hpPorNivel: number; energiaPorNivel: number;
  bonusAtributos: Record<string, number>; habilidadesTreinadas: string[];
  descricao?: string;
}
export interface OrigemSeed {
  id: string; nome: string; descricao: string;
  bonusAtributos: Record<string, number>; habilidadesTreinadas: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
export const ALL_SKILLS: { nome: string; atributoBase: string }[] = [
  // FOR
  { nome: "Atletismo",  atributoBase: "FOR" },
  { nome: "Luta",       atributoBase: "FOR" },
  // AGI
  { nome: "Acrobacia",  atributoBase: "AGI" },
  { nome: "Furtividade",atributoBase: "AGI" },
  { nome: "Iniciativa", atributoBase: "AGI" },
  { nome: "Pontaria",   atributoBase: "AGI" },
  { nome: "Reflexos",   atributoBase: "AGI" },
  // VIG
  { nome: "Fortitude",  atributoBase: "VIG" },
  { nome: "Vontade",    atributoBase: "VIG" },
  // INT
  { nome: "Feitiçaria", atributoBase: "INT" },
  { nome: "Investigação",atributoBase: "INT" },
  { nome: "Medicina",   atributoBase: "INT" },
  { nome: "Ocultismo",  atributoBase: "INT" },
  // PRE
  { nome: "Diplomacia", atributoBase: "PRE" },
  { nome: "Enganação",  atributoBase: "PRE" },
  { nome: "Intimidação",atributoBase: "PRE" },
  { nome: "Intuição",   atributoBase: "PRE" },
  { nome: "Percepção",  atributoBase: "PRE" },
];

const XP_TABLE: Record<number, number> = {
  1: 300, 2: 900, 3: 2700, 4: 6500, 5: 14000, 6: 23000,
  7: 34000, 8: 48000, 9: 64000, 10: 85000, 11: 100000, 12: 120000,
  13: 140000, 14: 165000, 15: 195000, 16: 225000, 17: 265000,
  18: 305000, 19: 355000, 20: 355000,
};

function storageKey(userId?: string) {
  return userId ? `assistente-fiel-character-${userId}` : "assistente-fiel-character";
}

function persist(key: string, updates: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      localStorage.setItem(key, JSON.stringify({ ...JSON.parse(raw), ...updates }));
    }
  } catch { /* ignore */ }
}

// ─── Attribute Ring ───────────────────────────────────────────────────────────
function AttributeRing({ attrs, maestriaBonus: _maestriaBonus, onChangeAttr, onRollAttr }: {
  attrs: Attrs;
  maestriaBonus: number;
  onChangeAttr: (attr: keyof Attrs, delta: number) => void;
  onRollAttr?: (attr: keyof Attrs) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const CX = 150, CY = 152;
  const nodes: { attr: string; value: number; cx: number; cy: number }[] = [
    { attr: "AGI", value: attrs.AGI, cx: 150, cy: 47  },
    { attr: "INT", value: attrs.INT, cx: 256, cy: 143 },
    { attr: "VIG", value: attrs.VIG, cx: 212, cy: 240 },
    { attr: "PRE", value: attrs.PRE, cx: 88,  cy: 240 },
    { attr: "FOR", value: attrs.FOR, cx: 44,  cy: 143 },
  ];
  const R = 34;

  const microBtn: React.CSSProperties = {
    position: "absolute", width: 18, height: 18,
    background: "#1A1A1A", border: "1px solid #3F3F46", borderRadius: 2,
    cursor: "pointer", color: "#D1D5DB", fontSize: 13, fontWeight: 800,
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 10, padding: 0, lineHeight: 1,
  };

  return (
    <div style={{ position: "relative", width: 300, height: 286, margin: "0 auto" }}>
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible" }}
        viewBox="0 0 300 286"
      >
        <polygon points={nodes.map(n => `${n.cx},${n.cy}`).join(" ")} fill="none" stroke="#222" strokeWidth="1" strokeDasharray="4 4" />
        {nodes.map(n => (
          <line key={n.attr} x1={n.cx} y1={n.cy} x2={CX} y2={CY} stroke="#222" strokeWidth="1" />
        ))}
        <circle cx={CX} cy={CY} r={56} fill="rgba(124,58,237,0.04)" />
      </svg>

      {/* Center hub */}
      <div style={{
        position: "absolute", left: CX - 44, top: CY - 44, width: 88, height: 88,
        borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)",
        background: "radial-gradient(circle at 40% 35%, #1a1a1a 0%, #080808 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 28px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.05)", zIndex: 2,
      }}>
        <div style={{ position: "absolute", inset: 6, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.07)" }} />
        <span style={{ fontSize: 8, fontWeight: 700, color: "#6B7280", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Cinzel, serif" }}>TOTAL</span>
        <div style={{ width: 22, height: 1, background: "rgba(124,58,237,0.5)", margin: "5px 0 4px" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>{attrs.FOR + attrs.AGI + attrs.VIG + attrs.INT + attrs.PRE}</span>
      </div>

      {/* Nodes */}
      {nodes.map(n => {
        const isHov = hovered === n.attr;
        return (
          <div
            key={n.attr}
            onMouseEnter={() => setHovered(n.attr)}
            onMouseLeave={() => setHovered(null)}
            onClick={(e) => { if (onRollAttr && !(e.target as HTMLElement).closest('button')) onRollAttr(n.attr as keyof Attrs); }}
            style={{
              position: "absolute", left: n.cx - R, top: n.cy - R, width: R * 2, height: R * 2,
              borderRadius: "50%",
              border: `2px solid ${n.value >= 4 ? "rgba(255,255,255,0.85)" : isHov ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.5)"}`,
              background: "radial-gradient(circle at 40% 35%, #1e1e1e 0%, #080808 100%)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              zIndex: 3,
              boxShadow: n.value >= 4 ? "0 0 16px rgba(168,85,247,0.5)" : isHov ? "0 0 14px rgba(124,58,237,0.4)" : "none",
              cursor: onRollAttr ? "pointer" : "default", transition: "box-shadow 0.15s, border-color 0.15s",
            }}
          >
            {/* + at top */}
            {isHov && (
              <button
                onClick={(e) => { e.stopPropagation(); onChangeAttr(n.attr as keyof Attrs, 1); }}
                style={{ ...microBtn, top: 4, left: "50%", transform: "translateX(-50%)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#7C3AED")}
                onMouseLeave={e => (e.currentTarget.style.background = "#1A1A1A")}
              >+</button>
            )}

            <span style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{n.value}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: n.value >= 4 ? "#A855F7" : "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 3 }}>{n.attr}</span>

            {/* − at bottom */}
            {isHov && (
              <button
                onClick={(e) => { e.stopPropagation(); onChangeAttr(n.attr as keyof Attrs, -1); }}
                style={{ ...microBtn, bottom: 4, left: "50%", transform: "translateX(-50%)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#7F1D1D")}
                onMouseLeave={e => (e.currentTarget.style.background = "#1A1A1A")}
              >−</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Status Bar ───────────────────────────────────────────────────────────────
function StatusBar({ label, current, max, color, dimColor, onChange, onChangeMax }: {
  label: string; current: number; max: number;
  color: string; dimColor: string;
  onChange: (v: number) => void;
  onChangeMax?: (v: number) => void;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const dec = (n: number) => onChange(Math.max(0, current - n));
  const inc = (n: number) => onChange(Math.min(max, current + n));

  const btn: React.CSSProperties = {
    background: "transparent", border: "none", cursor: "pointer",
    color: "#3F3F46", padding: "0 10px", height: "100%",
    display: "flex", alignItems: "center", fontSize: 15, fontWeight: 700,
    transition: "color 0.15s", flexShrink: 0, userSelect: "none",
  };

  const microBtn: React.CSSProperties = {
    background: "transparent", border: "none", cursor: "pointer",
    color: "#52525B", padding: "0 3px", fontSize: 11, fontWeight: 700,
    lineHeight: 1, display: "inline-flex", alignItems: "center", userSelect: "none",
  };

  return (
    <div>
      <div className="text-center text-[10px] font-bold text-text-muted tracking-[0.18em] uppercase mb-1.5 font-cinzel">
        {label}
      </div>
      <div className="relative h-[38px] bg-bg-input border border-border-md rounded-sm overflow-hidden">
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: `linear-gradient(90deg, ${dimColor}, ${color})`, opacity: 0.35, transition: "width 0.35s ease" }} />
        <div className="absolute left-0 top-0 right-0 h-[40%] bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
        <div className="relative flex items-center h-full z-[1]">
          <button style={btn} onClick={() => dec(5)} onMouseEnter={e => (e.currentTarget.style.color = color)} onMouseLeave={e => (e.currentTarget.style.color = "#3F3F46")}>«</button>
          <button style={btn} onClick={() => dec(1)} onMouseEnter={e => (e.currentTarget.style.color = color)} onMouseLeave={e => (e.currentTarget.style.color = "#3F3F46")}>‹</button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700, color, letterSpacing: "0.04em", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            {current}
            <span style={{ color: "#3F3F46", fontWeight: 300, fontSize: 13 }}>/</span>
            {onChangeMax ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                <button style={microBtn} onClick={() => onChangeMax(Math.max(1, max - 1))} onMouseEnter={e => (e.currentTarget.style.color = color)} onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}>−</button>
                <span style={{ color, minWidth: 24, textAlign: "center" }}>{max}</span>
                <button style={microBtn} onClick={() => onChangeMax(max + 1)} onMouseEnter={e => (e.currentTarget.style.color = color)} onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}>+</button>
              </span>
            ) : (
              <span style={{ color }}>{max}</span>
            )}
          </span>
          <button style={btn} onClick={() => inc(1)} onMouseEnter={e => (e.currentTarget.style.color = color)} onMouseLeave={e => (e.currentTarget.style.color = "#3F3F46")}>›</button>
          <button style={btn} onClick={() => inc(5)} onMouseEnter={e => (e.currentTarget.style.color = color)} onMouseLeave={e => (e.currentTarget.style.color = "#3F3F46")}>»</button>
        </div>
      </div>
    </div>
  );
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────
function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border-md" />
      <span className="text-[9px] font-bold text-text-faint uppercase tracking-[0.16em] font-cinzel">{children}</span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border-md" />
    </div>
  );
}

function EmptyState({ icon, message, sub }: { icon: React.ReactNode; message: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-3">
      <div className="text-border-strong">{icon}</div>
      <span className="text-[13px] text-text-faint font-medium">{message}</span>
      {sub && <span className="text-[12px] text-text-ghost text-center leading-relaxed max-w-[220px]">{sub}</span>}
    </div>
  );
}

const DANO_COLORS: Record<string, string> = {
  FISICO: "#EF4444", ENERGETICO: "#8B5CF6", MENTAL: "#3B82F6", ESPIRITUAL: "#10B981",
};

function TechniqueCard({ t, attrs, maestriaBonus, onRoll, onEdit }: { t: Technique; attrs: Attrs; maestriaBonus: number; onRoll: () => void; onEdit: () => void }) {
  const attrVal = attrs[t.atributoBase as keyof Attrs] ?? 0;
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-bg-input border border-border border-l-[3px] border-l-brand rounded-[0_2px_2px_0]">
      <div className="px-3.5 py-2.5 flex justify-between items-center cursor-pointer" onClick={() => setExpanded(x => !x)}>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); onRoll(); }}
            title="Rolar técnica"
            className="bg-transparent border-none cursor-pointer text-text-faint p-0.5 flex items-center rounded-sm transition-colors duration-150"
            onMouseEnter={e => (e.currentTarget.style.color = "#A855F7")}
            onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
          ><Dices size={14} /></button>
          <span className="text-[13px] font-semibold text-text-base">{t.nome}</span>
          <span className="text-[9px] bg-brand/[0.12] text-[#9B75F0] px-1.5 py-0.5 rounded-sm border border-brand/25 font-semibold">NV.{t.nivel}</span>
        </div>
        <div className="flex items-center gap-2.5">
          {t.damageDice && <span className="text-[11px] font-bold text-red-400">{t.damageDice}</span>}
          <span className="text-[10px] text-text-faint">CD:{10 + t.nivel + maestriaBonus}</span>
          <span className="text-[11px] text-brand">{t.custoEnergia}⚡</span>
          <span className="text-sm font-extrabold text-brand-light">+{attrVal + maestriaBonus}</span>
          <button onClick={e => { e.stopPropagation(); onEdit(); }} title="Editar técnica"
            className="bg-transparent border-none cursor-pointer text-text-ghost p-0.5 flex items-center rounded-sm transition-colors duration-150"
            onMouseEnter={e => (e.currentTarget.style.color = "#F59E0B")}
            onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
          ><Pencil size={11} /></button>
        </div>
      </div>
      {expanded && (
        <div className="px-3.5 pb-3">
          {t.descricaoLivre && <p className="text-xs text-text-dim m-0 mb-2 leading-relaxed">{t.descricaoLivre}</p>}
          <div className="flex gap-3.5 flex-wrap">
            <span className="text-[10px] text-text-faint">Perícia: {t.skillNome ?? t.atributoBase} ({attrVal})</span>
            {t.damageDice && <span className="text-[10px] text-red-400">Dano: {t.damageDice}</span>}
            {t.tipoDano && <span style={{ fontSize: 10, color: DANO_COLORS[t.tipoDano] ?? "#6B7280" }}>● {t.tipoDano.toLowerCase()}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function WeaponCard({ w, onRoll, onEdit, onDelete }: { w: Weapon; onRoll: () => void; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-bg-input border border-border border-l-[3px] border-l-[#991B1B] rounded-[0_2px_2px_0]">
      <div className="px-3.5 py-3 cursor-pointer" onClick={() => setExpanded(x => !x)}>
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={e => { e.stopPropagation(); onRoll(); }}
              title="Rolar ataque"
              className="bg-transparent border-none cursor-pointer text-text-faint p-0.5 flex items-center rounded-sm transition-colors duration-150"
              onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
              onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
            ><Dices size={14} /></button>
            <span className="text-[13px] font-semibold text-text-base">{w.nome}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-red-500">{w.damageDice}</span>
            <button onClick={e => { e.stopPropagation(); onEdit(); }} title="Editar arma"
              className="bg-transparent border-none cursor-pointer text-text-ghost p-0.5 flex items-center rounded-sm transition-colors duration-150"
              onMouseEnter={e => (e.currentTarget.style.color = "#F59E0B")}
              onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
            ><Pencil size={11} /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} title="Remover arma"
              className="bg-transparent border-none cursor-pointer text-text-ghost p-0.5 flex items-center rounded-sm transition-colors duration-150"
              onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
              onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
            ><Trash2 size={11} /></button>
          </div>
        </div>
        <div className="flex gap-4">
          {w.skill && <div><span className="text-[10px] text-text-faint mr-1">PERÍCIA</span><span className="text-[11px] text-brand-muted">{w.skill.nome}</span></div>}
          <div><span className="text-[10px] text-text-faint mr-1">TIPO</span><span className="text-[11px] text-text-dim">{w.damageType.toLowerCase()}</span></div>
          <div><span className="text-[10px] text-text-faint mr-1">CRÍTICO</span><span style={{ fontSize: 11, color: w.threatRange < 20 ? "#F59E0B" : "#6B7280" }}>≥{w.threatRange} (×{w.criticalMultiplier})</span></div>
        </div>
      </div>
      {expanded && w.descricao && (
        <div className="px-3.5 pb-3 border-t border-border-subtle">
          <p className="text-xs text-text-dim m-0 pt-2 leading-relaxed">{w.descricao}</p>
        </div>
      )}
    </div>
  );
}

// ─── Inventory Item Card ───────────────────────────────────────────────────────
const TIPO_ICONS: Record<string, string> = {
  misc: "📦", consumivel: "🧪", equipamento: "🛡", quest: "⭐", material: "🪨"
};

function InventoryItemCard({ inv, onDelete, onUpdate }: {
  inv: InventoryItemData;
  onDelete: () => void;
  onUpdate: (data: { quantidade?: number; equipado?: boolean; notas?: string }) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [qtd, setQtd] = useState(inv.quantidade);

  return (
    <div className="bg-bg-input border border-border rounded-sm overflow-hidden">
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <span className="text-[16px] shrink-0">{TIPO_ICONS[inv.item.tipo] ?? "📦"}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-text-base overflow-hidden text-ellipsis whitespace-nowrap">{inv.item.nome}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] text-text-faint bg-[#1A1A1A] border border-border px-1.5 py-px rounded-sm">{inv.item.tipo}</span>
            {inv.equipado && <span className="text-[9px] text-green-400 border border-green-900 px-1.5 py-px rounded-sm">equipado</span>}
          </div>
        </div>
        {/* Quantidade */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => { const n = Math.max(1, qtd - 1); setQtd(n); onUpdate({ quantidade: n }); }}
            className="w-5 h-5 flex items-center justify-center rounded-sm bg-[#1A1A1A] border border-border text-text-faint text-xs cursor-pointer hover:border-brand transition-colors">−</button>
          <span className="text-[12px] font-bold text-text-base w-5 text-center">{qtd}</span>
          <button onClick={() => { const n = qtd + 1; setQtd(n); onUpdate({ quantidade: n }); }}
            className="w-5 h-5 flex items-center justify-center rounded-sm bg-[#1A1A1A] border border-border text-text-faint text-xs cursor-pointer hover:border-brand transition-colors">+</button>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(e => !e)}
            className="w-6 h-6 flex items-center justify-center rounded-sm bg-transparent border border-transparent text-text-faint text-xs cursor-pointer hover:border-border transition-colors">
            {expanded ? "▲" : "▼"}
          </button>
          <button onClick={onDelete}
            className="w-6 h-6 flex items-center justify-center rounded-sm bg-transparent border border-transparent text-red-700 text-xs cursor-pointer hover:border-red-900 hover:text-red-500 transition-colors">✕</button>
        </div>
      </div>
      {expanded && (
        <div className="px-3.5 pb-3 border-t border-border-subtle pt-2 flex flex-col gap-2">
          {inv.item.descricao && <p className="text-[11px] text-text-dim m-0 leading-relaxed">{inv.item.descricao}</p>}
          <div className="flex gap-3 text-[10px] text-text-faint">
            {inv.item.peso > 0 && <span>Peso: {inv.item.peso}kg</span>}
            {inv.item.valor > 0 && <span>Valor: {inv.item.valor} moedas</span>}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={inv.equipado} onChange={e => onUpdate({ equipado: e.target.checked })}
              className="accent-[#7C3AED]" />
            <span className="text-[11px] text-text-dim">Equipado</span>
          </label>
        </div>
      )}
    </div>
  );
}

// ─── Dice Toast ───────────────────────────────────────────────────────────────
interface DiceRoll {
  rollId: number;
  label: string;
  dice: number;
  modifier: number;
  total: number;
  // Weapon attack extras
  damage?: number;
  damageDice?: string;
  isCritical?: boolean;
}

function DiceToast({ roll, visible }: { roll: DiceRoll; visible: boolean }) {
  const isCrit   = roll.isCritical ?? roll.dice === 20;
  const isFumble = roll.dice === 1;
  const diceColor = isCrit ? "#F59E0B" : isFumble ? "#EF4444" : roll.dice >= 15 ? "#E5E7EB" : "#9CA3AF";
  const accentColor = isCrit ? "#F59E0B" : isFumble ? "#EF4444" : "#7C3AED";
  const glow = isCrit ? "rgba(245,158,11,0.35)" : isFumble ? "rgba(239,68,68,0.25)" : "rgba(124,58,237,0.2)";
  const isWeapon = roll.damage !== undefined;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="fixed bottom-6 right-6 z-[1000] bg-bg-surface border border-border-md rounded p-4 min-w-[200px] max-w-[260px]"
      style={{
        boxShadow: `0 8px 32px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), 0 0 28px ${glow}`,
        transition: "opacity 0.35s ease, transform 0.35s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(10px) scale(0.96)",
        pointerEvents: visible ? "auto" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t" style={{ background: accentColor }} />

      <div className="flex items-center gap-1.5 mb-2.5">
        <Dices size={11} color="#52525B" />
        <span className="text-[10px] text-text-muted font-bold uppercase tracking-[0.1em] font-cinzel">
          {roll.label}
        </span>
        {isCrit   && <span className="text-[9px] text-amber-400 font-extrabold ml-auto tracking-[0.08em]">CRÍTICO!</span>}
        {isFumble && <span className="text-[9px] text-red-500 font-extrabold ml-auto tracking-[0.08em]">FALHA!</span>}
      </div>

      {isWeapon ? (
        hovered ? (
          /* Hover: show breakdown */
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="text-[8px] text-text-ghost mb-1 uppercase tracking-[0.1em]">Acerto</div>
              <div className="text-[9px] text-text-dim">d20({roll.dice}) + {roll.modifier} = <span className="font-bold text-text-base">{roll.total}</span></div>
            </div>
            <div className="w-px bg-border-subtle" />
            <div className="flex-1">
              <div className="text-[8px] text-text-ghost mb-1 uppercase tracking-[0.1em]">Dano</div>
              <div className="text-[9px] text-text-dim">{roll.damageDice}{isCrit ? " ×crit" : ""} = <span className="font-bold text-red-400">{roll.damage}</span></div>
            </div>
          </div>
        ) : (
          /* Default: ACERTO | DANO side by side */
          <div className="flex gap-3 items-end">
            <div className="flex-1 text-center">
              <div className="text-[8px] text-text-ghost mb-0.5 uppercase tracking-[0.08em]">Acerto</div>
              <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, color: diceColor, fontFamily: "Cinzel, serif",
                textShadow: isCrit ? "0 0 20px rgba(245,158,11,0.8)" : isFumble ? "0 0 14px rgba(239,68,68,0.6)" : "none" }}>
                {roll.total}
              </div>
            </div>
            <div className="w-px bg-border-subtle self-stretch" />
            <div className="flex-1 text-center">
              <div className="text-[8px] text-text-ghost mb-0.5 uppercase tracking-[0.08em]">Dano</div>
              <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, color: "#EF4444", fontFamily: "Cinzel, serif",
                textShadow: isCrit ? "0 0 20px rgba(239,68,68,0.6)" : "none" }}>
                {roll.damage}
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="flex items-end gap-2">
          <div>
            <div className="text-[8px] text-text-ghost mb-px text-center">d20</div>
            <div style={{
              fontSize: 46, fontWeight: 900, lineHeight: 1, color: diceColor,
              fontFamily: "Cinzel, serif",
              textShadow: isCrit ? "0 0 24px rgba(245,158,11,0.9)" : isFumble ? "0 0 18px rgba(239,68,68,0.7)" : "none",
            }}>{roll.dice}</div>
          </div>
          {roll.modifier !== 0 && (
            <>
              <div className="pb-1.5 text-text-ghost text-base font-light">+</div>
              <div>
                <div className="text-[8px] text-text-ghost mb-px text-center">bônus</div>
                <div className="text-[22px] font-bold leading-none text-brand pb-1">{roll.modifier}</div>
              </div>
              <div className="pb-1.5 text-text-ghost text-base font-light">=</div>
              <div>
                <div className="text-[8px] text-text-ghost mb-px text-center">total</div>
                <div className="text-[28px] font-black leading-none text-text-base pb-px">{roll.total}</div>
              </div>
            </>
          )}
        </div>
      )}

      <div key={roll.rollId} className="mt-3 h-0.5 bg-border-subtle rounded-sm overflow-hidden">
        <div className="h-full w-full animate-dice-drain opacity-50" style={{ background: accentColor }} />
      </div>
      {isWeapon && !hovered && (
        <div className="text-[8px] text-text-faint text-center mt-1">passe o mouse para ver o breakdown</div>
      )}
    </div>
  );
}

// ─── Notification Toast ───────────────────────────────────────────────────────
interface Notif { id: number; type: "error" | "success" | "warning"; title: string; message?: string; }

function friendlyError(raw: string): { title: string; message?: string } {
  const s = raw.toLowerCase();
  if (s.includes("no available aptitude slot") || s.includes("aptitude slot"))
    return { title: "Sem slots de aptidão", message: "Você não possui slots disponíveis. Ganhe um nível para obter mais." };
  if (s.includes("aptitude already acquired"))
    return { title: "Aptidão já obtida", message: "Você já possui essa aptidão." };
  if (s.includes("missing required previous aptitude"))
    return { title: "Pré-requisito não cumprido", message: "Você precisa obter a aptidão anterior primeiro." };
  if (s.includes("character level must be at least")) {
    const m = raw.match(/(\d+)/); return { title: "Nível insuficiente", message: m ? `Esta aptidão requer nível ${m[1]}.` : "Seu nível não é suficiente." };
  }
  if (s.includes("combat") || s.includes("active combat"))
    return { title: "Combate ativo", message: "Não é possível editar a ficha durante um combate." };
  if (s.includes("not found"))
    return { title: "Não encontrado", message: "O recurso solicitado não existe." };
  if (s.includes("forbidden") || s.includes("unauthorized") || s.includes("401") || s.includes("403"))
    return { title: "Sem permissão", message: "Você não tem permissão para esta ação." };
  if (s.includes("conflict") || s.includes("already"))
    return { title: "Conflito", message: "Este item já existe ou já foi adicionado." };
  return { title: "Erro", message: raw.length < 120 ? raw : "Ocorreu um erro inesperado." };
}

let _notifId = 0;

function NotifToast({ notif, onRemove }: { notif: Notif; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => {
        if (barRef.current) {
          barRef.current.style.transition = "width 4.5s linear";
          barRef.current.style.width = "0%";
        }
      });
    }, 10);
    const t2 = setTimeout(() => { setVisible(false); setTimeout(() => onRemove(notif.id), 350); }, 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [notif.id, onRemove]);

  const cfg = {
    error:   { accent: "#EF4444", icon: "✕" },
    success: { accent: "#22C55E", icon: "✓" },
    warning: { accent: "#F59E0B", icon: "⚠" },
  }[notif.type];

  return (
    <div style={{
      background: "#111111", border: `1px solid ${cfg.accent}40`, borderRadius: 4,
      padding: "10px 12px", minWidth: 240, maxWidth: 300,
      boxShadow: `0 8px 24px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03), 0 0 18px ${cfg.accent}18`,
      transition: "opacity 0.3s ease, transform 0.3s ease",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : "translateX(18px)",
      position: "relative", overflow: "hidden", pointerEvents: "auto",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: cfg.accent }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{
          width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          background: `${cfg.accent}20`, border: `1px solid ${cfg.accent}60`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 900, color: cfg.accent,
        }}>{cfg.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#E5E7EB", fontFamily: "Cinzel, serif", letterSpacing: "0.04em", marginBottom: notif.message ? 2 : 0 }}>
            {notif.title}
          </div>
          {notif.message && <div style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.4 }}>{notif.message}</div>}
        </div>
        <button
          onClick={() => { setVisible(false); setTimeout(() => onRemove(notif.id), 350); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#52525B", fontSize: 15, lineHeight: 1, padding: "0 0 0 4px", flexShrink: 0, marginTop: -1 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#9CA3AF")}
          onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
        >×</button>
      </div>
      <div style={{ marginTop: 8, height: 2, background: "#1F1F1F", borderRadius: 1, overflow: "hidden" }}>
        <div ref={barRef} style={{ height: "100%", width: "100%", background: cfg.accent, opacity: 0.5 }} />
      </div>
    </div>
  );
}

function NotifToastContainer({ notifs, onRemove }: { notifs: Notif[]; onRemove: (id: number) => void }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 24, zIndex: 1100, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {notifs.map(n => <NotifToast key={n.id} notif={n} onRemove={onRemove} />)}
    </div>
  );
}

// ─── Add Technique Modal ──────────────────────────────────────────────────────
const DANO_COLORS_T: Record<string, string> = {
  FISICO: "#EF4444", ENERGETICO: "#8B5CF6", MENTAL: "#3B82F6", ESPIRITUAL: "#10B981",
};

function AddTechniqueModal({ characterId, backendToken, onAdded, onClose }: {
  characterId: string; backendToken: string;
  onAdded: (t: Technique) => void; onClose: () => void;
}) {
  type Mode = "biblioteca" | "custom";
  const [mode, setMode]           = useState<Mode>("biblioteca");
  const [templates, setTemplates] = useState<TechTemplate[] | null>(null);
  const [tSearch, setTSearch]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  // custom form
  const [nome, setNome]           = useState("");
  const [nivel, setNivel]         = useState(1);
  const [pericia, setPericia]     = useState(ALL_SKILLS[0].nome);
  const [custo, setCusto]         = useState("0");
  const [tipoDano, setTipoDano]   = useState("");
  const [damageDice, setDamageDice] = useState("");
  const [desc, setDesc]           = useState("");

  useEffect(() => {
    if (mode === "biblioteca" && templates === null) {
      apiCall<TechTemplate[]>("/technique-templates", backendToken)
        .then(setTemplates).catch(() => setTemplates([]));
    }
  }, [mode, templates, backendToken]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function addFromTemplate(t: TechTemplate) {
    setSaving(true); setError("");
    try {
      const res = await apiCall<Technique>(`/characters/${characterId}/techniques`, backendToken, {
        method: "POST",
        body: { nome: t.nome, nivel: t.nivel, custoEnergia: t.custoEnergia, atributoBase: t.atributoBase, descricaoLivre: t.descricaoLivre, tipoDano: t.tipoDano ?? undefined },
      });
      onAdded(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro."); setSaving(false); }
  }

  async function addCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError("Nome é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      const res = await apiCall<Technique>(`/characters/${characterId}/techniques`, backendToken, {
        method: "POST",
        body: { nome: nome.trim(), nivel, custoEnergia: parseInt(custo) || 0, atributoBase: ALL_SKILLS.find(s => s.nome === pericia)?.atributoBase ?? "INT", skillNome: pericia, descricaoLivre: desc.trim(), tipoDano: tipoDano || undefined, damageDice: damageDice.trim() || undefined },
      });
      onAdded(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro."); setSaving(false); }
  }

  const visibleTemplates = (templates ?? []).filter(t =>
    !tSearch || t.nome.toLowerCase().includes(tSearch.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/[0.78] backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#111] border border-border rounded-md w-full max-w-[520px] max-h-[80vh] flex flex-col" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.12)" }}>
        {/* Header */}
        <div className="px-[22px] pt-[18px] pb-[14px] border-b border-border-subtle flex items-center justify-between shrink-0">
          <span className="text-[13px] font-bold text-text-near tracking-[0.06em] font-cinzel">Adicionar Técnica</span>
          <button onClick={onClose} className="bg-none border-none cursor-pointer text-text-faint text-lg leading-none">×</button>
        </div>
        {/* Mode tabs */}
        <div className="flex border-b border-border-subtle shrink-0">
          {(["biblioteca", "custom"] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
              flex: 1, padding: "10px 0", background: "none", border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Cinzel, serif",
              color: mode === m ? "#A855F7" : "#52525B",
              borderBottom: `2px solid ${mode === m ? "#7C3AED" : "transparent"}`, marginBottom: -1,
            }}>
              {m === "biblioteca" ? "BIBLIOTECA" : "PERSONALIZADA"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-[22px] py-4">
          {mode === "biblioteca" && (
            <>
              <input value={tSearch} onChange={e => setTSearch(e.target.value)} placeholder="Buscar…"
                className="ficha-input mb-3"
                onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
              />
              {templates === null && <p className="text-text-faint text-xs text-center">Carregando…</p>}
              {visibleTemplates.length === 0 && templates !== null && <p className="text-text-ghost text-xs text-center">Nenhuma técnica encontrada.</p>}
              <div className="flex flex-col gap-1.5">
                {visibleTemplates.map(t => (
                  <button key={t.id} onClick={() => addFromTemplate(t)} disabled={saving}
                    style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", borderLeft: `3px solid ${DANO_COLORS_T[t.tipoDano ?? ""] ?? "#7C3AED"}`, borderRadius: "0 3px 3px 0", padding: "10px 14px", cursor: saving ? "not-allowed" : "pointer", textAlign: "left", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#1F1F1F")}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-semibold text-text-base">{t.nome}</span>
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] text-brand">Nv.{t.nivel}</span>
                        <span className="text-[10px] text-brand-light">{t.custoEnergia}⚡</span>
                        <span className="text-[10px] text-text-faint">{t.atributoBase}</span>
                      </div>
                    </div>
                    {t.descricaoLivre && <p className="text-[11px] text-text-muted mt-1 mb-0 leading-relaxed">{t.descricaoLivre}</p>}
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === "custom" && (
            <form onSubmit={addCustom} className="flex flex-col gap-3.5">
              <div>
                <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Nome *</label>
                <input autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da técnica" className="ficha-input"
                  onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                />
              </div>
              <div className="grid gap-2.5" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Nível</label>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button" onClick={() => setNivel(n)} style={{ flex: 1, padding: "7px 0", background: nivel === n ? "#7C3AED" : "#0A0A0A", border: `1px solid ${nivel === n ? "#7C3AED" : "#2A2A2A"}`, borderRadius: 2, cursor: "pointer", color: nivel === n ? "#FFF" : "#6B7280", fontSize: 12, fontWeight: 700 }}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Custo ⚡</label>
                  <input type="number" min={0} value={custo} onChange={e => setCusto(e.target.value)} className="ficha-input text-center"
                    onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Perícia Base</label>
                <select value={pericia} onChange={e => setPericia(e.target.value)} className="ficha-input cursor-pointer"
                  onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                >
                  {ALL_SKILLS.map(s => <option key={s.nome} value={s.nome}>{s.nome} ({s.atributoBase})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Tipo de Dano</label>
                <div className="flex gap-1">
                  {["FISICO","ENERGETICO","MENTAL","ESPIRITUAL"].map(d => (
                    <button key={d} type="button" onClick={() => setTipoDano(tipoDano === d ? "" : d)} style={{ flex: 1, padding: "6px 0", background: tipoDano === d ? `${DANO_COLORS_T[d]}22` : "#0A0A0A", border: `1px solid ${tipoDano === d ? DANO_COLORS_T[d] : "#2A2A2A"}`, borderRadius: 2, cursor: "pointer", color: tipoDano === d ? DANO_COLORS_T[d] : "#6B7280", fontSize: 8, fontWeight: 700 }}>{d.charAt(0)+d.slice(1).toLowerCase()}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Dado de Dano <span className="text-text-ghost">(ex: 2d6)</span></label>
                <input value={damageDice} onChange={e => setDamageDice(e.target.value)} placeholder="ex: 2d6, 1d8+2" className="ficha-input"
                  onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                />
              </div>
              <div>
                <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Descrição</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="ficha-input resize-none"
                  onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                />
              </div>
              {error && <p className="text-xs text-red-500 m-0">{error}</p>}
              <button type="submit" disabled={saving || !nome.trim()} style={{ padding: "10px", background: saving || !nome.trim() ? "#1A1A1A" : "#7C3AED", border: "none", borderRadius: 3, cursor: saving || !nome.trim() ? "not-allowed" : "pointer", color: saving || !nome.trim() ? "#52525B" : "#FFF", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Cinzel, serif" }}>
                {saving ? "Adicionando…" : "✦ Adicionar Técnica"}
              </button>
            </form>
          )}
        </div>

        {mode === "biblioteca" && error && (
          <div className="px-[22px] py-2 border-t border-border-subtle shrink-0">
            <p className="text-xs text-red-500 m-0">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit Technique Modal ─────────────────────────────────────────────────────
function EditTechniqueModal({ t, characterId, backendToken, onSaved, onClose }: {
  t: Technique; characterId: string; backendToken: string;
  onSaved: (updated: Technique) => void; onClose: () => void;
}) {
  const [nome, setNome]           = useState(t.nome);
  const [nivel, setNivel]         = useState(t.nivel);
  const [pericia, setPericia]     = useState(t.skillNome ?? ALL_SKILLS.find(s => s.atributoBase === t.atributoBase)?.nome ?? ALL_SKILLS[0].nome);
  const [custo, setCusto]         = useState(String(t.custoEnergia));
  const [tipoDano, setTipoDano]   = useState(t.tipoDano ?? "");
  const [damageDice, setDamageDice] = useState(t.damageDice ?? "");
  const [desc, setDesc]           = useState(t.descricaoLivre);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError("Nome é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      const res = await apiCall<Technique>(`/characters/${characterId}/techniques/${t.id}`, backendToken, {
        method: "PATCH",
        body: { nome: nome.trim(), nivel, custoEnergia: parseInt(custo) || 0, atributoBase: ALL_SKILLS.find(s => s.nome === pericia)?.atributoBase ?? "INT", skillNome: pericia, descricaoLivre: desc.trim(), tipoDano: tipoDano || null, damageDice: damageDice.trim() || null },
      });
      onSaved(res);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Erro."); setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/[0.78] backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#111] border border-border rounded-md w-full max-w-[480px] max-h-[80vh] flex flex-col" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.12)" }}>
        <div className="px-[22px] pt-[18px] pb-[14px] border-b border-border-subtle flex items-center justify-between shrink-0">
          <span className="text-[13px] font-bold text-text-near tracking-[0.06em] font-cinzel">Editar Técnica</span>
          <button onClick={onClose} className="bg-none border-none cursor-pointer text-text-faint text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-[22px] py-4 flex flex-col gap-3.5">
          <div>
            <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Nome *</label>
            <input autoFocus value={nome} onChange={e => setNome(e.target.value)} className="ficha-input"
              onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
              onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
            />
          </div>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Nível</label>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setNivel(n)} style={{ flex: 1, padding: "7px 0", background: nivel === n ? "#7C3AED" : "#0A0A0A", border: `1px solid ${nivel === n ? "#7C3AED" : "#2A2A2A"}`, borderRadius: 2, cursor: "pointer", color: nivel === n ? "#FFF" : "#6B7280", fontSize: 12, fontWeight: 700 }}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Custo ⚡</label>
              <input type="number" min={0} value={custo} onChange={e => setCusto(e.target.value)} className="ficha-input text-center"
                onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Perícia Base</label>
            <select value={pericia} onChange={e => setPericia(e.target.value)} className="ficha-input cursor-pointer"
              onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
              onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
            >
              {ALL_SKILLS.map(s => <option key={s.nome} value={s.nome}>{s.nome} ({s.atributoBase})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Tipo de Dano</label>
            <div className="flex gap-1">
              {["FISICO","ENERGETICO","MENTAL","ESPIRITUAL"].map(d => (
                <button key={d} type="button" onClick={() => setTipoDano(tipoDano === d ? "" : d)} style={{ flex: 1, padding: "6px 0", background: tipoDano === d ? `${DANO_COLORS_T[d]}22` : "#0A0A0A", border: `1px solid ${tipoDano === d ? DANO_COLORS_T[d] : "#2A2A2A"}`, borderRadius: 2, cursor: "pointer", color: tipoDano === d ? DANO_COLORS_T[d] : "#6B7280", fontSize: 8, fontWeight: 700 }}>{d.charAt(0)+d.slice(1).toLowerCase()}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Dado de Dano <span className="text-text-ghost">(ex: 2d6)</span></label>
            <input value={damageDice} onChange={e => setDamageDice(e.target.value)} placeholder="ex: 2d6, 1d8+2" className="ficha-input"
              onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
              onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
            />
          </div>
          <div>
            <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Descrição</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="ficha-input resize-none"
              onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
              onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
            />
          </div>
          {error && <p className="text-xs text-red-500 m-0">{error}</p>}
          <button type="submit" disabled={saving || !nome.trim()} style={{ padding: "10px", background: saving || !nome.trim() ? "#1A1A1A" : "#7C3AED", border: "none", borderRadius: 3, cursor: saving || !nome.trim() ? "not-allowed" : "pointer", color: saving || !nome.trim() ? "#52525B" : "#FFF", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Cinzel, serif" }}>
            {saving ? "Salvando…" : "✦ Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Talento Card ─────────────────────────────────────────────────────────────
function TalentoCard({ link, onDelete }: { link: CharacterTalentoLink; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const t = link.talento;
  return (
    <div className="bg-bg-input border border-border border-l-[3px] border-l-[#7C3AED] rounded-[0_2px_2px_0] overflow-hidden">
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-text-base overflow-hidden text-ellipsis whitespace-nowrap">{t.nome}</div>
          <span className="text-[9px] text-brand-light border border-brand/30 px-1.5 py-px rounded-sm">{t.tipo}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {t.descricao && (
            <button onClick={() => setExpanded(e => !e)}
              className="w-6 h-6 flex items-center justify-center text-text-faint text-xs cursor-pointer bg-transparent border-none hover:text-text-base transition-colors">
              {expanded ? "▲" : "▼"}
            </button>
          )}
          <button onClick={onDelete}
            className="w-6 h-6 flex items-center justify-center text-red-700 text-xs cursor-pointer bg-transparent border-none hover:text-red-500 transition-colors">✕</button>
        </div>
      </div>
      {expanded && t.descricao && (
        <div className="px-3.5 pb-3 border-t border-border-subtle pt-2">
          <p className="text-[11px] text-text-dim m-0 leading-relaxed">{t.descricao}</p>
        </div>
      )}
    </div>
  );
}

// ─── Add Talento Modal ────────────────────────────────────────────────────────
function AddTalentoModal({ characterId, backendToken, existing, onAdded, onClose }: {
  characterId: string;
  backendToken: string;
  existing: string[];
  onAdded: (link: CharacterTalentoLink) => void;
  onClose: () => void;
}) {
  type Mode = "catalogo" | "novo";
  const [mode, setMode]       = useState<Mode>("catalogo");
  const [catalog, setCatalog] = useState<TalentoData[] | null>(null);
  const [search, setSearch]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  // form "novo"
  const [nome, setNome]      = useState("");
  const [tipo, setTipo]      = useState("passiva");
  const [descricao, setDesc] = useState("");

  const TIPOS = ["passiva", "ativa", "reacao"];

  useEffect(() => {
    if (mode === "catalogo" && catalog === null) {
      apiCall<TalentoData[]>("/seeds/talentos", backendToken)
        .then(setCatalog).catch(() => setCatalog([]));
    }
  }, [mode, catalog, backendToken]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function addFromCatalog(t: TalentoData) {
    setSaving(true); setError("");
    try {
      const res = await apiCall<CharacterTalentoLink>(`/talentos/character/${characterId}/${t.id}`, backendToken, { method: "POST" });
      onAdded(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro."); setSaving(false); }
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError("Nome é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      const created = await apiCall<TalentoData>("/talentos", backendToken, {
        method: "POST",
        body: { nome: nome.trim(), tipo, descricao: descricao.trim() },
      });
      const res = await apiCall<CharacterTalentoLink>(`/talentos/character/${characterId}/${created.id}`, backendToken, { method: "POST" });
      onAdded(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro."); setSaving(false); }
  }

  const visible = (catalog ?? []).filter(t =>
    !existing.includes(t.id) && (!search || t.nome.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[300] bg-black/[0.78] backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#111] border border-border rounded-md w-full max-w-[480px] max-h-[80vh] flex flex-col"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.15)" }}
      >
        {/* Header */}
        <div className="px-[22px] pt-[18px] pb-[14px] border-b border-border-subtle flex items-center justify-between shrink-0">
          <span className="text-[13px] font-bold text-text-near tracking-[0.06em] font-cinzel">Adicionar Talento</span>
          <button onClick={onClose} className="bg-none border-none cursor-pointer text-text-faint text-lg leading-none">×</button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-border-subtle shrink-0">
          {(["catalogo", "novo"] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1, padding: "10px 0", background: "none", border: "none", cursor: "pointer",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", fontFamily: "Cinzel, serif",
                color: mode === m ? "#A855F7" : "#52525B",
                borderBottom: `2px solid ${mode === m ? "#A855F7" : "transparent"}`, marginBottom: -1,
              }}>
              {m === "catalogo" ? "CATÁLOGO" : "CRIAR NOVO"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-[22px] py-4">

          {/* ── Catálogo ── */}
          {mode === "catalogo" && (
            <>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar talento…"
                className="ficha-input mb-3"
                onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
              />
              {catalog === null && <p className="text-text-faint text-xs text-center">Carregando…</p>}
              {catalog !== null && visible.length === 0 && (
                <p className="text-text-ghost text-xs text-center">
                  {(catalog ?? []).length === 0 ? "Nenhum talento criado ainda." : "Nenhum talento encontrado."}
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                {visible.map(t => (
                  <button key={t.id} onClick={() => addFromCatalog(t)} disabled={saving}
                    style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", borderLeft: "3px solid #7C3AED", borderRadius: "0 3px 3px 0", padding: "10px 14px", cursor: saving ? "not-allowed" : "pointer", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#1F1F1F")}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[13px] font-semibold text-text-base">{t.nome}</span>
                      <span className="text-[9px] text-brand-light border border-brand/30 px-1.5 py-px rounded-sm shrink-0">{t.tipo}</span>
                    </div>
                    {t.descricao && <p className="text-[10px] text-text-faint mt-1 m-0 text-left line-clamp-2">{t.descricao}</p>}
                  </button>
                ))}
              </div>
              {error && <p className="text-xs text-red-500 mt-2 m-0">{error}</p>}
            </>
          )}

          {/* ── Criar novo ── */}
          {mode === "novo" && (
            <form onSubmit={createAndAdd} className="flex flex-col gap-3.5">
              <div>
                <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Nome *</label>
                <input autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Reflexos Aguçados" className="ficha-input"
                  onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                />
              </div>
              <div>
                <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Tipo</label>
                <div className="flex gap-1">
                  {TIPOS.map(t => (
                    <button key={t} type="button" onClick={() => setTipo(t)}
                      style={{ flex: 1, padding: "6px 0", background: tipo === t ? "rgba(124,58,237,0.2)" : "#0A0A0A", border: `1px solid ${tipo === t ? "#7C3AED" : "#2A2A2A"}`, borderRadius: 2, cursor: "pointer", color: tipo === t ? "#A78BFA" : "#6B7280", fontSize: 10, fontWeight: 700 }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Descrição</label>
                <textarea value={descricao} onChange={e => setDesc(e.target.value)} rows={4} placeholder="Descreva o talento…" className="ficha-input resize-none"
                  onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                />
              </div>
              {error && <p className="text-xs text-red-500 m-0">{error}</p>}
              <button type="submit" disabled={saving || !nome.trim()}
                style={{ padding: "10px", background: saving || !nome.trim() ? "#1A1A1A" : "#7C3AED", border: "none", borderRadius: 3, cursor: saving || !nome.trim() ? "not-allowed" : "pointer", color: saving || !nome.trim() ? "#52525B" : "#FFF", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Cinzel, serif" }}>
                {saving ? "Criando…" : "✦ Criar e Adicionar"}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Add Inventory Modal ───────────────────────────────────────────────────────
function AddInventoryModal({ characterId, backendToken, skillIdMap, onAddedWeapon, onAddedItem, onClose }: {
  characterId: string; backendToken: string;
  skillIdMap: Record<string, string>;
  onAddedWeapon: (w: Weapon) => void;
  onAddedItem: (inv: InventoryItemData) => void;
  onClose: () => void;
}) {
  type Section = "arma" | "item";
  type WeaponMode = "catalogo" | "custom";
  type ItemMode = "catalogo" | "novo";

  const [section, setSection] = useState<Section>("arma");

  // ── Arma state ──
  const [weaponMode, setWeaponMode]   = useState<WeaponMode>("catalogo");
  const [templates, setTemplates]     = useState<WeaponTemplate[] | null>(null);
  const [wSearch, setWSearch]         = useState("");
  const [pendingTemplate, setPendingTemplate] = useState<WeaponTemplate | null>(null);
  const [skillNome, setSkillNome]     = useState("");
  const [wNome, setWNome]             = useState("");
  const [wDice, setWDice]             = useState("1d6");
  const [wDamType, setWDamType]       = useState("FISICO");
  const [wThreat, setWThreat]         = useState("20");
  const [wCrit, setWCrit]             = useState("2");
  const [wDesc, setWDesc]             = useState("");

  // ── Item state ──
  const [itemMode, setItemMode]       = useState<ItemMode>("catalogo");
  const [itemCatalog, setItemCatalog] = useState<ItemCatalog[] | null>(null);
  const [iSearch, setISearch]         = useState("");
  const [iNome, setINome]             = useState("");
  const [iDesc, setIDesc]             = useState("");
  const [iTipo, setITipo]             = useState("misc");
  const [iPeso, setIPeso]             = useState("0");
  const [iValor, setIValor]           = useState("0");

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const skillNames = Object.keys(skillIdMap).sort();
  const TIPO_COLORS: Record<string, string> = { FISICO: "#EF4444", ENERGETICO: "#8B5CF6", MENTAL: "#3B82F6", ESPIRITUAL: "#10B981" };
  const ITEM_TIPOS = ["misc", "consumivel", "equipamento", "quest", "material"] as const;

  useEffect(() => {
    if (section === "arma" && weaponMode === "catalogo" && templates === null) {
      apiCall<WeaponTemplate[]>("/seeds/weapon-templates", backendToken)
        .then(setTemplates).catch(() => setTemplates([]));
    }
    if (section === "item" && itemMode === "catalogo" && itemCatalog === null) {
      apiCall<ItemCatalog[]>("/items", backendToken)
        .then(setItemCatalog).catch(() => setItemCatalog([]));
    }
  }, [section, weaponMode, itemMode, templates, itemCatalog, backendToken]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // ── Weapon actions ──
  async function confirmTemplate(t: WeaponTemplate) {
    setSaving(true); setError("");
    const skillId = skillNome ? skillIdMap[skillNome] : undefined;
    try {
      const res = await apiCall<Weapon>(`/characters/${characterId}/weapons`, backendToken, {
        method: "POST",
        body: { nome: t.nome, damageDice: t.damageDice, damageType: t.tipoDano, threatRange: t.threatRange, criticalMultiplier: t.criticalMultiplier, ...(skillId ? { skillId } : {}) },
      });
      onAddedWeapon(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro."); setSaving(false); }
  }

  async function addCustomWeapon(e: React.FormEvent) {
    e.preventDefault();
    if (!wNome.trim() || !wDice.trim()) { setError("Nome e dado de dano são obrigatórios."); return; }
    setSaving(true); setError("");
    const skillId = skillNome ? skillIdMap[skillNome] : undefined;
    try {
      const res = await apiCall<Weapon>(`/characters/${characterId}/weapons`, backendToken, {
        method: "POST",
        body: { nome: wNome.trim(), damageDice: wDice.trim(), damageType: wDamType, threatRange: parseInt(wThreat) || 20, criticalMultiplier: parseInt(wCrit) || 2, descricao: wDesc.trim(), ...(skillId ? { skillId } : {}) },
      });
      onAddedWeapon(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro."); setSaving(false); }
  }

  // ── Item actions ──
  async function addItemFromCatalog(item: ItemCatalog) {
    setSaving(true); setError("");
    try {
      const res = await apiCall<InventoryItemData>(`/characters/${characterId}/inventory`, backendToken, {
        method: "POST",
        body: { itemId: item.id, quantidade: 1 },
      });
      onAddedItem(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro."); setSaving(false); }
  }

  async function createAndAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!iNome.trim()) { setError("Nome é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      const newItem = await apiCall<ItemCatalog>("/items", backendToken, {
        method: "POST",
        body: { nome: iNome.trim(), descricao: iDesc.trim(), tipo: iTipo, peso: parseFloat(iPeso) || 0, valor: parseInt(iValor) || 0 },
      });
      const res = await apiCall<InventoryItemData>(`/characters/${characterId}/inventory`, backendToken, {
        method: "POST",
        body: { itemId: newItem.id, quantidade: 1 },
      });
      onAddedItem(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro."); setSaving(false); }
  }

  const accentColor = section === "arma" ? "#EF4444" : "#7C3AED";
  const visibleTemplates = (templates ?? []).filter(t => !wSearch || t.nome.toLowerCase().includes(wSearch.toLowerCase()));
  const visibleItems = (itemCatalog ?? []).filter(i => !iSearch || i.nome.toLowerCase().includes(iSearch.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/[0.78] backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#111] border border-border rounded-md w-full max-w-[520px] max-h-[80vh] flex flex-col" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}>

        {/* Header */}
        <div className="px-[22px] pt-[18px] pb-[14px] border-b border-border-subtle flex items-center justify-between shrink-0">
          <span className="text-[13px] font-bold text-text-near tracking-[0.06em] font-cinzel">Adicionar ao Inventário</span>
          <button onClick={onClose} className="bg-none border-none cursor-pointer text-text-faint text-lg leading-none">×</button>
        </div>

        {/* Section toggle: Arma vs Item */}
        <div className="flex border-b border-border-subtle shrink-0">
          {(["arma", "item"] as Section[]).map(s => (
            <button key={s} onClick={() => { setSection(s); setError(""); setPendingTemplate(null); }}
              style={{
                flex: 1, padding: "10px 0", background: "none", border: "none", cursor: "pointer",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", fontFamily: "Cinzel, serif",
                color: section === s ? accentColor : "#52525B",
                borderBottom: `2px solid ${section === s ? accentColor : "transparent"}`, marginBottom: -1,
              }}>
              {s === "arma" ? "⚔ ARMA" : "📦 ITEM"}
            </button>
          ))}
        </div>

        {/* ── ARMA ── */}
        {section === "arma" && (
          <>
            <div className="flex border-b border-border-subtle shrink-0">
              {(["catalogo", "custom"] as WeaponMode[]).map(m => (
                <button key={m} onClick={() => { setWeaponMode(m); setError(""); setPendingTemplate(null); }}
                  style={{
                    flex: 1, padding: "8px 0", background: "none", border: "none", cursor: "pointer",
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Cinzel, serif",
                    color: weaponMode === m ? "#EF4444" : "#52525B",
                    borderBottom: `2px solid ${weaponMode === m ? "#EF4444" : "transparent"}`, marginBottom: -1,
                  }}>
                  {m === "catalogo" ? "CATÁLOGO" : "PERSONALIZADA"}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-[22px] py-4">
              {weaponMode === "catalogo" && !pendingTemplate && (
                <>
                  <input value={wSearch} onChange={e => setWSearch(e.target.value)} placeholder="Buscar…"
                    className="ficha-input mb-3"
                    onFocus={e => (e.currentTarget.style.borderColor = "#EF4444")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                  />
                  {templates === null && <p className="text-text-faint text-xs text-center">Carregando…</p>}
                  {visibleTemplates.length === 0 && templates !== null && <p className="text-text-ghost text-xs text-center">Nenhuma arma encontrada.</p>}
                  <div className="flex flex-col gap-1.5">
                    {visibleTemplates.map(t => (
                      <button key={t.id} onClick={() => { setPendingTemplate(t); setSkillNome(""); setError(""); }} disabled={saving}
                        style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", borderLeft: `3px solid ${TIPO_COLORS[t.tipoDano] ?? "#991B1B"}`, borderRadius: "0 3px 3px 0", padding: "10px 14px", cursor: saving ? "not-allowed" : "pointer", textAlign: "left" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "#EF4444")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "#1F1F1F")}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[13px] font-semibold text-text-base">{t.nome}</span>
                          <div className="flex gap-2 items-center">
                            <span className="text-sm font-extrabold text-red-500">{t.damageDice}</span>
                            <span className="text-[9px] text-text-faint">{t.categoria}</span>
                          </div>
                        </div>
                        <div className="flex gap-2.5 mt-1">
                          <span className="text-[10px] text-text-muted">{t.distancia}</span>
                          {t.duasMaos && <span className="text-[10px] text-amber-400">2 mãos</span>}
                          {t.requiresMarcial && <span className="text-[10px] text-red-500">Marcial</span>}
                          {t.threatRange < 20 && <span className="text-[10px] text-amber-400">Crit ≥{t.threatRange}</span>}
                          {t.regraEspecial && <span className="text-[10px] text-violet-400">{t.regraEspecial}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {weaponMode === "catalogo" && pendingTemplate && (
                <div className="flex flex-col gap-4">
                  <div style={{ background: "#0A0A0A", border: `1px solid #1F1F1F`, borderLeft: `3px solid ${TIPO_COLORS[pendingTemplate.tipoDano] ?? "#991B1B"}`, borderRadius: "0 3px 3px 0", padding: "12px 16px" }}>
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-semibold text-text-base">{pendingTemplate.nome}</span>
                      <span className="text-sm font-extrabold text-red-500">{pendingTemplate.damageDice}</span>
                    </div>
                    <div className="flex gap-2.5 mt-1">
                      <span className="text-[10px] text-text-muted">{pendingTemplate.distancia}</span>
                      {pendingTemplate.threatRange < 20 && <span className="text-[10px] text-amber-400">Crit ≥{pendingTemplate.threatRange}</span>}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1.5 font-cinzel">Perícia utilizada</label>
                    <select value={skillNome} onChange={e => setSkillNome(e.target.value)} className="ficha-input" style={{ borderColor: "#2A2A2A", cursor: "pointer" }}>
                      <option value="">— Sem perícia (usa FOR) —</option>
                      {skillNames.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {error && <p className="text-xs text-red-500 m-0">{error}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setPendingTemplate(null); setError(""); }} style={{ flex: 1, padding: "9px", background: "transparent", border: "1px solid #3F3F46", borderRadius: 3, cursor: "pointer", color: "#9CA3AF", fontSize: 11, fontWeight: 600 }}>← Voltar</button>
                    <button type="button" onClick={() => confirmTemplate(pendingTemplate)} disabled={saving} style={{ flex: 2, padding: "9px", background: saving ? "#1A1A1A" : "#991B1B", border: "none", borderRadius: 3, cursor: saving ? "not-allowed" : "pointer", color: saving ? "#52525B" : "#FFF", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Cinzel, serif" }}>
                      {saving ? "Adicionando…" : "✦ Adicionar"}
                    </button>
                  </div>
                </div>
              )}

              {weaponMode === "custom" && (
                <form onSubmit={addCustomWeapon} className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Nome *</label>
                    <input autoFocus value={wNome} onChange={e => setWNome(e.target.value)} placeholder="Ex.: Espada Longa" className="ficha-input"
                      onFocus={e => (e.currentTarget.style.borderColor = "#EF4444")}
                      onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Perícia utilizada</label>
                    <select value={skillNome} onChange={e => setSkillNome(e.target.value)} className="ficha-input" style={{ borderColor: "#2A2A2A", cursor: "pointer" }}>
                      <option value="">— Sem perícia (usa FOR) —</option>
                      {skillNames.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Dado de Dano *</label>
                      <input value={wDice} onChange={e => setWDice(e.target.value)} placeholder="Ex.: 1d8" className="ficha-input"
                        onFocus={e => (e.currentTarget.style.borderColor = "#EF4444")}
                        onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Tipo de Dano</label>
                      <div className="flex gap-0.5">
                        {["FISICO","ENERGETICO","MENTAL","ESPIRITUAL"].map(d => (
                          <button key={d} type="button" onClick={() => setWDamType(d)} style={{ flex: 1, padding: "7px 0", background: wDamType === d ? `${TIPO_COLORS[d]}22` : "#0A0A0A", border: `1px solid ${wDamType === d ? TIPO_COLORS[d] : "#2A2A2A"}`, borderRadius: 2, cursor: "pointer", color: wDamType === d ? TIPO_COLORS[d] : "#6B7280", fontSize: 8, fontWeight: 700 }}>
                            {d.charAt(0)+d.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Ameaça (crítico ≥)</label>
                      <input type="number" min={1} max={20} value={wThreat} onChange={e => setWThreat(e.target.value)} className="ficha-input text-center"
                        onFocus={e => (e.currentTarget.style.borderColor = "#EF4444")}
                        onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Multiplicador Crítico</label>
                      <input type="number" min={1} value={wCrit} onChange={e => setWCrit(e.target.value)} className="ficha-input text-center"
                        onFocus={e => (e.currentTarget.style.borderColor = "#EF4444")}
                        onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Descrição</label>
                    <textarea value={wDesc} onChange={e => setWDesc(e.target.value)} rows={2} placeholder="Detalhes da arma (opcional)" className="ficha-input resize-none"
                      onFocus={e => (e.currentTarget.style.borderColor = "#EF4444")}
                      onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                    />
                  </div>
                  {error && <p className="text-xs text-red-500 m-0">{error}</p>}
                  <button type="submit" disabled={saving || !wNome.trim()} style={{ padding: "10px", background: saving || !wNome.trim() ? "#1A1A1A" : "#991B1B", border: "none", borderRadius: 3, cursor: saving || !wNome.trim() ? "not-allowed" : "pointer", color: saving || !wNome.trim() ? "#52525B" : "#FFF", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Cinzel, serif" }}>
                    {saving ? "Adicionando…" : "✦ Adicionar Arma"}
                  </button>
                </form>
              )}
            </div>
          </>
        )}

        {/* ── ITEM ── */}
        {section === "item" && (
          <>
            <div className="flex border-b border-border-subtle shrink-0">
              {(["catalogo", "novo"] as ItemMode[]).map(m => (
                <button key={m} onClick={() => { setItemMode(m); setError(""); }}
                  style={{
                    flex: 1, padding: "8px 0", background: "none", border: "none", cursor: "pointer",
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Cinzel, serif",
                    color: itemMode === m ? "#7C3AED" : "#52525B",
                    borderBottom: `2px solid ${itemMode === m ? "#7C3AED" : "transparent"}`, marginBottom: -1,
                  }}>
                  {m === "catalogo" ? "CATÁLOGO" : "CRIAR NOVO"}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-[22px] py-4">
              {itemMode === "catalogo" && (
                <>
                  <input value={iSearch} onChange={e => setISearch(e.target.value)} placeholder="Buscar item…"
                    className="ficha-input mb-3"
                    onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                  />
                  {itemCatalog === null && <p className="text-text-faint text-xs text-center">Carregando…</p>}
                  {visibleItems.length === 0 && itemCatalog !== null && (
                    <p className="text-text-ghost text-xs text-center">Nenhum item encontrado. Crie um novo!</p>
                  )}
                  <div className="flex flex-col gap-1.5">
                    {visibleItems.map(item => (
                      <button key={item.id} onClick={() => addItemFromCatalog(item)} disabled={saving}
                        style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", borderLeft: "3px solid #7C3AED", borderRadius: "0 3px 3px 0", padding: "10px 14px", cursor: saving ? "not-allowed" : "pointer", textAlign: "left" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "#1F1F1F")}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[13px] font-semibold text-text-base">{item.nome}</span>
                          <span className="text-[9px] text-text-faint bg-[#1A1A1A] border border-border px-1.5 py-px rounded-sm">{item.tipo}</span>
                        </div>
                        {item.descricao && <p className="text-[10px] text-text-faint mt-1 m-0 text-left line-clamp-1">{item.descricao}</p>}
                      </button>
                    ))}
                  </div>
                  {error && <p className="text-xs text-red-500 mt-2 m-0">{error}</p>}
                </>
              )}

              {itemMode === "novo" && (
                <form onSubmit={createAndAddItem} className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Nome *</label>
                    <input autoFocus value={iNome} onChange={e => setINome(e.target.value)} placeholder="Ex.: Poção de cura" className="ficha-input"
                      onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                      onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Tipo</label>
                    <div className="flex gap-1 flex-wrap">
                      {ITEM_TIPOS.map(t => (
                        <button key={t} type="button" onClick={() => setITipo(t)}
                          style={{ padding: "5px 10px", background: iTipo === t ? "rgba(124,58,237,0.2)" : "#0A0A0A", border: `1px solid ${iTipo === t ? "#7C3AED" : "#2A2A2A"}`, borderRadius: 2, cursor: "pointer", color: iTipo === t ? "#A78BFA" : "#6B7280", fontSize: 10, fontWeight: 700 }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Descrição</label>
                    <textarea value={iDesc} onChange={e => setIDesc(e.target.value)} rows={2} placeholder="Descrição do item (opcional)" className="ficha-input resize-none"
                      onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                      onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Peso (kg)</label>
                      <input type="number" min={0} step={0.1} value={iPeso} onChange={e => setIPeso(e.target.value)} className="ficha-input text-center"
                        onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                        onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Valor (moedas)</label>
                      <input type="number" min={0} value={iValor} onChange={e => setIValor(e.target.value)} className="ficha-input text-center"
                        onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                        onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                      />
                    </div>
                  </div>
                  {error && <p className="text-xs text-red-500 m-0">{error}</p>}
                  <button type="submit" disabled={saving || !iNome.trim()} style={{ padding: "10px", background: saving || !iNome.trim() ? "#1A1A1A" : "#7C3AED", border: "none", borderRadius: 3, cursor: saving || !iNome.trim() ? "not-allowed" : "pointer", color: saving || !iNome.trim() ? "#52525B" : "#FFF", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Cinzel, serif" }}>
                    {saving ? "Criando…" : "✦ Criar e Adicionar"}
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Edit Weapon Modal ────────────────────────────────────────────────────────
function EditWeaponModal({ characterId, backendToken, weapon, skillIdMap, onSaved, onClose }: {
  characterId: string; backendToken: string;
  weapon: Weapon; skillIdMap: Record<string, string>;
  onSaved: (w: Weapon) => void; onClose: () => void;
}) {
  const [nome, setNome]         = useState(weapon.nome);
  const [dice, setDice]         = useState(weapon.damageDice);
  const [damType, setDamType]   = useState(weapon.damageType);
  const [threat, setThreat]     = useState(String(weapon.threatRange));
  const [crit, setCrit]         = useState(String(weapon.criticalMultiplier));
  const [descricao, setDescricao] = useState(weapon.descricao ?? "");
  const [skillNome, setSkillNome] = useState(weapon.skill?.nome ?? "");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const skillNames = Object.keys(skillIdMap).sort();

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !dice.trim()) { setError("Nome e dado de dano são obrigatórios."); return; }
    setSaving(true); setError("");
    const skillId = skillNome ? skillIdMap[skillNome] : null;
    try {
      const res = await apiCall<Weapon>(`/characters/${characterId}/weapons/${weapon.id}`, backendToken, {
        method: "PATCH",
        body: {
          nome: nome.trim(),
          damageDice: dice.trim(),
          damageType: damType,
          threatRange: parseInt(threat) || 20,
          criticalMultiplier: parseInt(crit) || 2,
          descricao: descricao.trim(),
          skillId: skillId ?? null,
        },
      });
      onSaved(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao salvar."); setSaving(false); }
  }

  const inp = {
    width: "100%", padding: "7px 9px", background: "#0A0A0A",
    border: "1px solid #2A2A2A", borderRadius: 2, color: "#D1D5DB", fontSize: 12, outline: "none",
  } as React.CSSProperties;
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = "#EF4444");
  const blur  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = "#2A2A2A");
  const DAM_TYPES = ["FISICO", "ENERGETICO", "MENTAL", "ESPIRITUAL"];

  return (
    <div className="fixed inset-0 z-300 bg-black/78 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#111] border border-border rounded-md w-full max-w-130 flex flex-col"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(153,27,27,0.15)" }}>
        <div className="px-5.5 pt-4.5 pb-3.5 border-b border-border-subtle flex items-center justify-between shrink-0">
          <span className="text-[13px] font-bold text-text-near tracking-widest font-cinzel">Editar Arma</span>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-text-faint text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 px-5.5 py-4 overflow-y-auto">
          <div>
            <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Nome *</label>
            <input autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da arma" style={inp} onFocus={focus} onBlur={blur} />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Dado de Dano *</label>
              <input value={dice} onChange={e => setDice(e.target.value)} placeholder="ex: 1d8" style={inp} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Tipo de Dano</label>
              <select value={damType} onChange={e => setDamType(e.target.value)} style={{ ...inp, cursor: "pointer" }} onFocus={focus} onBlur={blur}>
                {DAM_TYPES.map(d => <option key={d} value={d}>{d.toLowerCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Ameaça Crítico</label>
              <input type="number" value={threat} onChange={e => setThreat(e.target.value)} min={1} max={20} style={inp} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Mult. Crítico</label>
              <input type="number" value={crit} onChange={e => setCrit(e.target.value)} min={1} max={5} style={inp} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Perícia</label>
              <select value={skillNome} onChange={e => setSkillNome(e.target.value)} style={{ ...inp, cursor: "pointer" }} onFocus={focus} onBlur={blur}>
                <option value="">— Nenhuma —</option>
                {skillNames.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
              placeholder="Propriedades especiais, notas…" style={{ ...inp, resize: "none", fontFamily: "Inter, sans-serif" }} onFocus={focus} onBlur={blur} />
          </div>

          {error && <p className="text-xs text-red-500 m-0">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "9px", background: "transparent", border: "1px solid #2A2A2A",
              borderRadius: 2, cursor: "pointer", color: "#6B7280", fontSize: 11, fontWeight: 700,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#E5E7EB")}
            onMouseLeave={e => (e.currentTarget.style.color = "#6B7280")}>
              Cancelar
            </button>
            <button type="submit" disabled={saving || !nome.trim()} style={{
              flex: 2, padding: "9px", borderRadius: 2, fontSize: 12, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Cinzel, serif",
              background: saving || !nome.trim() ? "#1A1A1A" : "#991B1B",
              border: "none", cursor: saving || !nome.trim() ? "not-allowed" : "pointer",
              color: saving || !nome.trim() ? "#52525B" : "#FFF",
            }}>
              {saving ? "Salvando…" : "✦ Salvar Arma"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Ability Modal ────────────────────────────────────────────────────────

function AddAbilityModal({ characterId, backendToken, onAdded, onClose }: {
  characterId: string; backendToken: string;
  onAdded: (a: CharacterAbility) => void; onClose: () => void;
}) {
  const [nome, setNome]             = useState("");
  const [tipo, setTipo]             = useState("ativa");
  const [custo, setCusto]           = useState("nenhum");
  const [alcance, setAlcance]       = useState("pessoal");
  const [duracao, setDuracao]       = useState("imediato");
  const [descricao, setDesc]        = useState("");
  const [damageDice, setDamageDice] = useState("");
  const [atributoBase, setAtributoBase] = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError("Nome é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      const res = await apiCall<CharacterAbility>(`/characters/${characterId}/abilities`, backendToken, {
        method: "POST",
        body: {
          nome: nome.trim(), tipo,
          custo: custo.trim() || "nenhum",
          alcance: alcance.trim() || "pessoal",
          duracao: duracao.trim() || "imediato",
          descricao: descricao.trim(),
          damageDice: damageDice.trim() || null,
          atributoBase: atributoBase || null,
        },
      });
      onAdded(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro."); setSaving(false); }
  }

  const inp = {
    width: "100%", padding: "7px 9px", background: "#0A0A0A",
    border: "1px solid #2A2A2A", borderRadius: 2, color: "#D1D5DB",
    fontSize: 12, outline: "none",
  } as React.CSSProperties;
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = "#F59E0B");
  const blur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = "#2A2A2A");

  const TIPOS = ["ativa", "passiva", "reação"];

  return (
    <div className="fixed inset-0 z-300 bg-black/78 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#111] border border-border rounded-md w-full max-w-130 flex flex-col"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(245,158,11,0.12)" }}>
        <div className="px-5.5 pt-4.5 pb-3.5 border-b border-border-subtle flex items-center justify-between shrink-0">
          <span className="text-[13px] font-bold text-text-near tracking-widest font-cinzel">Nova Habilidade</span>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-text-faint text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 px-5.5 py-4 overflow-y-auto">
          <div>
            <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Nome *</label>
            <input autoFocus value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Nome da habilidade" style={inp} onFocus={focus} onBlur={blur} />
          </div>

          <div>
            <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Tipo</label>
            <div className="flex gap-1">
              {TIPOS.map(t => (
                <button key={t} type="button" onClick={() => setTipo(t)} style={{
                  flex: 1, padding: "7px 0", borderRadius: 2, cursor: "pointer", fontSize: 10, fontWeight: 700,
                  background: tipo === t ? "rgba(245,158,11,0.15)" : "#0A0A0A",
                  border: `1px solid ${tipo === t ? "#F59E0B" : "#2A2A2A"}`,
                  color: tipo === t ? "#F59E0B" : "#6B7280",
                }}>{t}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Custo</label>
              <input value={custo} onChange={e => setCusto(e.target.value)} placeholder="ex: 2 energia" style={inp} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Alcance</label>
              <input value={alcance} onChange={e => setAlcance(e.target.value)} placeholder="ex: 6m" style={inp} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Duração</label>
              <input value={duracao} onChange={e => setDuracao(e.target.value)} placeholder="ex: 1 rodada" style={inp} onFocus={focus} onBlur={blur} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Dado de Dano</label>
              <input value={damageDice} onChange={e => setDamageDice(e.target.value)}
                placeholder="ex: 2d6, 1d8+2" style={inp} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Perícia Base</label>
              <select value={atributoBase} onChange={e => setAtributoBase(e.target.value)} style={{ ...inp, cursor: "pointer" }} onFocus={focus} onBlur={blur}>
                <option value="">— Nenhuma —</option>
                {ALL_SKILLS.map(s => <option key={s.nome} value={s.nome}>{s.nome} ({s.atributoBase})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[9px] text-text-faint tracking-[0.12em] uppercase block mb-1 font-cinzel">Descrição</label>
            <textarea value={descricao} onChange={e => setDesc(e.target.value)}
              rows={3} placeholder="Descreva o efeito da habilidade…"
              style={{ ...inp, resize: "none" }} onFocus={focus} onBlur={blur} />
          </div>

          {error && <p className="text-xs text-red-500 m-0">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "9px", background: "transparent", border: "1px solid #2A2A2A",
              borderRadius: 2, cursor: "pointer", color: "#6B7280", fontSize: 11, fontWeight: 700,
            }}>Cancelar</button>
            <button type="submit" disabled={saving || !nome.trim()} style={{
              flex: 2, padding: "9px", borderRadius: 2, fontSize: 12, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Cinzel, serif",
              background: saving || !nome.trim() ? "#1A1A1A" : "#92400E",
              border: `1px solid ${saving || !nome.trim() ? "#2A2A2A" : "#F59E0B"}`,
              cursor: saving || !nome.trim() ? "not-allowed" : "pointer",
              color: saving || !nome.trim() ? "#52525B" : "#FDE68A",
            }}>
              {saving ? "Criando…" : "✦ Criar Habilidade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Ability Roll Inline ──────────────────────────────────────────────────────
function AbilityRoller({ onRoll }: { onRoll: (skillNome: string) => void }) {
  const [open, setOpen] = useState(false);
  const [skill, setSkill] = useState(ALL_SKILLS[0].nome);
  return open ? (
    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <select
        value={skill}
        onChange={e => setSkill(e.target.value)}
        className="ficha-input text-[10px] px-1 py-0.5"
        style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 2, color: "#A78BFA", cursor: "pointer", width: 100 }}
      >
        {ALL_SKILLS.map(s => <option key={s.nome} value={s.nome}>{s.nome}</option>)}
      </select>
      <button
        onClick={() => { onRoll(skill); setOpen(false); }}
        className="bg-transparent border-none cursor-pointer text-amber-400 p-0.5 flex items-center rounded-sm transition-colors duration-150"
        style={{ fontSize: 10, fontWeight: 700, fontFamily: "Cinzel, serif" }}
      ><Dices size={13} /></button>
      <button onClick={() => setOpen(false)} className="bg-transparent border-none cursor-pointer text-text-ghost p-0.5 text-[10px] leading-none">×</button>
    </div>
  ) : (
    <button
      onClick={e => { e.stopPropagation(); setOpen(true); }}
      className="bg-transparent border-none cursor-pointer text-text-faint p-0.5 flex items-center rounded-sm transition-colors duration-150"
      title="Rolar com perícia"
      onMouseEnter={e => (e.currentTarget.style.color = "#F59E0B")}
      onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
    ><Dices size={13} /></button>
  );
}

// ─── Select Aptidão Modal ─────────────────────────────────────────────────────
const TIPO_COLOR: Record<string, string> = {
  buff: "#3B82F6",
  dano: "#EF4444",
  cura: "#22C55E",
};

function getCategoria(nome: string, descricao: string): string {
  const dominioNomes = [
    "Domínio Simples", "Anular Técnica", "Espaço em Batalha", "Dominância Absoluta",
    "Expansão de Domínio Incompleta", "Expansão de Domínio Completa", "Expansão de Domínio Sem Barreiras",
    "Acerto Garantido", "Amplificação de Domínio",
  ];
  const controleLeitNomes = [
    "Rastreio Avançado", "Leitura Rápida de Energia", "Canalizar em Golpe", "Canalização Avançada",
    "Canalização Máxima", "Cobrir-se", "Cobertura Avançada", "Projetar Energia", "Projeção Avançada",
    "Projeção Máxima", "Projeção Dividida", "Expandir Aura", "Identificação de Itens", "Leitura de Aura",
    "Punho Divergente", "Estímulo Muscular", "Estímulo Muscular Avançado",
  ];
  if (dominioNomes.includes(nome) || descricao.includes("Aptidão em Domínio")) return "Domínio";
  if (controleLeitNomes.includes(nome) || descricao.includes("Aptidão em Controle e Leitura")) return "Controle e Leitura";
  return "Aura";
}

function SelectAptidaoModal({ characterId, backendToken, level, alreadyHas, onAdded, onClose, onError }: {
  characterId: string; backendToken: string;
  level: number;
  alreadyHas: Set<string>;
  onAdded: (a: Aptitude) => void; onClose: () => void;
  onError?: (msg: string) => void;
}) {
  const [aptidoes, setAptidoes] = useState<AptitudeSeed[]>([]);
  const [busca, setBusca]       = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState<string | null>(null);
  const [error, setError]       = useState("");

  useEffect(() => {
    apiCall<AptitudeSeed[]>("/seeds/aptitudes", backendToken)
      .then(data => setAptidoes(data))
      .catch(() => setError("Erro ao carregar aptidões."))
      .finally(() => setLoading(false));
  }, [backendToken]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function handleSelect(apt: AptitudeSeed) {
    if (adding) return;
    setAdding(apt.id); setError("");
    try {
      const res = await apiCall<Aptitude>(`/characters/${characterId}/aptitudes/${apt.id}`, backendToken, { method: "POST" });
      onAdded(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao adicionar aptidão.";
      onError?.(msg);
      setAdding(null);
    }
  }

  const termo = busca.toLowerCase().trim();
  const filtradas = aptidoes.filter(a =>
    !termo || a.nome.toLowerCase().includes(termo) || a.descricao.toLowerCase().includes(termo)
  );

  const categorias = ["Aura", "Controle e Leitura", "Domínio"];
  const porCategoria = Object.fromEntries(
    categorias.map(cat => [cat, filtradas.filter(a => getCategoria(a.nome, a.descricao) === cat)])
  );

  return (
    <div className="fixed inset-0 z-300 bg-black/78 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#111] border border-border rounded-md w-full max-w-lg flex flex-col"
        style={{ maxHeight: "85vh", boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.14)" }}>

        {/* Header */}
        <div className="px-5 pt-4 pb-3.5 border-b border-border-subtle flex items-center justify-between shrink-0">
          <span className="text-[13px] font-bold text-text-near tracking-widest font-cinzel">Adicionar Aptidão</span>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-text-faint text-xl leading-none hover:text-text-base transition-colors">×</button>
        </div>

        {/* Busca */}
        <div className="px-5 py-3 border-b border-border-subtle shrink-0">
          <input
            autoFocus
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar aptidão…"
            style={{
              width: "100%", padding: "7px 9px", background: "#0A0A0A",
              border: "1px solid #2A2A2A", borderRadius: 2, color: "#E5E7EB",
              fontSize: 12, outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
            onBlur={e  => (e.currentTarget.style.borderColor = "#2A2A2A")}
          />
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 px-3 py-3 flex flex-col gap-4">
          {loading && <p className="text-xs text-text-muted text-center py-4">Carregando…</p>}
          {error   && <p className="text-xs text-red-500 text-center py-2">{error}</p>}
          {!loading && categorias.map(cat => {
            const lista = porCategoria[cat];
            if (!lista || lista.length === 0) return null;
            return (
              <div key={cat}>
                <div className="text-[9px] text-brand-muted tracking-[0.14em] uppercase font-cinzel font-bold mb-2 px-1">
                  {cat}
                </div>
                <div className="flex flex-col gap-1">
                  {lista.map(apt => {
                    const owned    = alreadyHas.has(apt.id);
                    const locked   = apt.prerequisitoNivel > level;
                    const isOpen   = expanded === apt.id;
                    const isAdding = adding === apt.id;
                    const color    = TIPO_COLOR[apt.tipo] ?? "#A855F7";
                    const disabled = owned || locked || !!adding;

                    return (
                      <div key={apt.id} className="rounded-[2px] border overflow-hidden"
                        style={{ borderColor: owned ? "#2A2A2A" : isOpen ? `${color}55` : "#1F1F1F", background: "#0D0D0D" }}>
                        {/* Row */}
                        <div
                          className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none"
                          style={{ opacity: locked ? 0.45 : 1 }}
                          onClick={() => !disabled && setExpanded(isOpen ? null : apt.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[12px] font-semibold" style={{ color: owned ? "#52525B" : "#E5E7EB" }}>{apt.nome}</span>
                              <span className="text-[8px] px-1 py-px rounded-sm font-bold" style={{ background: `${color}20`, color, border: `1px solid ${color}44` }}>{apt.tipo}</span>
                              {apt.prerequisitoNivel > 1 && (
                                <span className="text-[8px] text-text-faint">Nv {apt.prerequisitoNivel}</span>
                              )}
                              {apt.prerequisitoAptidao && (
                                <span className="text-[8px] text-text-faint">· Req: {apt.prerequisitoAptidao.nome}</span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5">
                            {owned ? (
                              <span className="text-[9px] text-text-faint font-cinzel">Obtida</span>
                            ) : locked ? (
                              <span className="text-[9px] text-text-faint font-cinzel">Nv {apt.prerequisitoNivel}</span>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); handleSelect(apt); }}
                                disabled={!!adding}
                                style={{
                                  padding: "4px 10px", borderRadius: 2, fontSize: 10, fontWeight: 700,
                                  fontFamily: "Cinzel, serif", letterSpacing: "0.06em", cursor: adding ? "not-allowed" : "pointer",
                                  background: isAdding ? "#1A1A1A" : `${color}22`,
                                  border: `1px solid ${isAdding ? "#2A2A2A" : color}`,
                                  color: isAdding ? "#52525B" : color,
                                }}
                              >
                                {isAdding ? "…" : "+ Obter"}
                              </button>
                            )}
                            <span className="text-text-faint text-[10px]">{isOpen ? "▲" : "▼"}</span>
                          </div>
                        </div>
                        {/* Descrição expandida */}
                        {isOpen && (
                          <div className="px-3 pb-3 text-[11px] text-text-dim leading-relaxed border-t border-border-subtle pt-2">
                            {apt.descricao}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!loading && filtradas.length === 0 && (
            <p className="text-xs text-text-muted text-center py-4">Nenhuma aptidão encontrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
type Tab = "combate" | "tecnicas" | "inventario" | "aptidoes" | "talentos" | "habilidades";
const TABS: { id: Tab; label: string }[] = [
  { id: "tecnicas",    label: "TÉCNICAS"    },
  { id: "inventario",  label: "INVENTÁRIO"  },
  { id: "habilidades", label: "HABILIDADES" },
  { id: "aptidoes",    label: "APTIDÕES"    },
  { id: "talentos",    label: "TALENTOS"    },
  { id: "combate",     label: "COMBATE"     },
];

export function CharacterSheet({ character }: { character: Character }) {
  const { data: session } = useSession();
  const router = useRouter();
  const backendToken = (session?.user as any)?.backendToken as string | undefined;
  const userId = (session?.user as any)?.backendUserId as string | undefined;
  const sKey = storageKey(userId);

  const [attrs, setAttrs] = useState<Attrs>(
    character.attributes ?? { FOR: 0, AGI: 0, VIG: 0, INT: 0, PRE: 0 }
  );
  // Map: skillName → pontosInvestidos
  const [skillPoints, setSkillPoints] = useState<Record<string, number>>(
    Object.fromEntries(
      character.skills.map(cs => [cs.skill.nome, (cs as any).pontosInvestidos ?? (cs.treinada ? 1 : 0)])
    )
  );
  const [hp, setHp]               = useState(character.hpAtual);
  const [hpMax, setHpMax]         = useState(character.hpMax);
  const [energia, setEnergia]     = useState(character.energiaAtual);
  const [energiaMax, setEnergiaMax] = useState(character.energiaMax);
  const [xpAtual, setXpAtual]     = useState(character.xpAtual);
  const [nivel, setNivel]         = useState(character.nivel);
  const [grau, setGrau]           = useState(character.grau ?? "4");
  const [activeTab, setActiveTab] = useState<Tab>("tecnicas");
  const [charSpec, setCharSpec]         = useState(character.specialization);
  const [charOrigem, setCharOrigem]     = useState(character.origemRelacao ?? null);
  const [maestriaBonus, setMaestriaBonus] = useState(character.maestriaBonus);
  const [nome, setNome]                 = useState(character.nome);
  const [editingNome, setEditingNome] = useState(false);

  // ── Class / Origin selection ──
  const [specs, setSpecs]         = useState<SpecSeed[]>([]);
  const [origens, setOrigens]     = useState<OrigemSeed[]>([]);
  const [selectedSpec, setSelectedSpec]   = useState<SpecSeed | null>(null);
  const [selectedOrigem, setSelectedOrigem] = useState<OrigemSeed | null>(null);
  const [classeSaving, setClasseSaving]   = useState(false);
  const [classeError, setClasseError]     = useState("");
  const [showClasseConfirm, setShowClasseConfirm] = useState(false);

  // ── Local lists (techniques, weapons, inventory & abilities) ──
  const [localTechniques, setLocalTechniques] = useState<Technique[]>(character.techniques);
  const [localWeapons, setLocalWeapons]       = useState<Weapon[]>(character.weapons);
  const [localInventory, setLocalInventory]   = useState<InventoryItemData[]>(character.inventory ?? []);
  const [localAbilities, setLocalAbilities]   = useState<CharacterAbility[]>(character.abilities ?? []);
  const [localAptitudes, setLocalAptitudes]   = useState<Aptitude[]>(character.aptitudes);
  const [, setPendingAptidaoSlots] = useState(character.pendingAptidaoSlots ?? 0);
  const [localTalentos, setLocalTalentos]     = useState<CharacterTalentoLink[]>(character.talentos ?? []);
  const [showAddTech, setShowAddTech]         = useState(false);
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [showAddTalento, setShowAddTalento]   = useState(false);
  const [editingWeapon, setEditingWeapon]     = useState<Weapon | null>(null);
  const [editingTechnique, setEditingTechnique] = useState<Technique | null>(null);
  const [showAddAbility, setShowAddAbility]   = useState(false);
  const [showAddAptidao, setShowAddAptidao]   = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const addToast = useCallback((type: Notif["type"], raw: string) => {
    const parsed = type === "error" ? friendlyError(raw) : { title: raw, message: undefined };
    setNotifs(prev => [...prev, { id: ++_notifId, type, title: parsed.title, message: parsed.message }]);
  }, []);
  const removeNotif = useCallback((id: number) => setNotifs(prev => prev.filter(n => n.id !== id)), []);

  // ── Dice rolls ──
  const [skillIdMap, setSkillIdMap]   = useState<Record<string, string>>({});
  const [currentRoll, setCurrentRoll] = useState<DiceRoll | null>(null);
  const [rollVisible, setRollVisible] = useState(false);
  const rollIdRef   = useRef(0);
  const rollTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Specialization abilities (for HABILIDADES tab) ──
  const [specAbilities, setSpecAbilities] = useState<{
    id: string; nome: string; nivelRequerido: number; tipo: string;
    custo: string; alcance: string; duracao: string; descricao: string;
  }[]>([]);

  // ── Active combat (for COMBATE tab) ──
  const [activeCombat, setActiveCombat] = useState<{
    id: string; state: string; roundNumber: number; currentTurnIndex: number;
    participants: { id: string; ordem: number; initiative: number; hpAtual: number; energiaAtual: number;
      character: { id: string; nome: string; hpMax: number; energiaMax: number } | null;
      npc: { id: string; nome: string; hpMax: number; energiaMax: number } | null;
    }[];
  } | null>(null);

  function showRoll(label: string, dice: number, modifier: number) {
    rollIdRef.current += 1;
    if (rollTimer.current) clearTimeout(rollTimer.current);
    setCurrentRoll({ rollId: rollIdRef.current, label, dice, modifier, total: dice + modifier });
    setRollVisible(true);
    rollTimer.current = setTimeout(() => setRollVisible(false), 120_000);
  }

  async function handleRollSkill(skillNome: string) {
    const skillId = skillIdMap[skillNome];
    const skill   = ALL_SKILLS.find(s => s.nome === skillNome);
    const attrVal = skill ? (attrs[skill.atributoBase as keyof Attrs] ?? 0) : 0;
    const treinamento = skillPoints[skillNome] ?? 0;

    if (backendToken && skillId && character.campaignId) {
      try {
        const res = await apiCall<{ dice: number; total: number; attrVal: number; treinamento: number }>(
          "/roll/skill", backendToken, { method: "POST", body: { skillId, characterId: character.id, campaignId: character.campaignId } }
        );
        showRoll(skillNome, res.dice, res.attrVal + res.treinamento);
        return;
      } catch { /* fallback below */ }
    }
    const dice = Math.floor(Math.random() * 20) + 1;
    showRoll(skillNome, dice, attrVal + treinamento);
  }

  async function handleRollAttr(attr: keyof Attrs) {
    const attrVal = attrs[attr];
    if (backendToken && character.campaignId) {
      try {
        const res = await apiCall<{ dice: number; total: number; attrVal: number }>(
          "/roll/attribute", backendToken, { method: "POST", body: { characterId: character.id, attribute: attr, campaignId: character.campaignId } }
        );
        showRoll(attr, res.dice, res.attrVal);
        return;
      } catch { /* fallback */ }
    }
    const dice = Math.floor(Math.random() * 20) + 1;
    showRoll(attr, dice, attrVal);
  }

  async function handleRollTechnique(t: Technique) {
    const attrVal  = attrs[t.atributoBase as keyof Attrs] ?? 0;
    const modifier = attrVal + maestriaBonus;
    const damage   = t.damageDice ? rollDiceStr(t.damageDice) : undefined;

    rollIdRef.current += 1;
    if (rollTimer.current) clearTimeout(rollTimer.current);

    if (backendToken && t.id && character.campaignId) {
      try {
        const res = await apiCall<{ dice: number; total: number }>(
          "/roll/technique", backendToken, { method: "POST", body: { techniqueId: t.id, actorId: character.id, campaignId: character.campaignId } }
        );
        setCurrentRoll({
          rollId: rollIdRef.current, label: t.nome,
          dice: res.dice, modifier, total: res.total,
          ...(damage !== undefined ? { damage, damageDice: t.damageDice!, isCritical: false } : {}),
        });
        setRollVisible(true);
        rollTimer.current = setTimeout(() => setRollVisible(false), 120_000);
        return;
      } catch { /* fallback */ }
    }
    const dice = Math.floor(Math.random() * 20) + 1;
    setCurrentRoll({
      rollId: rollIdRef.current, label: t.nome,
      dice, modifier, total: dice + modifier,
      ...(damage !== undefined ? { damage, damageDice: t.damageDice!, isCritical: false } : {}),
    });
    setRollVisible(true);
    rollTimer.current = setTimeout(() => setRollVisible(false), 120_000);
  }

  async function handleRollSkillWithDamage(skillNome: string, damageDice?: string | null) {
    const skillId     = skillIdMap[skillNome];
    const skill       = ALL_SKILLS.find(s => s.nome === skillNome);
    const attrVal     = skill ? (attrs[skill.atributoBase as keyof Attrs] ?? 0) : 0;
    const treinamento = skillPoints[skillNome] ?? 0;
    const damage      = damageDice ? rollDiceStr(damageDice) : undefined;

    rollIdRef.current += 1;
    if (rollTimer.current) clearTimeout(rollTimer.current);

    if (backendToken && skillId && character.campaignId) {
      try {
        const res = await apiCall<{ dice: number; total: number; attrVal: number; treinamento: number }>(
          "/roll/skill", backendToken, { method: "POST", body: { skillId, characterId: character.id, campaignId: character.campaignId } }
        );
        setCurrentRoll({
          rollId: rollIdRef.current, label: skillNome,
          dice: res.dice, modifier: res.attrVal + res.treinamento, total: res.total,
          ...(damage !== undefined ? { damage, damageDice: damageDice!, isCritical: false } : {}),
        });
        setRollVisible(true);
        rollTimer.current = setTimeout(() => setRollVisible(false), 120_000);
        return;
      } catch { /* fallback */ }
    }
    const dice = Math.floor(Math.random() * 20) + 1;
    setCurrentRoll({
      rollId: rollIdRef.current, label: skillNome,
      dice, modifier: attrVal + treinamento, total: dice + attrVal + treinamento,
      ...(damage !== undefined ? { damage, damageDice: damageDice!, isCritical: false } : {}),
    });
    setRollVisible(true);
    rollTimer.current = setTimeout(() => setRollVisible(false), 120_000);
  }

  async function handleRollWeapon(w: Weapon) {
    if (backendToken && character.campaignId) {
      try {
        const res = await apiCall<{ naturalRoll: number; attackTotal: number; isCritical: boolean; finalDamage: number; baseDamage: number }>(
          "/roll/weapon-attack", backendToken, { method: "POST", body: { characterId: character.id, weaponId: w.id, campaignId: character.campaignId } }
        );
        const mod = res.attackTotal - res.naturalRoll;
        rollIdRef.current += 1;
        if (rollTimer.current) clearTimeout(rollTimer.current);
        setCurrentRoll({
          rollId: rollIdRef.current,
          label: w.nome,
          dice: res.naturalRoll,
          modifier: mod,
          total: res.attackTotal,
          damage: res.finalDamage,
          damageDice: w.damageDice,
          isCritical: res.isCritical,
        });
        setRollVisible(true);
        rollTimer.current = setTimeout(() => setRollVisible(false), 120_000);
        return;
      } catch { /* fallback */ }
    }
    // Offline fallback: roll d20 + local damage
    const dice = Math.floor(Math.random() * 20) + 1;
    const dmg = rollDiceStr(w.damageDice);
    rollIdRef.current += 1;
    if (rollTimer.current) clearTimeout(rollTimer.current);
    setCurrentRoll({ rollId: rollIdRef.current, label: w.nome, dice, modifier: 0, total: dice, damage: dmg, damageDice: w.damageDice, isCritical: false });
    setRollVisible(true);
    rollTimer.current = setTimeout(() => setRollVisible(false), 120_000);
  }

  function rollDiceStr(diceStr: string): number {
    const m = diceStr.match(/^(\d+)d(\d+)$/i);
    if (!m) return parseInt(diceStr) || 0;
    let total = 0;
    for (let i = 0; i < parseInt(m[1]); i++) total += Math.floor(Math.random() * parseInt(m[2])) + 1;
    return total;
  }

  // Load seeds on mount
  useEffect(() => {
    if (!backendToken) return;
    Promise.all([
      apiCall<SpecSeed[]>("/seeds/specializations", backendToken),
      apiCall<OrigemSeed[]>("/seeds/origens", backendToken),
      apiCall<{ id: string; nome: string }[]>("/seeds/skills", backendToken),
    ]).then(([s, o, skills]) => {
      setSpecs(s);
      setOrigens(o);
      const map: Record<string, string> = {};
      skills.forEach(sk => { map[sk.nome] = sk.id; });
      setSkillIdMap(map);
      // Pre-select current values if any
      if (character.specialization?.id) {
        const cur = s.find(x => x.id === character.specialization!.id);
        if (cur) setSelectedSpec(cur);
      } else if (character.specialization?.nome) {
        const cur = s.find(x => x.nome === character.specialization!.nome);
        if (cur) setSelectedSpec(cur);
      }
      if (character.origemRelacao?.id) {
        const cur = o.find(x => x.id === character.origemRelacao!.id);
        if (cur) setSelectedOrigem(cur);
      } else if (character.origemRelacao?.nome) {
        const cur = o.find(x => x.nome === character.origemRelacao!.nome);
        if (cur) setSelectedOrigem(cur);
      }
    }).catch(() => {/* non-critical */});
    // fetch inventory
    if (backendToken) {
      apiCall<InventoryItemData[]>(`/characters/${character.id}/inventory`, backendToken)
        .then(setLocalInventory).catch(() => {});
    }
  }, [backendToken]); // eslint-disable-line

  // Fetch spec abilities when on HABILIDADES tab and spec is set
  useEffect(() => {
    if (!backendToken || !charSpec?.id || activeTab !== "habilidades") return;
    apiCall<typeof specAbilities>(`/specializations/${charSpec.id}/abilities`, backendToken)
      .then(setSpecAbilities)
      .catch(() => {});
  }, [backendToken, charSpec?.id, activeTab]);  

  // WebSocket: join campaign room and react to updates in real-time
  useEffect(() => {
    if (!backendToken || !character.campaignId) return;
    const socket = getSocket(backendToken);

    function onConnect() {
      socket.emit("joinCampaign", { campaignId: character.campaignId });
    }

    function onCharacterUpdate(data: any) {
      if (data.id !== character.id) return;
      if (data.nome             !== undefined) setNome(data.nome);
      if (data.hpAtual          !== undefined) setHp(data.hpAtual);
      if (data.hpMax            !== undefined) setHpMax(data.hpMax);
      if (data.energiaAtual     !== undefined) setEnergia(data.energiaAtual);
      if (data.energiaMax       !== undefined) setEnergiaMax(data.energiaMax);
      if (data.attributes       !== undefined) setAttrs(data.attributes);
      if (data.xpAtual          !== undefined) setXpAtual(data.xpAtual);
      if (data.nivel            !== undefined) setNivel(data.nivel);
      if (data.maestriaBonus    !== undefined) setMaestriaBonus(data.maestriaBonus);
      if (data.pendingAptidaoSlots !== undefined) setPendingAptidaoSlots(data.pendingAptidaoSlots);
      if (data.grau             !== undefined) setGrau(data.grau);
    }

    function onCombatCreated(data: any) {
      if (data?.id) {
        apiCall<any>(`/combats/${data.id}`, backendToken!).then(setActiveCombat).catch(() => {});
      }
    }

    function onCombatUpdate(data: any) {
      if (data?.id) setActiveCombat(data);
    }

    function onCombatFinished() {
      setActiveCombat(null);
    }

    if (socket.connected) onConnect();
    socket.on("connect", onConnect);
    socket.on("characterUpdate", onCharacterUpdate);
    socket.on("combatCreated",   onCombatCreated);
    socket.on("combatUpdate",    onCombatUpdate);
    socket.on("combatFinished",  onCombatFinished);

    return () => {
      socket.off("connect",         onConnect);
      socket.off("characterUpdate", onCharacterUpdate);
      socket.off("combatCreated",   onCombatCreated);
      socket.off("combatUpdate",    onCombatUpdate);
      socket.off("combatFinished",  onCombatFinished);
      socket.emit("leaveCampaign", { campaignId: character.campaignId });
    };
  }, [backendToken, character.campaignId, character.id]);  

  // Initial fetch for active combat when on COMBATE tab (socket keeps it updated after)
  useEffect(() => {
    if (!backendToken || !character.campaignId || activeTab !== "combate") return;
    let cancelled = false;
    async function fetchCombat() {
      try {
        const camp = await apiCall<{ combats?: { id: string; state: string }[] }>(`/campaigns/${character.campaignId}`, backendToken!);
        const activeCombatMeta = (camp as any).combats?.find((c: { state: string }) =>
          !["IDLE", "COMBAT_FINISHED"].includes(c.state)
        );
        if (activeCombatMeta && !cancelled) {
          const combat = await apiCall<any>(`/combats/${activeCombatMeta.id}`, backendToken!);
          if (!cancelled) setActiveCombat(combat);
        } else if (!activeCombatMeta && !cancelled) {
          setActiveCombat(null);
        }
      } catch { /* ignore */ }
    }
    fetchCombat();
    return () => { cancelled = true; };
  }, [backendToken, character.campaignId, activeTab]);  

  async function handleSalvarClasse() {
    if (!backendToken || !selectedSpec) { setClasseError("Selecione pelo menos uma especialização."); return; }
    setClasseSaving(true);
    setClasseError("");
    try {
      const updated = await apiCall<any>(`/characters/${character.id}/class-origin`, backendToken, {
        method: "PATCH",
        body: {
          specializationId: selectedSpec.id,
          ...(selectedOrigem ? { origemId: selectedOrigem.id } : {}),
        },
      });
      // Update local state from response
      if (updated.attributes) setAttrs(updated.attributes);
      if (updated.specialization) setCharSpec(updated.specialization);
      setCharOrigem(updated.origemRelacao ?? null);
      if (updated.maestriaBonus !== undefined) setMaestriaBonus(updated.maestriaBonus);
      const newHpMax = updated.hpMax;
      const newHp    = Math.min(hp, newHpMax);
      const newEnMax = updated.energiaMax;
      const newEn    = Math.min(energia, newEnMax);
      setHpMax(newHpMax);
      setHp(newHp);
      setEnergiaMax(newEnMax);
      setEnergia(newEn);
      // Update skills: auto-trained fixed skills are reflected immediately
      if (updated.skills && Array.isArray(updated.skills)) {
        const newSkillPoints: Record<string, number> = { ...skillPoints };
        for (const cs of updated.skills) {
          if (cs.skill?.nome) newSkillPoints[cs.skill.nome] = cs.pontosInvestidos ?? 0;
        }
        setSkillPoints(newSkillPoints);
      }
      persist(sKey, {
        attributes: updated.attributes,
        specialization: updated.specialization,
        origemRelacao: updated.origemRelacao,
        maestriaBonus: updated.maestriaBonus,
        hpMax: newHpMax,
        hpAtual: newHp,
        energiaMax: newEnMax,
        energiaAtual: newEn,
        skills: updated.skills,
      });
      setActiveTab("tecnicas");
    } catch (e: unknown) {
      setClasseError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setClasseSaving(false);
    }
  }

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleExcluir() {
    if (!backendToken) return;
    setDeleting(true);
    try {
      await apiCall(`/characters/${character.id}`, backendToken, { method: "DELETE" });
      localStorage.removeItem(sKey);
      router.push("/ficha");
    } catch (e: unknown) {
      setClasseError(e instanceof Error ? e.message : "Erro ao excluir.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  // ── Debounce helper for HP/energia (fire rapidly) ──
  const statsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStats = useRef<Record<string, number>>({});

  const flushStats = useCallback(() => {
    if (!backendToken || Object.keys(pendingStats.current).length === 0) return;
    const patch = { ...pendingStats.current };
    pendingStats.current = {};
    apiCall(`/characters/${character.id}/stats`, backendToken, { method: "PATCH", body: patch })
      .catch(e => console.warn("stats sync failed:", e));
  }, [backendToken, character.id]);

  const debouncedStatPatch = useCallback((field: string, value: number) => {
    pendingStats.current[field] = value;
    if (statsTimer.current) clearTimeout(statsTimer.current);
    statsTimer.current = setTimeout(flushStats, 600);
  }, [flushStats]);

  // ── Handlers ──
  const handleAttrChange = (attr: keyof Attrs, delta: number) => {
    const newVal = Math.max(0, Math.min(10, attrs[attr] + delta));
    const newAttrs = { ...attrs, [attr]: newVal };
    setAttrs(newAttrs);
    persist(sKey, { attributes: newAttrs });
    if (backendToken) {
      apiCall(`/characters/${character.id}/attributes`, backendToken, {
        method: "PATCH", body: { [attr]: newVal },
      }).catch(e => console.warn("attr sync failed:", e));
    }
  };

  // ── Skill training cost system ──
  // Custo incremental por step: 0→5=1pt, 5→10=2pt, 10→15=3pt, 15→20=4pt
  // Custo acumulado de uma perícia: skillCost(n) = sum(1..n/5) = (n/5)(n/5+1)/2
  const skillCost = (pontos: number) => { const s = pontos / 5; return s * (s + 1) / 2; };
  const stepCostUp = (current: number) => (current + 5) / 5; // custo do próximo step

  const grantedSkillNames = new Set([
    ...((charSpec as any)?.habilidadesTreinadas ?? []),
    ...(charOrigem?.habilidadesTreinadas ?? []),
  ]);
  const maestryPool    = maestriaBonus;
  const maestrySpent   = ALL_SKILLS.reduce((sum, s) => sum + skillCost(skillPoints[s.nome] ?? 0), 0);
  const maestryFree    = maestryPool - maestrySpent;

  const handleSkillPoints = (skillName: string, delta: number) => {
    const current = skillPoints[skillName] ?? 0;
    const snapped = Math.round(current / 5) * 5;
    const next = Math.max(0, Math.min(20, snapped + delta));
    if (delta > 0) {
      const cost = stepCostUp(snapped);
      if (cost > maestryFree) {
        addToast("warning", `Pontos de maestria insuficientes — necessário: ${cost}, disponível: ${maestryFree}`);
        return;
      }
    }
    const next2 = { ...skillPoints, [skillName]: next };
    setSkillPoints(next2);
    persist(sKey, { skills: ALL_SKILLS.map(s => ({ skill: s, treinada: (next2[s.nome] ?? 0) > 0, pontosInvestidos: next2[s.nome] ?? 0 })) });
    if (backendToken) {
      apiCall(`/characters/${character.id}/skills/by-name`, backendToken, {
        method: "PATCH",
        body: { skillName, pontosInvestidos: next, treinada: next > 0 },
      }).catch(e => console.warn("skill sync failed:", e));
    }
  };

  const handleHpChange      = (v: number) => { setHp(v);       persist(sKey, { hpAtual: v });      debouncedStatPatch("hpAtual", v); };
  const handleHpMaxChange   = (v: number) => { setHpMax(v);    persist(sKey, { hpMax: v });        debouncedStatPatch("hpMax", v); };
  const handleEnChange      = (v: number) => { setEnergia(v);  persist(sKey, { energiaAtual: v }); debouncedStatPatch("energiaAtual", v); };
  const handleEnMaxChange   = (v: number) => { setEnergiaMax(v); persist(sKey, { energiaMax: v }); debouncedStatPatch("energiaMax", v); };

  // ── Carga ──
  const forValue = attrs?.FOR ?? 0;
  const capacidadeInventario = Math.max(5, Math.ceil(forValue / 2) * 5);
  const totalCarregando = localWeapons.length + localInventory.reduce((sum, i) => sum + i.quantidade, 0);

  // ── Defesa ──
  const [defesaOutros, setDefesaOutros] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(storageKey(userId));
      return raw ? (JSON.parse(raw).defesaOutros ?? 0) : 0;
    } catch { return 0; }
  });
  const defesa = 10 + (attrs.AGI ?? 0) + defesaOutros;
  const xpNext = XP_TABLE[nivel] ?? 355000;
  const xpPct  = Math.min(100, (xpAtual / xpNext) * 100);

  return (
    <div className="h-screen pt-[68px] px-4 pb-4 bg-bg-dark overflow-hidden font-sans">
      <div
        className="grid gap-3 h-full max-w-[1600px] mx-auto"
        style={{ gridTemplateColumns: "320px 1fr 1fr" }}
      >

        {/* ══════════════ LEFT ══════════════ */}
        <div className="flex flex-col gap-2.5 overflow-y-auto pr-0.5">

          {/* Header */}
          <div className="bg-bg-surface border border-border rounded overflow-hidden p-4 shrink-0">
            <div className="flex gap-3.5 items-start">
              <div className="w-14 h-14 bg-bg-input border border-border-md rounded-sm shrink-0 flex items-center justify-center relative">
                <User size={22} color="#2A2A2A" />
                {(["tl","tr","bl","br"] as const).map(p => (
                  <div key={p} style={{ position: "absolute", top: p.startsWith("t") ? -3 : undefined, bottom: p.startsWith("b") ? -3 : undefined, left: p.endsWith("l") ? -3 : undefined, right: p.endsWith("r") ? -3 : undefined, width: 5, height: 5, background: "#2A2A2A" }} />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="grid gap-x-3.5 gap-y-2.5" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  {/* Nome — editável */}
                  <div>
                    <div className="text-[9px] text-text-faint uppercase tracking-[0.1em] mb-0.5">Personagem</div>
                    {editingNome ? (
                      <input
                        autoFocus
                        value={nome}
                        onChange={e => setNome(e.target.value)}
                        onBlur={async () => {
                          setEditingNome(false);
                          const trimmed = nome.trim();
                          if (!trimmed || trimmed === character.nome) {
                            if (!trimmed) setNome(character.nome);
                            return;
                          }
                          if (!backendToken) return;
                          try {
                            await apiCall(`/characters/${character.id}/nome`, backendToken, {
                              method: "PATCH", body: { nome: trimmed },
                            });
                            persist(sKey, { nome: trimmed });
                          } catch {
                            // reverte se o backend falhou
                            setNome(character.nome);
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          if (e.key === "Escape") { setNome(nome); setEditingNome(false); }
                        }}
                        maxLength={60}
                        style={{
                          background: "transparent", border: "none", borderBottom: "1px solid #7C3AED",
                          color: "#E5E7EB", fontSize: 13, fontWeight: 600, outline: "none",
                          width: "100%", padding: "0 0 1px",
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => setEditingNome(true)}
                        title="Clique para editar"
                        className="text-[13px] font-semibold text-text-base overflow-hidden text-ellipsis whitespace-nowrap cursor-text"
                      >
                        {nome}
                      </div>
                    )}
                  </div>

                  {/* Nível — sempre visível */}
                  <div>
                    <div className="text-[9px] text-text-faint uppercase tracking-[0.1em] mb-0.5">Nível</div>
                    <div className="text-[13px] font-semibold text-text-base">{nivel}</div>
                  </div>

                  {/* Grau — sempre visível, read-only */}
                  <div>
                    <div className="text-[9px] text-text-faint uppercase tracking-[0.1em] mb-0.5">Grau</div>
                    <div className="text-[13px] font-semibold" style={{
                      color: grau === "ESPECIAL" ? "#F59E0B" : grau === "SEMI-ESPECIAL" ? "#A855F7" : "#E5E7EB"
                    }}>{grau}</div>
                  </div>

                  {charSpec ? (
                    /* ── Confirmado: somente leitura ── */
                    <>
                      <div>
                        <div className="text-[9px] text-text-faint uppercase tracking-[0.1em] mb-0.5">Origem</div>
                        <div className="text-[13px] font-semibold text-text-base overflow-hidden text-ellipsis whitespace-nowrap">{charOrigem?.nome ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-text-faint uppercase tracking-[0.1em] mb-0.5">Classe</div>
                        <div className="text-[13px] font-semibold text-brand-light overflow-hidden text-ellipsis whitespace-nowrap">{charSpec.nome}</div>
                      </div>
                    </>
                  ) : (
                    /* ── Seleção inline ── */
                    <div style={{ gridColumn: "1 / -1" }} className="flex flex-col gap-2 pt-1">
                      <div>
                        <div className="text-[9px] text-text-faint uppercase tracking-[0.1em] mb-0.5">Especialização *</div>
                        <select
                          value={selectedSpec?.id ?? ""}
                          onChange={e => { setClasseError(""); setSelectedSpec(specs.find(x => x.id === e.target.value) ?? null); }}
                          style={{ width: "100%", padding: "6px 8px", background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 2, color: selectedSpec ? "#A855F7" : "#6B7280", fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}
                          onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                          onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                        >
                          <option value="">Selecionar…</option>
                          {specs.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                        </select>
                      </div>
                      <div>
                        <div className="text-[9px] text-text-faint uppercase tracking-[0.1em] mb-0.5">Origem</div>
                        <select
                          value={selectedOrigem?.id ?? ""}
                          onChange={e => { setClasseError(""); setSelectedOrigem(origens.find(x => x.id === e.target.value) ?? null); }}
                          style={{ width: "100%", padding: "6px 8px", background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 2, color: selectedOrigem ? "#60A5FA" : "#6B7280", fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}
                          onFocus={e => (e.currentTarget.style.borderColor = "#3B82F6")}
                          onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                        >
                          <option value="">Selecionar…</option>
                          {origens.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                        </select>
                      </div>
                      {classeError && <p style={{ margin: 0, fontSize: 10, color: "#EF4444" }}>{classeError}</p>}
                      {selectedSpec && (
                        <button
                          onClick={() => setShowClasseConfirm(true)}
                          style={{ padding: "7px", background: "#7C3AED", border: "none", borderRadius: 2, cursor: "pointer", color: "#FFF", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Cinzel, serif", boxShadow: "0 0 12px rgba(124,58,237,0.3)" }}
                        >✦ Confirmar Seleção</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border-subtle flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" style={{ boxShadow: "0 0 6px #22C55E88" }} />
              <span className="text-[11px] text-text-faint">Campanha: <span className="text-text-dim">{character.campaign.name}</span></span>
              {character.isApproved && <span className="ml-auto text-[9px] text-green-500 border border-green-900 px-1.5 py-px rounded-sm">Aprovado</span>}
            </div>
          </div>

          {/* Attribute ring */}
          <div className="bg-bg-surface border border-border rounded overflow-hidden px-3 pt-4 pb-3 shrink-0">
            <div className="text-center text-[9px] font-bold text-text-ghost tracking-[0.2em] uppercase font-cinzel mb-1">
              Atributos <span className="text-[#27272A] font-normal">— passe o mouse para editar</span>
            </div>
            <AttributeRing attrs={attrs} maestriaBonus={maestriaBonus} onChangeAttr={handleAttrChange} onRollAttr={handleRollAttr} />
            <div className="flex items-center gap-2.5 px-1 pt-2.5 pb-0.5">
              <span className="text-[8px] text-text-faint font-bold tracking-[0.14em] uppercase min-w-[20px]">XP</span>
              <div className="flex-1 h-[3px] bg-border-subtle rounded overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#2A2A2A] to-[#D1D5DB] transition-[width_0.4s_ease]" style={{ width: `${xpPct}%` }} />
              </div>
              <span className="text-[10px] text-text-faint min-w-[80px] text-right">{xpAtual.toLocaleString("pt-BR")} / {xpNext.toLocaleString("pt-BR")}</span>
            </div>
          </div>

          {/* Status bars */}
          <div className="bg-bg-surface border border-border rounded overflow-hidden p-4 flex flex-col gap-3 shrink-0">
            <StatusBar
              label="Pontos de Vida"
              current={hp} max={hpMax}
              color="#EF4444" dimColor="#7F1D1D"
              onChange={handleHpChange}
              onChangeMax={handleHpMaxChange}
            />
            <StatusBar
              label={charSpec?.nome === "Restringido" ? "Pontos de Vigor" : "Energia Amaldiçoada"}
              current={energia} max={energiaMax}
              color={charSpec?.nome === "Restringido" ? "#22C55E" : "#A855F7"}
              dimColor={charSpec?.nome === "Restringido" ? "#14532D" : "#4C1D95"}
              onChange={handleEnChange}
              onChangeMax={handleEnMaxChange}
            />
          </div>

          {/* Defense */}
          <div className="bg-bg-surface border border-border rounded overflow-hidden px-4 py-3.5 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <svg width="54" height="60" viewBox="0 0 54 60" fill="none">
                  <path d="M27 3L5 13V33C5 46 27 57 27 57C27 57 49 46 49 33V13L27 3Z" fill="#0A0A0A" stroke="#2A2A2A" strokeWidth="1.5" />
                  <path d="M27 9L10 18V32C10 41.5 27 51 27 51C27 51 44 41.5 44 32V18L27 9Z" fill="transparent" stroke="#1F1F1F" strokeWidth="1" />
                </svg>
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[52%] text-lg font-extrabold text-white">{defesa}</span>
              </div>
              <div className="flex-1">
                <div className="text-[9px] text-text-faint uppercase tracking-[0.14em] mb-1.5 font-cinzel">10 + AGI + outros</div>
                <div className="flex gap-1.5 items-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="text-center text-[11px] font-bold px-1 py-0.5 text-brand-muted"
                      style={{ width: 42, background: "#0A0A0A", border: "1px solid #1F1F1F", borderRadius: 2, lineHeight: "1.6" }}>
                      AGI
                    </div>
                    <span className="text-[8px] text-text-faint">({attrs.AGI ?? 0})</span>
                  </div>
                  <span className="text-text-ghost text-xs">+</span>
                  <div className="flex flex-col items-center gap-0.5">
                    <input
                      type="number"
                      value={defesaOutros}
                      onChange={e => {
                        const v = parseInt(e.target.value) || 0;
                        setDefesaOutros(v);
                        persist(sKey, { defesaOutros: v });
                      }}
                      className="ficha-input text-center text-[11px] font-bold px-1 py-0.5"
                      style={{ width: 42, background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 2, color: "#E5E7EB" }}
                    />
                    <span className="text-[8px] text-text-faint">outros</span>
                  </div>
                </div>
              </div>
              <div className="text-center px-3.5 py-2 bg-bg-input border border-border rounded-sm">
                <div className="text-[9px] text-text-faint uppercase tracking-[0.12em] mb-0.5">Maestria</div>
                <div className="text-[22px] font-extrabold text-brand leading-none">+{maestriaBonus}</div>
                <div className="text-[8px] text-text-ghost mt-0.5">{maestrySpent}/{maestryPool} pts</div>
              </div>
            </div>
          </div>

          {/* Excluir ficha */}
          <div className="shrink-0 px-1">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-transparent border border-[#27272A] rounded-sm cursor-pointer text-text-ghost text-[10px] font-semibold transition-all duration-150"
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#EF4444"; e.currentTarget.style.color = "#EF4444"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#27272A"; e.currentTarget.style.color = "#52525B"; }}
              ><Trash2 size={11} /> Excluir Ficha</button>
            ) : (
              <div className="flex gap-2 items-center">
                <span className="text-[10px] text-red-500 flex-1">Confirmar exclusão?</span>
                <button onClick={handleExcluir} disabled={deleting} className="px-3 py-1 bg-red-900 border-none rounded-sm cursor-pointer text-white text-[10px] font-bold" style={{ cursor: deleting ? "not-allowed" : "pointer" }}>{deleting ? "…" : "Excluir"}</button>
                <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 bg-transparent border border-[#3F3F46] rounded-sm cursor-pointer text-text-muted text-[10px]">Cancelar</button>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════ MIDDLE — Perícias ══════════════ */}
        <div className="bg-bg-surface border border-border rounded overflow-hidden flex flex-col">
          <div className="px-[18px] py-3 border-b border-border-subtle flex justify-between items-center shrink-0">
            <span className="text-[11px] font-bold text-text-base tracking-[0.18em] uppercase font-cinzel">Perícias</span>
            <span className="text-[9px]" style={{ color: maestryFree === 0 ? "#F59E0B" : "#3F3F46" }}>
              Maestria: {maestrySpent}/{maestryPool} pts · passos de 5
            </span>
          </div>

          <div className="grid gap-0.5 px-[18px] py-[7px] border-b border-border-subtle shrink-0" style={{ gridTemplateColumns: "1fr 36px 40px 90px" }}>
            {(["PERÍCIA", "BÔN.", "DADO", "TREINAMENTO"] as const).map((h, i) => (
              <span key={h} className={`text-[9px] text-text-ghost font-bold uppercase tracking-[0.08em] ${i === 0 ? "text-left" : "text-center"}`}>{h}</span>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {ALL_SKILLS.map((skill, i) => {
              const pontos   = skillPoints[skill.nome] ?? 0;
              const treinada = pontos > 0;
              const attrVal  = attrs[skill.atributoBase as keyof Attrs] ?? 0;
              return (
                <div key={skill.nome} className="grid gap-0.5 px-[18px] py-[5px] items-center border-b border-[rgba(26,26,26,0.9)]" style={{ gridTemplateColumns: "1fr 36px 40px 90px", background: i % 2 !== 0 ? "rgba(255,255,255,0.012)" : "transparent" }}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      onClick={() => handleRollSkill(skill.nome)}
                      title={`Rolar ${skill.nome}`}
                      className="bg-transparent border-none cursor-pointer text-text-ghost p-px flex items-center rounded-sm shrink-0 transition-colors duration-150"
                      onMouseEnter={e => (e.currentTarget.style.color = "#A855F7")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#3F3F46")}
                    ><Dices size={12} /></button>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      background: treinada ? "#3B82F6" : "#1F1F1F",
                      boxShadow: treinada ? "0 0 5px rgba(59,130,246,0.5)" : "none",
                    }} />
                    <span className={`text-xs overflow-hidden text-ellipsis whitespace-nowrap ${treinada ? "font-medium text-text-base" : "font-normal text-text-muted"}`}>
                      {skill.nome}
                    </span>
                    <span className="text-[9px] text-text-ghost shrink-0">({skill.atributoBase})</span>
                  </div>

                  <span className={`text-[13px] font-bold text-center ${(attrVal + pontos) > 0 ? "text-text-light" : "text-text-ghost"}`}>
                    +{attrVal + pontos}
                  </span>

                  <span className="text-[10px] text-text-ghost text-center">d20</span>

                  <div className="flex items-center justify-center gap-0.5">
                    <button
                      onClick={() => handleSkillPoints(skill.nome, -5)}
                      disabled={pontos === 0}
                      style={{
                        width: 16, height: 16, border: "none", borderRadius: 2,
                        cursor: pontos === 0 ? "default" : "pointer",
                        background: pontos === 0 ? "transparent" : "#1A1A1A",
                        color: pontos === 0 ? "#2A2A2A" : "#9CA3AF",
                        fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 0, lineHeight: 1,
                      }}
                      onMouseEnter={e => { if (pontos > 0) e.currentTarget.style.background = "#7F1D1D"; }}
                      onMouseLeave={e => { if (pontos > 0) e.currentTarget.style.background = "#1A1A1A"; }}
                    >−</button>
                    <span style={{
                      fontSize: 12, fontWeight: 700, minWidth: 22, textAlign: "center",
                      color: pontos >= 15 ? "#A855F7" : pontos >= 10 ? "#3B82F6" : pontos > 0 ? "#D1D5DB" : "#3F3F46",
                      borderBottom: `1px solid ${pontos > 0 ? "#2A2A2A" : "transparent"}`,
                      paddingBottom: 1,
                    }}>{pontos}</span>
                    {(() => {
                      const nextCost = stepCostUp(pontos);
                      const cantAfford = nextCost > maestryFree;
                      const disabled = pontos === 20 || cantAfford;
                      return (
                        <button
                          onClick={() => handleSkillPoints(skill.nome, 5)}
                          disabled={disabled}
                          title={cantAfford ? `Sem pontos de maestria (custo: ${nextCost}, disponível: ${maestryFree})` : `+5 (custo: ${nextCost} pt)`}
                          style={{
                            width: 16, height: 16, border: "none", borderRadius: 2,
                            cursor: disabled ? "default" : "pointer",
                            background: disabled ? "transparent" : "#1A1A1A",
                            color: disabled ? "#2A2A2A" : "#9CA3AF",
                            fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                            padding: 0, lineHeight: 1,
                          }}
                          onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "#7C3AED"; }}
                          onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = "#1A1A1A"; }}
                        >+</button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-[18px] py-[7px] border-t border-border-subtle shrink-0">
            <span className="text-[10px] text-text-ghost">
              ● Bônus = atributo + treinamento · Custo por passo: +5=1pt, +10=2pt, +15=3pt, +20=4pt ·{" "}
              <span style={{ color: maestryFree === 0 ? "#EF4444" : maestryFree <= 1 ? "#F59E0B" : "#9CA3AF" }}>
                Maestria: {maestrySpent}/{maestryPool} pts gastos ({maestryFree} livre{maestryFree !== 1 ? "s" : ""})
              </span>
            </span>
          </div>

          {/* Custom Dice Roller */}
          <div className="px-[18px] py-[10px] border-t border-border-subtle shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-text-faint font-bold uppercase tracking-[0.12em] shrink-0">Dado</span>
              <input
                placeholder="XdY (ex: 2d6)"
                maxLength={12}
                style={{
                  flex: 1, background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 2,
                  color: "#D1D5DB", fontSize: 12, padding: "5px 8px", outline: "none",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const expr = (e.currentTarget as HTMLInputElement).value.trim();
                    const m = expr.match(/^(\d+)d(\d+)$/i);
                    if (m) {
                      let total = 0;
                      for (let i = 0; i < parseInt(m[1]); i++) total += Math.floor(Math.random() * parseInt(m[2])) + 1;
                      showRoll(expr, total, 0);
                      (e.currentTarget as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <button
                style={{
                  padding: "5px 10px", background: "transparent", border: "1px solid #2A2A2A",
                  borderRadius: 2, cursor: "pointer", color: "#6B7280", fontSize: 11, fontWeight: 700,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.color = "#A855F7"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#6B7280"; }}
                onClick={e => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  const expr = input?.value?.trim();
                  const m = expr?.match(/^(\d+)d(\d+)$/i);
                  if (m) {
                    let total = 0;
                    for (let i = 0; i < parseInt(m[1]); i++) total += Math.floor(Math.random() * parseInt(m[2])) + 1;
                    showRoll(expr, total, 0);
                    if (input) input.value = "";
                  }
                }}
              ><Dices size={13} /></button>
            </div>
          </div>
        </div>

        {/* ══════════════ RIGHT — Tabs ══════════════ */}
        <div className="bg-bg-surface border border-border rounded overflow-hidden flex flex-col">
          <div className="flex border-b border-border-subtle shrink-0">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: "11px 2px", background: "transparent", border: "none", cursor: "pointer",
                fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
                fontFamily: "Cinzel, serif", whiteSpace: "nowrap",
                color: activeTab === tab.id ? "#A855F7" : "#52525B",
                borderBottom: activeTab === tab.id ? "2px solid #7C3AED" : "2px solid transparent",
                transition: "color 0.15s",
              }}
                onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = "#9CA3AF"; }}
                onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = "#52525B"; }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">

            {activeTab === "tecnicas" && (
              <div className="flex flex-col gap-2">
                {/* Técnica info — canto superior esquerdo */}
                <div className="bg-bg-input border border-brand/20 rounded-sm px-3 py-2 flex gap-4 text-[10px]">
                  <div>
                    <div className="text-text-faint uppercase tracking-[0.1em] mb-0.5">Rolagem</div>
                    <div className="text-brand-light font-bold">1d20 + atrib + maestria</div>
                  </div>
                  <div>
                    <div className="text-text-faint uppercase tracking-[0.1em] mb-0.5">CD base</div>
                    <div className="text-text-dim font-bold">10 + nível + maestria</div>
                  </div>
                  <div>
                    <div className="text-text-faint uppercase tracking-[0.1em] mb-0.5">Maestria</div>
                    <div className="text-text-base font-bold">+{maestriaBonus}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1"><SectionDivider>Técnicas ({localTechniques.length})</SectionDivider></div>
                  <button
                    onClick={() => setShowAddTech(true)}
                    className="shrink-0 px-3 py-1 bg-transparent border border-brand rounded-sm cursor-pointer text-brand-light text-[10px] font-bold tracking-[0.08em] font-cinzel whitespace-nowrap transition-colors duration-150"
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.15)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >+ Adicionar</button>
                </div>
                {localTechniques.length === 0
                  ? <EmptyState icon={<Zap size={26} />} message="Nenhuma técnica cadastrada" sub="Clique em + Adicionar para começar" />
                  : localTechniques.map((t, i) => <TechniqueCard key={t.id ?? i} t={t} attrs={attrs} maestriaBonus={maestriaBonus} onRoll={() => handleRollTechnique(t)} onEdit={() => setEditingTechnique(t)} />)
                }
              </div>
            )}

            {activeTab === "inventario" && (
              <div className="flex flex-col gap-2">
                {/* Header com capacidade */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SectionDivider>Inventário</SectionDivider>
                  </div>
                  <button
                    onClick={() => setShowAddInventory(true)}
                    className="shrink-0 px-3 py-1 bg-transparent border border-[#7C3AED] rounded-sm cursor-pointer text-[#A855F7] text-[10px] font-bold tracking-[0.08em] font-cinzel whitespace-nowrap transition-colors duration-150"
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.15)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >+ Adicionar</button>
                </div>

                {/* Barra de capacidade */}
                <div className="bg-[#0F0F0F] border border-border rounded-sm px-3 py-2 flex items-center gap-3">
                  <span className="text-[9px] text-text-faint font-cinzel tracking-[0.12em] uppercase shrink-0">Carga</span>
                  <div className="flex-1 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (totalCarregando / capacidadeInventario) * 100)}%`,
                        background: totalCarregando >= capacidadeInventario ? "#EF4444" : totalCarregando >= capacidadeInventario * 0.75 ? "#F59E0B" : "#7C3AED",
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-bold font-cinzel shrink-0" style={{
                    color: totalCarregando >= capacidadeInventario ? "#EF4444" : "#9CA3AF"
                  }}>{totalCarregando}/{capacidadeInventario}</span>
                </div>

                {/* Armas */}
                {localWeapons.length > 0 && (
                  <>
                    <div className="text-[9px] text-text-faint tracking-[0.16em] font-cinzel pt-1">ARMAS</div>
                    {localWeapons.map((w, i) => (
                      <WeaponCard key={w.id ?? i} w={w}
                        onRoll={() => handleRollWeapon(w)}
                        onEdit={() => setEditingWeapon(w)}
                        onDelete={async () => {
                          if (!backendToken) return;
                          try {
                            await apiCall(`/characters/${character.id}/weapons/${w.id}`, backendToken, { method: "DELETE" });
                            setLocalWeapons(prev => prev.filter(x => x.id !== w.id));
                          } catch (e) { addToast("error", e instanceof Error ? e.message : "Erro ao remover arma."); }
                        }}
                      />
                    ))}
                  </>
                )}

                {/* Itens */}
                {localInventory.length > 0 && (
                  <>
                    <div className="text-[9px] text-text-faint tracking-[0.16em] font-cinzel pt-1">ITENS</div>
                    {localInventory.map(inv => (
                      <InventoryItemCard
                        key={inv.id}
                        inv={inv}
                        onDelete={async () => {
                          if (!backendToken) return;
                          try {
                            await apiCall(`/characters/${character.id}/inventory/${inv.id}`, backendToken, { method: "DELETE" });
                            setLocalInventory(prev => prev.filter(x => x.id !== inv.id));
                          } catch (e) { addToast("error", e instanceof Error ? e.message : "Erro ao remover item."); }
                        }}
                        onUpdate={async (data) => {
                          if (!backendToken) return;
                          try {
                            const updated = await apiCall<InventoryItemData>(`/characters/${character.id}/inventory/${inv.id}`, backendToken, { method: "PATCH", body: data });
                            setLocalInventory(prev => prev.map(x => x.id === inv.id ? updated : x));
                          } catch (e) { addToast("error", e instanceof Error ? e.message : "Erro ao atualizar item."); }
                        }}
                      />
                    ))}
                  </>
                )}

                {localWeapons.length === 0 && localInventory.length === 0 && (
                  <EmptyState icon={<Swords size={26} />} message="Inventário vazio" sub="Clique em + Adicionar para incluir armas ou itens" />
                )}
              </div>
            )}

            {activeTab === "habilidades" && (
              <div className="flex flex-col gap-2">
                {/* Habilidades da Classe */}
                <SectionDivider>Habilidades da Classe ({specAbilities.filter(a => a.nivelRequerido <= nivel).length})</SectionDivider>
                {!charSpec ? (
                  <EmptyState icon={<Star size={26} />} message="Nenhuma classe definida" sub="Defina sua especialização na aba CLASSE" />
                ) : specAbilities.filter(a => a.nivelRequerido <= nivel).length === 0 ? (
                  <EmptyState icon={<Star size={26} />} message="Nenhuma habilidade disponível" sub="Habilidades aparecem conforme você sobe de nível" />
                ) : (
                  specAbilities
                    .filter(a => a.nivelRequerido <= nivel)
                    .map(a => (
                      <div key={a.id} className="bg-bg-input border border-border border-l-[3px] border-l-[#F59E0B] rounded-[0_2px_2px_0] px-3.5 py-3">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <AbilityRoller onRoll={handleRollSkill} />
                            <span className="text-[13px] font-semibold text-text-base">{a.nome}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-amber-400 border border-amber-400/30 px-1.5 py-px rounded-sm">{a.tipo}</span>
                            <span className="text-[9px] text-text-faint">Nv.{a.nivelRequerido}</span>
                          </div>
                        </div>
                        <p className="text-xs text-text-dim m-0 mb-1.5 leading-relaxed">{a.descricao}</p>
                        <div className="flex gap-3 text-[10px] text-text-faint">
                          {a.custo !== "nenhum" && <span>Custo: {a.custo}</span>}
                          {a.alcance !== "pessoal" && <span>Alcance: {a.alcance}</span>}
                          {a.duracao !== "imediato" && <span>Duração: {a.duracao}</span>}
                        </div>
                      </div>
                    ))
                )}
                {charSpec && specAbilities.filter(a => a.nivelRequerido > nivel).length > 0 && (
                  <div className="mt-2">
                    <SectionDivider>Futuras (Nível insuficiente)</SectionDivider>
                    {specAbilities
                      .filter(a => a.nivelRequerido > nivel)
                      .map(a => (
                        <div key={a.id} className="bg-bg-input border border-[#1A1A1A] border-l-[3px] border-l-[#3F3F46] rounded-[0_2px_2px_0] px-3.5 py-2.5 mb-1.5 opacity-50">
                          <div className="flex justify-between items-center">
                            <span className="text-[12px] font-medium text-text-muted">{a.nome}</span>
                            <span className="text-[9px] text-text-ghost">Nv.{a.nivelRequerido}</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}

                {/* Habilidades Personalizadas */}
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1"><SectionDivider>Personalizadas ({localAbilities.length})</SectionDivider></div>
                  <button
                    onClick={() => setShowAddAbility(true)}
                    className="shrink-0 px-3 py-1 bg-transparent border border-[#F59E0B] rounded-sm cursor-pointer text-amber-400 text-[10px] font-bold tracking-[0.08em] font-cinzel whitespace-nowrap transition-colors duration-150"
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,158,11,0.1)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >+ Criar</button>
                </div>
                {localAbilities.length === 0 ? (
                  <p className="text-[11px] text-text-ghost text-center py-2">Nenhuma habilidade personalizada criada.</p>
                ) : (
                  localAbilities.map(a => (
                    <div key={a.id} className="bg-bg-input border border-border border-l-[3px] border-l-amber-600 rounded-[0_2px_2px_0] px-3.5 py-3">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <AbilityRoller onRoll={skillNome => handleRollSkillWithDamage(skillNome, a.damageDice)} />
                          <span className="text-[13px] font-semibold text-text-base">{a.nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-amber-500 border border-amber-600/30 px-1.5 py-px rounded-sm">{a.tipo}</span>
                          <button
                            onClick={async () => {
                              if (!backendToken) return;
                              try {
                                await apiCall(`/characters/${character.id}/abilities/${a.id}`, backendToken, { method: "DELETE" });
                                setLocalAbilities(prev => prev.filter(x => x.id !== a.id));
                              } catch (e) { addToast("error", e instanceof Error ? e.message : "Erro ao remover habilidade."); }
                            }}
                            className="bg-transparent border-none cursor-pointer text-text-ghost p-0.5 flex items-center rounded-sm transition-colors duration-150"
                            onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
                            title="Remover habilidade"
                          ><Trash2 size={11} /></button>
                        </div>
                      </div>
                      {a.descricao && <p className="text-xs text-text-dim m-0 mb-1.5 leading-relaxed">{a.descricao}</p>}
                      <div className="flex flex-wrap gap-3 text-[10px] text-text-faint">
                        {a.custo !== "nenhum" && <span>Custo: {a.custo}</span>}
                        {a.alcance !== "pessoal" && <span>Alcance: {a.alcance}</span>}
                        {a.duracao !== "imediato" && <span>Duração: {a.duracao}</span>}
                        {a.damageDice && <span className="text-amber-400/80">Dano: {a.damageDice}</span>}
                        {a.atributoBase && <span className="text-brand-muted/80">Base: {a.atributoBase}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "aptidoes" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1"><SectionDivider>Aptidões ({localAptitudes.length})</SectionDivider></div>
                  <button
                    onClick={() => setShowAddAptidao(true)}
                    className="shrink-0 px-3 py-1 bg-transparent border border-brand rounded-sm cursor-pointer text-brand-muted text-[10px] font-bold tracking-[0.08em] font-cinzel whitespace-nowrap transition-colors duration-150"
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.12)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    title="Adicionar aptidão"
                  >+ Adicionar</button>
                </div>
                {localAptitudes.length === 0
                  ? <EmptyState icon={<Star size={26} />} message="Nenhuma aptidão obtida" sub="Adicione uma aptidão clicando em '+ Adicionar'" />
                  : localAptitudes.map((a, i) => {
                    const isActive = (a as any).ativo === true;
                    const colorByType = {
                      dano: "#EF4444",
                      buff: "#3B82F6", 
                      cura: "#22C55E"
                    };
                    const typeColor = colorByType[(a as any).tipo as keyof typeof colorByType] || "#A855F7";
                    return (
                      <div key={i} className="bg-bg-input border border-border border-l-[3px] rounded-[0_2px_2px_0] px-3.5 py-3" style={{ borderLeftColor: isActive ? typeColor : "#3F3F46", opacity: isActive ? 1 : 0.7 }}>
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={async (e) => {
                                if (backendToken) {
                                  try {
                                    await apiCall(`/characters/${character.id}/aptitudes/${a.aptitude.id}/toggle`, backendToken, { method: "PATCH", body: { ativo: e.target.checked } });
                                    setLocalAptitudes(prev => prev.map((apt, idx) => idx === i ? { ...apt, ativo: e.target.checked } : apt));
                                  } catch (e) { addToast("error", e instanceof Error ? e.message : "Erro ao alternar aptidão."); }
                                }
                              }}
                              style={{ cursor: "pointer", width: 16, height: 16 }}
                              title={isActive ? "Desativar efeito" : "Ativar efeito"}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-semibold text-text-base">{a.aptitude.nome}</span>
                              <span className="ml-2 text-[9px] px-1.5 py-px rounded-sm" style={{ background: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}44`, fontWeight: 600 }}>{(a as any).tipo || "buff"}</span>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              if (backendToken) {
                                try {
                                  await apiCall(`/characters/${character.id}/aptitudes/${a.aptitude.id}`, backendToken, { method: "DELETE" });
                                  setLocalAptitudes(prev => prev.filter((_, idx) => idx !== i));
                                } catch (e) { addToast("error", e instanceof Error ? e.message : "Erro ao remover aptidão."); }
                              }
                            }}
                            className="bg-transparent border-none cursor-pointer text-text-ghost p-0.5 flex items-center rounded-sm transition-colors duration-150 shrink-0"
                            onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
                            title="Remover aptidão"
                          ><Trash2 size={11} /></button>
                        </div>
                        {a.aptitude.descricao && <p className="text-xs text-text-dim m-0 mb-1 leading-relaxed">{a.aptitude.descricao}</p>}
                        <div className="flex gap-2 text-[9px] text-text-faint">
                          {(a as any).prerequisitoNivel && <span>Nível: {(a as any).prerequisitoNivel}</span>}
                          {(a as any).cooldown > 0 && <span>Cooldown: {(a as any).cooldown} rodada{(a as any).cooldown !== 1 ? "s" : ""}</span>}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}

            {activeTab === "combate" && (
              <div className="flex flex-col gap-2">
                <SectionDivider>Estado de Combate</SectionDivider>
                {!activeCombat ? (
                  <EmptyState icon={<Shield size={26} />} message="Sem combate ativo" sub="Aguarde o Mestre iniciar o combate" />
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="bg-bg-input border border-red-900/40 rounded-sm px-3.5 py-2.5 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" style={{ boxShadow: "0 0 6px #EF4444" }} />
                      <div>
                        <div className="text-[10px] text-red-500 font-bold tracking-[0.1em]">COMBATE ATIVO</div>
                        <div className="text-xs text-text-muted">Rodada {activeCombat.roundNumber} · {activeCombat.state.replace(/_/g, " ")}</div>
                      </div>
                    </div>
                    {activeCombat.participants
                      .slice().sort((a, b) => a.ordem - b.ordem)
                      .map((p, i) => {
                        const name = p.character?.nome ?? p.npc?.nome ?? "?";
                        const hpMax = p.character?.hpMax ?? p.npc?.hpMax ?? 1;
                        const enMax = p.character?.energiaMax ?? p.npc?.energiaMax ?? 1;
                        const isMe = p.character?.id === character.id;
                        const isCurrent = i === activeCombat.currentTurnIndex;
                        const hpPct = hpMax > 0 ? Math.min(100, (p.hpAtual / hpMax) * 100) : 0;
                        return (
                          <div key={p.id} style={{
                            background: isMe ? "rgba(124,58,237,0.1)" : isCurrent ? "rgba(239,68,68,0.06)" : "transparent",
                            border: `1px solid ${isMe ? "#4C1D95" : isCurrent ? "rgba(239,68,68,0.3)" : "#1F1F1F"}`,
                            borderRadius: 2, padding: "10px 12px",
                          }}>
                            <div className="flex justify-between items-center mb-1.5">
                              <div className="flex items-center gap-2">
                                {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ boxShadow: "0 0 4px #EF4444" }} />}
                                <span style={{ fontSize: 12, fontWeight: 600, color: isMe ? "#A855F7" : "#D1D5DB" }}>{name}</span>
                                {isMe && <span className="text-[9px] text-brand bg-brand/[0.12] px-1.5 py-px rounded-sm">VOCÊ</span>}
                              </div>
                              <span className="text-[11px] text-text-faint">INI: {p.initiative}</span>
                            </div>
                            <div className="h-1.5 bg-bg-input rounded-sm overflow-hidden">
                              <div style={{ height: "100%", width: `${hpPct}%`, background: hpPct > 50 ? "#EF4444" : hpPct > 25 ? "#F97316" : "#7F1D1D", transition: "width 0.3s" }} />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-[10px] text-red-400">HP: {p.hpAtual}/{hpMax}</span>
                              <span className="text-[10px] text-brand">EN: {p.energiaAtual}/{enMax}</span>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                )}
              </div>
            )}

            {activeTab === "talentos" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1"><SectionDivider>Talentos ({localTalentos.length})</SectionDivider></div>
                  <button
                    onClick={() => setShowAddTalento(true)}
                    className="shrink-0 px-3 py-1 bg-transparent border border-[#7C3AED] rounded-sm cursor-pointer text-[#A855F7] text-[10px] font-bold tracking-[0.08em] font-cinzel whitespace-nowrap transition-colors duration-150"
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.15)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >+ Adicionar</button>
                </div>
                {localTalentos.length === 0
                  ? <EmptyState icon={<Star size={26} />} message="Nenhum talento" sub="Clique em + Adicionar para registrar um talento" />
                  : localTalentos.map(link => (
                    <TalentoCard
                      key={link.id}
                      link={link}
                      onDelete={async () => {
                        if (!backendToken) return;
                        try {
                          await apiCall(`/talentos/character/${character.id}/${link.talentoId}`, backendToken, { method: "DELETE" });
                          setLocalTalentos(prev => prev.filter(x => x.id !== link.id));
                        } catch (e) { addToast("error", e instanceof Error ? e.message : "Erro ao remover talento."); }
                      }}
                    />
                  ))
                }
              </div>
            )}

          </div>
        </div>

      </div>

      {currentRoll && <DiceToast roll={currentRoll} visible={rollVisible} />}

      {showAddTalento && backendToken && (
        <AddTalentoModal
          characterId={character.id}
          backendToken={backendToken}
          existing={localTalentos.map(l => l.talentoId)}
          onAdded={(link) => { setLocalTalentos(prev => [...prev, link]); setShowAddTalento(false); }}
          onClose={() => setShowAddTalento(false)}
        />
      )}

      {showAddTech && backendToken && (
        <AddTechniqueModal
          characterId={character.id}
          backendToken={backendToken}
          onAdded={(t) => { setLocalTechniques(prev => [...prev, t]); setShowAddTech(false); }}
          onClose={() => setShowAddTech(false)}
        />
      )}

      {showAddInventory && backendToken && (
        <AddInventoryModal
          characterId={character.id}
          backendToken={backendToken}
          skillIdMap={skillIdMap}
          onAddedWeapon={(w) => { setLocalWeapons(prev => [...prev, w]); setShowAddInventory(false); }}
          onAddedItem={(inv) => { setLocalInventory(prev => [...prev, inv]); setShowAddInventory(false); }}
          onClose={() => setShowAddInventory(false)}
        />
      )}
      {editingWeapon && backendToken && (
        <EditWeaponModal
          characterId={character.id}
          backendToken={backendToken}
          weapon={editingWeapon}
          skillIdMap={skillIdMap}
          onSaved={(w) => { setLocalWeapons(prev => prev.map(x => x.id === w.id ? w : x)); setEditingWeapon(null); }}
          onClose={() => setEditingWeapon(null)}
        />
      )}

      {editingTechnique && backendToken && (
        <EditTechniqueModal
          t={editingTechnique}
          characterId={character.id}
          backendToken={backendToken}
          onSaved={(updated) => { setLocalTechniques(prev => prev.map(x => x.id === updated.id ? updated : x)); setEditingTechnique(null); }}
          onClose={() => setEditingTechnique(null)}
        />
      )}

      {showAddAbility && backendToken && (
        <AddAbilityModal
          characterId={character.id}
          backendToken={backendToken}
          onAdded={(a) => { setLocalAbilities(prev => [...prev, a]); setShowAddAbility(false); }}
          onClose={() => setShowAddAbility(false)}
        />
      )}

      {showAddAptidao && backendToken && (
        <SelectAptidaoModal
          characterId={character.id}
          backendToken={backendToken}
          level={nivel}
          alreadyHas={new Set(localAptitudes.map(a => a.aptitude.id ?? ""))}
          onAdded={(a) => {
            setLocalAptitudes(prev => [...prev, a]);
            setShowAddAptidao(false);
          }}
          onClose={() => setShowAddAptidao(false)}
          onError={msg => addToast("error", msg)}
        />
      )}

      <NotifToastContainer notifs={notifs} onRemove={removeNotif} />

      {/* ── Classe Confirmation Modal ── */}
      {showClasseConfirm && selectedSpec && (
        <div
          className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowClasseConfirm(false); }}
        >
          <div className="bg-[#111] border border-border rounded-md w-full max-w-[420px] flex flex-col" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.2)" }}>
            <div className="px-6 pt-5 pb-4 border-b border-border-subtle">
              <div className="text-[13px] font-bold text-text-near tracking-[0.06em] font-cinzel mb-1">Confirmar Classe & Origem</div>
              <p className="text-[11px] text-text-faint m-0">Esta escolha é permanente e não poderá ser alterada depois.</p>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1 bg-bg-input border border-brand/30 rounded-sm px-3 py-2.5">
                  <div className="text-[9px] text-text-faint uppercase tracking-[0.12em] mb-0.5">Especialização</div>
                  <div className="text-[14px] font-bold text-brand-light">{selectedSpec.nome}</div>
                  <div className="text-[10px] text-text-muted mt-1">♥{selectedSpec.hpPorNivel}/nv · ⚡{selectedSpec.energiaPorNivel}/nv</div>
                </div>
                {selectedOrigem && (
                  <div className="flex-1 bg-bg-input border border-blue-500/30 rounded-sm px-3 py-2.5">
                    <div className="text-[9px] text-text-faint uppercase tracking-[0.12em] mb-0.5">Origem</div>
                    <div className="text-[14px] font-bold text-blue-400">{selectedOrigem.nome}</div>
                  </div>
                )}
              </div>
              {classeError && <p className="text-xs text-red-500 m-0">{classeError}</p>}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={async () => {
                    await handleSalvarClasse();
                    setShowClasseConfirm(false);
                  }}
                  disabled={classeSaving}
                  style={{
                    flex: 1, padding: "11px", background: classeSaving ? "#3B0764" : "#7C3AED",
                    border: "none", borderRadius: 2, cursor: classeSaving ? "not-allowed" : "pointer",
                    color: "#FFF", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", fontFamily: "Cinzel, serif",
                  }}
                >{classeSaving ? "Salvando…" : "✦ Confirmar"}</button>
                <button
                  onClick={() => setShowClasseConfirm(false)}
                  style={{
                    padding: "11px 18px", background: "transparent",
                    border: "1px solid #2A2A2A", borderRadius: 2, cursor: "pointer",
                    color: "#6B7280", fontSize: 12, fontWeight: 600,
                  }}
                >Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
