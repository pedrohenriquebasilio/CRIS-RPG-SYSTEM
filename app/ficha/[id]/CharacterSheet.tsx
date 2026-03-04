"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Zap, Shield, Star, Swords, User, Trash2, Dices } from "lucide-react";
import { apiCall } from "@/lib/api";

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
  atributoBase: string; descricaoLivre: string; tipoDano: string | null;
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
  threatRange: number; criticalMultiplier: number;
}
export interface Aptitude {
  aptitude: { nome: string; descricao: string };
  adquiridaNoNivel: number;
}
export interface Character {
  id: string; nome: string; origem?: string;
  campaignId?: string;
  origemId?: string | null;
  nivel: number; xpAtual: number;
  hpAtual: number; hpMax: number;
  energiaAtual: number; energiaMax: number;
  maestriaBonus: number; isApproved: boolean;
  specialization: { id?: string; nome: string; bonusAtributos?: Record<string, number>; habilidadesTreinadas?: string[] } | null;
  origemRelacao?: { id?: string; nome: string; bonusAtributos?: Record<string, number>; habilidadesTreinadas?: string[] } | null;
  campaign: { name: string };
  attributes: Attrs | null;
  skills: CharSkill[]; techniques: Technique[];
  weapons: Weapon[]; aptitudes: Aptitude[];
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
  { nome: "Acrobacia",       atributoBase: "AGI" },
  { nome: "Arcana",          atributoBase: "INT" },
  { nome: "Atletismo",       atributoBase: "FOR" },
  { nome: "Destreza Manual", atributoBase: "AGI" },
  { nome: "Determinação",    atributoBase: "VIG" },
  { nome: "Enganação",       atributoBase: "PRE" },
  { nome: "Fortitude",       atributoBase: "VIG" },
  { nome: "Furtividade",     atributoBase: "AGI" },
  { nome: "História",        atributoBase: "INT" },
  { nome: "Intimidação",     atributoBase: "FOR" },
  { nome: "Intuição",        atributoBase: "PRE" },
  { nome: "Investigação",    atributoBase: "INT" },
  { nome: "Medicina",        atributoBase: "INT" },
  { nome: "Natureza",        atributoBase: "INT" },
  { nome: "Percepção",       atributoBase: "PRE" },
  { nome: "Performance",     atributoBase: "PRE" },
  { nome: "Persuasão",       atributoBase: "PRE" },
  { nome: "Religião",        atributoBase: "INT" },
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
function AttributeRing({ attrs, maestriaBonus, onChangeAttr, onRollAttr }: {
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
        <span style={{ fontSize: 8, fontWeight: 700, color: "#6B7280", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Cinzel, serif" }}>ATRIB.</span>
        <div style={{ width: 22, height: 1, background: "rgba(124,58,237,0.5)", margin: "5px 0 4px" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>+{maestriaBonus}</span>
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
      <div style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6, fontFamily: "Cinzel, serif" }}>
        {label}
      </div>
      <div style={{ position: "relative", height: 38, background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: `linear-gradient(90deg, ${dimColor}, ${color})`, opacity: 0.35, transition: "width 0.35s ease" }} />
        <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: "40%", background: "linear-gradient(180deg, rgba(255,255,255,0.04), transparent)", pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", height: "100%", zIndex: 1 }}>
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
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #2A2A2A)" }} />
      <span style={{ fontSize: 9, fontWeight: 700, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.16em", fontFamily: "Cinzel, serif" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #2A2A2A)" }} />
    </div>
  );
}

function EmptyState({ icon, message, sub }: { icon: React.ReactNode; message: string; sub?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 16px", gap: 12 }}>
      <div style={{ color: "#27272A" }}>{icon}</div>
      <span style={{ fontSize: 13, color: "#52525B", fontWeight: 500 }}>{message}</span>
      {sub && <span style={{ fontSize: 12, color: "#3F3F46", textAlign: "center", lineHeight: 1.6, maxWidth: 220 }}>{sub}</span>}
    </div>
  );
}

const DANO_COLORS: Record<string, string> = {
  FISICO: "#EF4444", ENERGETICO: "#8B5CF6", MENTAL: "#3B82F6", ESPIRITUAL: "#10B981",
};

function TechniqueCard({ t, attrs, maestriaBonus, onRoll }: { t: Technique; attrs: Attrs; maestriaBonus: number; onRoll: () => void }) {
  const attrVal = attrs[t.atributoBase as keyof Attrs] ?? 0;
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: "#0A0A0A", borderRadius: "0 2px 2px 0", border: "1px solid #1F1F1F", borderLeft: "3px solid #7C3AED" }}>
      <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpanded(x => !x)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); onRoll(); }}
            title="Rolar técnica"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#52525B", padding: "2px 3px", display: "flex", alignItems: "center", borderRadius: 2, transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#A855F7")}
            onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
          ><Dices size={14} /></button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#E5E7EB" }}>{t.nome}</span>
          <span style={{ fontSize: 9, background: "rgba(124,58,237,0.12)", color: "#9B75F0", padding: "2px 7px", borderRadius: 2, border: "1px solid rgba(124,58,237,0.25)", fontWeight: 600 }}>NV.{t.nivel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#7C3AED" }}>{t.custoEnergia}⚡</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#A855F7" }}>+{attrVal + maestriaBonus}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 14px 12px" }}>
          {t.descricaoLivre && <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 8px", lineHeight: 1.6 }}>{t.descricaoLivre}</p>}
          <div style={{ display: "flex", gap: 14 }}>
            <span style={{ fontSize: 10, color: "#52525B" }}>Base: {t.atributoBase} ({attrVal})</span>
            {t.tipoDano && <span style={{ fontSize: 10, color: DANO_COLORS[t.tipoDano] ?? "#6B7280" }}>● {t.tipoDano.toLowerCase()}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function WeaponCard({ w, onRoll }: { w: Weapon; onRoll: () => void }) {
  return (
    <div style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", borderLeft: "3px solid #991B1B", borderRadius: "0 2px 2px 0", padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onRoll}
            title="Rolar ataque"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#52525B", padding: "2px 3px", display: "flex", alignItems: "center", borderRadius: 2, transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
            onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
          ><Dices size={14} /></button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#E5E7EB" }}>{w.nome}</span>
        </div>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#EF4444" }}>{w.damageDice}</span>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <div><span style={{ fontSize: 10, color: "#52525B", marginRight: 5 }}>TIPO</span><span style={{ fontSize: 11, color: "#9CA3AF" }}>{w.damageType.toLowerCase()}</span></div>
        <div><span style={{ fontSize: 10, color: "#52525B", marginRight: 5 }}>CRÍTICO</span><span style={{ fontSize: 11, color: w.threatRange < 20 ? "#F59E0B" : "#6B7280" }}>≥{w.threatRange} (×{w.criticalMultiplier})</span></div>
      </div>
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
}

function DiceToast({ roll, visible }: { roll: DiceRoll; visible: boolean }) {
  const isCrit   = roll.dice === 20;
  const isFumble = roll.dice === 1;
  const diceColor = isCrit ? "#F59E0B" : isFumble ? "#EF4444" : roll.dice >= 15 ? "#E5E7EB" : "#9CA3AF";
  const accentColor = isCrit ? "#F59E0B" : isFumble ? "#EF4444" : "#7C3AED";
  const glow = isCrit ? "rgba(245,158,11,0.35)" : isFumble ? "rgba(239,68,68,0.25)" : "rgba(124,58,237,0.2)";

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 1000,
      background: "#111111", border: "1px solid #2A2A2A", borderRadius: 4,
      padding: "16px 20px", minWidth: 200, maxWidth: 240,
      boxShadow: `0 8px 32px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), 0 0 28px ${glow}`,
      transition: "opacity 0.35s ease, transform 0.35s ease",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0) scale(1)" : "translateY(10px) scale(0.96)",
      pointerEvents: visible ? "auto" : "none",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accentColor, borderRadius: "4px 4px 0 0" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Dices size={11} color="#52525B" />
        <span style={{ fontSize: 10, color: "#6B7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Cinzel, serif" }}>
          {roll.label}
        </span>
        {isCrit   && <span style={{ fontSize: 9, color: "#F59E0B", fontWeight: 800, marginLeft: "auto", letterSpacing: "0.08em" }}>CRÍTICO!</span>}
        {isFumble && <span style={{ fontSize: 9, color: "#EF4444", fontWeight: 800, marginLeft: "auto", letterSpacing: "0.08em" }}>FALHA!</span>}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <div>
          <div style={{ fontSize: 8, color: "#3F3F46", marginBottom: 1, textAlign: "center" }}>d20</div>
          <div style={{
            fontSize: 46, fontWeight: 900, lineHeight: 1, color: diceColor,
            fontFamily: "Cinzel, serif",
            textShadow: isCrit ? "0 0 24px rgba(245,158,11,0.9)" : isFumble ? "0 0 18px rgba(239,68,68,0.7)" : "none",
          }}>{roll.dice}</div>
        </div>
        {roll.modifier !== 0 && (
          <>
            <div style={{ paddingBottom: 6, color: "#3F3F46", fontSize: 16, fontWeight: 300 }}>+</div>
            <div>
              <div style={{ fontSize: 8, color: "#3F3F46", marginBottom: 1, textAlign: "center" }}>bônus</div>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: "#7C3AED", paddingBottom: 4 }}>{roll.modifier}</div>
            </div>
            <div style={{ paddingBottom: 6, color: "#3F3F46", fontSize: 16, fontWeight: 300 }}>=</div>
            <div>
              <div style={{ fontSize: 8, color: "#3F3F46", marginBottom: 1, textAlign: "center" }}>total</div>
              <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color: "#E5E7EB", paddingBottom: 1 }}>{roll.total}</div>
            </div>
          </>
        )}
      </div>

      <div key={roll.rollId} style={{ marginTop: 12, height: 2, background: "#1A1A1A", borderRadius: 1, overflow: "hidden" }}>
        <div style={{ height: "100%", width: "100%", background: accentColor, opacity: 0.5, animation: "diceTimerDrain 120s linear forwards" }} />
      </div>
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
  const [atrib, setAtrib]         = useState("INT");
  const [custo, setCusto]         = useState("0");
  const [tipoDano, setTipoDano]   = useState("");
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
        body: { nome: nome.trim(), nivel, custoEnergia: parseInt(custo) || 0, atributoBase: atrib, descricaoLivre: desc.trim(), tipoDano: tipoDano || undefined },
      });
      onAdded(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro."); setSaving(false); }
  }

  const visibleTemplates = (templates ?? []).filter(t =>
    !tSearch || t.nome.toLowerCase().includes(tSearch.toLowerCase())
  );

  const inp: React.CSSProperties = {
    background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 3,
    color: "#E5E7EB", fontSize: 13, padding: "8px 12px", outline: "none",
    width: "100%", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#111", border: "1px solid #1F1F1F", borderRadius: 6, width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.12)" }}>
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#F3F4F6", letterSpacing: "0.06em", fontFamily: "Cinzel, serif" }}>Adicionar Técnica</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#52525B", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        {/* Mode tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1A1A1A", flexShrink: 0 }}>
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

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
          {mode === "biblioteca" && (
            <>
              <input value={tSearch} onChange={e => setTSearch(e.target.value)} placeholder="Buscar…"
                style={{ ...inp, marginBottom: 12 }}
                onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
              />
              {templates === null && <p style={{ color: "#52525B", fontSize: 12, textAlign: "center" }}>Carregando…</p>}
              {visibleTemplates.length === 0 && templates !== null && <p style={{ color: "#3F3F46", fontSize: 12, textAlign: "center" }}>Nenhuma técnica encontrada.</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visibleTemplates.map(t => (
                  <button key={t.id} onClick={() => addFromTemplate(t)} disabled={saving}
                    style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", borderLeft: `3px solid ${DANO_COLORS_T[t.tipoDano ?? ""] ?? "#7C3AED"}`, borderRadius: "0 3px 3px 0", padding: "10px 14px", cursor: saving ? "not-allowed" : "pointer", textAlign: "left", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#1F1F1F")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#E5E7EB" }}>{t.nome}</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#7C3AED" }}>Nv.{t.nivel}</span>
                        <span style={{ fontSize: 10, color: "#A855F7" }}>{t.custoEnergia}⚡</span>
                        <span style={{ fontSize: 10, color: "#52525B" }}>{t.atributoBase}</span>
                      </div>
                    </div>
                    {t.descricaoLivre && <p style={{ fontSize: 11, color: "#6B7280", margin: "4px 0 0", lineHeight: 1.5 }}>{t.descricaoLivre}</p>}
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === "custom" && (
            <form onSubmit={addCustom} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5, fontFamily: "Cinzel, serif" }}>Nome *</label>
                <input autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da técnica" style={inp}
                  onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5, fontFamily: "Cinzel, serif" }}>Nível</label>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button" onClick={() => setNivel(n)} style={{ flex: 1, padding: "7px 0", background: nivel === n ? "#7C3AED" : "#0A0A0A", border: `1px solid ${nivel === n ? "#7C3AED" : "#2A2A2A"}`, borderRadius: 2, cursor: "pointer", color: nivel === n ? "#FFF" : "#6B7280", fontSize: 12, fontWeight: 700 }}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5, fontFamily: "Cinzel, serif" }}>Atributo</label>
                  <div style={{ display: "flex", gap: 3 }}>
                    {["FOR","AGI","VIG","INT","PRE"].map(a => (
                      <button key={a} type="button" onClick={() => setAtrib(a)} style={{ flex: 1, padding: "7px 0", background: atrib === a ? "rgba(124,58,237,0.2)" : "#0A0A0A", border: `1px solid ${atrib === a ? "#7C3AED" : "#2A2A2A"}`, borderRadius: 2, cursor: "pointer", color: atrib === a ? "#A855F7" : "#6B7280", fontSize: 9, fontWeight: 700 }}>{a}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5, fontFamily: "Cinzel, serif" }}>Custo ⚡</label>
                  <input type="number" min={0} value={custo} onChange={e => setCusto(e.target.value)} style={{ ...inp, textAlign: "center" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5, fontFamily: "Cinzel, serif" }}>Tipo de Dano</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {["FISICO","ENERGETICO","MENTAL","ESPIRITUAL"].map(d => (
                    <button key={d} type="button" onClick={() => setTipoDano(tipoDano === d ? "" : d)} style={{ flex: 1, padding: "6px 0", background: tipoDano === d ? `${DANO_COLORS_T[d]}22` : "#0A0A0A", border: `1px solid ${tipoDano === d ? DANO_COLORS_T[d] : "#2A2A2A"}`, borderRadius: 2, cursor: "pointer", color: tipoDano === d ? DANO_COLORS_T[d] : "#6B7280", fontSize: 8, fontWeight: 700 }}>{d.charAt(0)+d.slice(1).toLowerCase()}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5, fontFamily: "Cinzel, serif" }}>Descrição</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ ...inp, resize: "none" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                />
              </div>
              {error && <p style={{ fontSize: 12, color: "#EF4444", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={saving || !nome.trim()} style={{ padding: "10px", background: saving || !nome.trim() ? "#1A1A1A" : "#7C3AED", border: "none", borderRadius: 3, cursor: saving || !nome.trim() ? "not-allowed" : "pointer", color: saving || !nome.trim() ? "#52525B" : "#FFF", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Cinzel, serif" }}>
                {saving ? "Adicionando…" : "✦ Adicionar Técnica"}
              </button>
            </form>
          )}
        </div>

        {mode === "biblioteca" && error && (
          <div style={{ padding: "8px 22px", borderTop: "1px solid #1A1A1A", flexShrink: 0 }}>
            <p style={{ fontSize: 12, color: "#EF4444", margin: 0 }}>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Weapon Modal ─────────────────────────────────────────────────────────
function AddWeaponModal({ characterId, backendToken, onAdded, onClose }: {
  characterId: string; backendToken: string;
  onAdded: (w: Weapon) => void; onClose: () => void;
}) {
  type Mode = "catalogo" | "custom";
  const [mode, setMode]           = useState<Mode>("catalogo");
  const [templates, setTemplates] = useState<WeaponTemplate[] | null>(null);
  const [wSearch, setWSearch]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  // custom form
  const [nome, setNome]           = useState("");
  const [dice, setDice]           = useState("1d6");
  const [damType, setDamType]     = useState("FISICO");
  const [threat, setThreat]       = useState("20");
  const [crit, setCrit]           = useState("2");

  useEffect(() => {
    if (mode === "catalogo" && templates === null) {
      apiCall<WeaponTemplate[]>("/seeds/weapon-templates", backendToken)
        .then(setTemplates).catch(() => setTemplates([]));
    }
  }, [mode, templates, backendToken]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function addFromTemplate(t: WeaponTemplate) {
    setSaving(true); setError("");
    try {
      const res = await apiCall<Weapon>(`/characters/${characterId}/weapons`, backendToken, {
        method: "POST",
        body: { nome: t.nome, damageDice: t.damageDice, damageType: t.tipoDano, threatRange: t.threatRange, criticalMultiplier: t.criticalMultiplier },
      });
      onAdded(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro."); setSaving(false); }
  }

  async function addCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !dice.trim()) { setError("Nome e dado de dano são obrigatórios."); return; }
    setSaving(true); setError("");
    try {
      const res = await apiCall<Weapon>(`/characters/${characterId}/weapons`, backendToken, {
        method: "POST",
        body: { nome: nome.trim(), damageDice: dice.trim(), damageType: damType, threatRange: parseInt(threat) || 20, criticalMultiplier: parseInt(crit) || 2 },
      });
      onAdded(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro."); setSaving(false); }
  }

  const TIPO_COLORS: Record<string, string> = { FISICO: "#EF4444", ENERGETICO: "#8B5CF6", MENTAL: "#3B82F6", ESPIRITUAL: "#10B981" };
  const visibleTemplates = (templates ?? []).filter(t => !wSearch || t.nome.toLowerCase().includes(wSearch.toLowerCase()));

  const inp: React.CSSProperties = {
    background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 3,
    color: "#E5E7EB", fontSize: 13, padding: "8px 12px", outline: "none",
    width: "100%", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#111", border: "1px solid #1F1F1F", borderRadius: 6, width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(153,27,27,0.15)" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#F3F4F6", letterSpacing: "0.06em", fontFamily: "Cinzel, serif" }}>Adicionar Arma</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#52525B", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid #1A1A1A", flexShrink: 0 }}>
          {(["catalogo", "custom"] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
              flex: 1, padding: "10px 0", background: "none", border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Cinzel, serif",
              color: mode === m ? "#EF4444" : "#52525B",
              borderBottom: `2px solid ${mode === m ? "#EF4444" : "transparent"}`, marginBottom: -1,
            }}>
              {m === "catalogo" ? "CATÁLOGO" : "PERSONALIZADA"}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
          {mode === "catalogo" && (
            <>
              <input value={wSearch} onChange={e => setWSearch(e.target.value)} placeholder="Buscar…"
                style={{ ...inp, marginBottom: 12 }}
                onFocus={e => (e.currentTarget.style.borderColor = "#EF4444")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
              />
              {templates === null && <p style={{ color: "#52525B", fontSize: 12, textAlign: "center" }}>Carregando…</p>}
              {visibleTemplates.length === 0 && templates !== null && <p style={{ color: "#3F3F46", fontSize: 12, textAlign: "center" }}>Nenhuma arma encontrada.</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visibleTemplates.map(t => (
                  <button key={t.id} onClick={() => addFromTemplate(t)} disabled={saving}
                    style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", borderLeft: `3px solid ${TIPO_COLORS[t.tipoDano] ?? "#991B1B"}`, borderRadius: "0 3px 3px 0", padding: "10px 14px", cursor: saving ? "not-allowed" : "pointer", textAlign: "left", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#EF4444")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#1F1F1F")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#E5E7EB" }}>{t.nome}</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#EF4444" }}>{t.damageDice}</span>
                        <span style={{ fontSize: 9, color: "#52525B" }}>{t.categoria}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: "#6B7280" }}>{t.distancia}</span>
                      {t.duasMaos && <span style={{ fontSize: 10, color: "#F59E0B" }}>2 mãos</span>}
                      {t.requiresMarcial && <span style={{ fontSize: 10, color: "#EF4444" }}>Marcial</span>}
                      {t.threatRange < 20 && <span style={{ fontSize: 10, color: "#F59E0B" }}>Crit ≥{t.threatRange}</span>}
                      {t.regraEspecial && <span style={{ fontSize: 10, color: "#8B5CF6" }}>{t.regraEspecial}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === "custom" && (
            <form onSubmit={addCustom} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5, fontFamily: "Cinzel, serif" }}>Nome *</label>
                <input autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Espada Longa" style={inp}
                  onFocus={e => (e.currentTarget.style.borderColor = "#EF4444")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5, fontFamily: "Cinzel, serif" }}>Dado de Dano *</label>
                  <input value={dice} onChange={e => setDice(e.target.value)} placeholder="Ex.: 1d8" style={inp}
                    onFocus={e => (e.currentTarget.style.borderColor = "#EF4444")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5, fontFamily: "Cinzel, serif" }}>Tipo de Dano</label>
                  <div style={{ display: "flex", gap: 3 }}>
                    {["FISICO","ENERGETICO","MENTAL","ESPIRITUAL"].map(d => (
                      <button key={d} type="button" onClick={() => setDamType(d)} style={{ flex: 1, padding: "7px 0", background: damType === d ? `${TIPO_COLORS[d]}22` : "#0A0A0A", border: `1px solid ${damType === d ? TIPO_COLORS[d] : "#2A2A2A"}`, borderRadius: 2, cursor: "pointer", color: damType === d ? TIPO_COLORS[d] : "#6B7280", fontSize: 8, fontWeight: 700 }}>{d.charAt(0)+d.slice(1).toLowerCase()}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5, fontFamily: "Cinzel, serif" }}>Ameaça (crítico ≥)</label>
                  <input type="number" min={1} max={20} value={threat} onChange={e => setThreat(e.target.value)} style={{ ...inp, textAlign: "center" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#EF4444")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5, fontFamily: "Cinzel, serif" }}>Multiplicador Crítico</label>
                  <input type="number" min={1} value={crit} onChange={e => setCrit(e.target.value)} style={{ ...inp, textAlign: "center" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#EF4444")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                  />
                </div>
              </div>
              {error && <p style={{ fontSize: 12, color: "#EF4444", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={saving || !nome.trim()} style={{ padding: "10px", background: saving || !nome.trim() ? "#1A1A1A" : "#991B1B", border: "none", borderRadius: 3, cursor: saving || !nome.trim() ? "not-allowed" : "pointer", color: saving || !nome.trim() ? "#52525B" : "#FFF", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Cinzel, serif" }}>
                {saving ? "Adicionando…" : "✦ Adicionar Arma"}
              </button>
            </form>
          )}
        </div>

        {mode === "catalogo" && error && (
          <div style={{ padding: "8px 22px", borderTop: "1px solid #1A1A1A", flexShrink: 0 }}>
            <p style={{ fontSize: 12, color: "#EF4444", margin: 0 }}>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const SURFACE: React.CSSProperties = {
  background: "#111111", border: "1px solid #1F1F1F", borderRadius: 4, overflow: "hidden",
};

// ─── Main ─────────────────────────────────────────────────────────────────────
type Tab = "combate" | "tecnicas" | "armas" | "aptidoes" | "descricao" | "classe";
const TABS: { id: Tab; label: string }[] = [
  { id: "classe",    label: "CLASSE"    },
  { id: "tecnicas",  label: "TÉCNICAS"  },
  { id: "armas",     label: "ARMAS"     },
  { id: "aptidoes",  label: "APTIDÕES"  },
  { id: "combate",   label: "COMBATE"   },
  { id: "descricao", label: "DESC."     },
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
  const [activeTab, setActiveTab] = useState<Tab>(character.specialization ? "tecnicas" : "classe");
  const [charSpec, setCharSpec]     = useState(character.specialization);
  const [charOrigem, setCharOrigem] = useState(character.origemRelacao ?? null);
  const [nome, setNome]             = useState(character.nome);
  const [editingNome, setEditingNome] = useState(false);

  // ── Class / Origin selection ──
  const [specs, setSpecs]         = useState<SpecSeed[]>([]);
  const [origens, setOrigens]     = useState<OrigemSeed[]>([]);
  const [selectedSpec, setSelectedSpec]   = useState<SpecSeed | null>(null);
  const [selectedOrigem, setSelectedOrigem] = useState<OrigemSeed | null>(null);
  const [classeSaving, setClasseSaving]   = useState(false);
  const [classeError, setClasseError]     = useState("");

  // ── Local lists (techniques & weapons) ──
  const [localTechniques, setLocalTechniques] = useState<Technique[]>(character.techniques);
  const [localWeapons, setLocalWeapons]       = useState<Weapon[]>(character.weapons);
  const [showAddTech, setShowAddTech]         = useState(false);
  const [showAddWeapon, setShowAddWeapon]     = useState(false);

  // ── Dice rolls ──
  const [skillIdMap, setSkillIdMap]   = useState<Record<string, string>>({});
  const [currentRoll, setCurrentRoll] = useState<DiceRoll | null>(null);
  const [rollVisible, setRollVisible] = useState(false);
  const rollIdRef   = useRef(0);
  const rollTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const maestria = (skillPoints[skillNome] ?? 0) > 0 ? character.maestriaBonus : 0;

    if (backendToken && skillId && character.campaignId) {
      try {
        const res = await apiCall<{ dice: number; total: number; attrVal: number; maestria: number }>(
          "/roll/skill", backendToken, { method: "POST", body: { skillId, characterId: character.id, campaignId: character.campaignId } }
        );
        showRoll(skillNome, res.dice, res.attrVal + res.maestria);
        return;
      } catch { /* fallback below */ }
    }
    const dice = Math.floor(Math.random() * 20) + 1;
    showRoll(skillNome, dice, attrVal + maestria);
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
    const attrVal   = attrs[t.atributoBase as keyof Attrs] ?? 0;
    const modifier  = attrVal + character.maestriaBonus;
    if (backendToken && (t as any).id && character.campaignId) {
      try {
        const res = await apiCall<{ dice: number; total: number }>(
          "/roll/technique", backendToken, { method: "POST", body: { techniqueId: (t as any).id, actorId: character.id, campaignId: character.campaignId } }
        );
        showRoll(t.nome, res.dice, modifier);
        return;
      } catch { /* fallback */ }
    }
    const dice = Math.floor(Math.random() * 20) + 1;
    showRoll(t.nome, dice, modifier);
  }

  async function handleRollWeapon(w: Weapon) {
    if (backendToken && character.campaignId) {
      try {
        const res = await apiCall<{ dice: number; attackTotal: number; modifier?: number }>(
          "/roll/weapon-attack", backendToken, { method: "POST", body: { characterId: character.id, weaponId: w.id, campaignId: character.campaignId } }
        );
        const mod = res.modifier ?? (res.attackTotal - res.dice);
        showRoll(w.nome, res.dice, mod);
        return;
      } catch { /* fallback */ }
    }
    const dice = Math.floor(Math.random() * 20) + 1;
    showRoll(w.nome, dice, 0);
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
  }, [backendToken]); // eslint-disable-line

  // Preview of additive attr bonuses from spec + origem
  const previewAttrs = (): Attrs => {
    const base: Attrs = { FOR: 0, AGI: 0, VIG: 0, INT: 0, PRE: 0 };
    if (selectedSpec?.bonusAtributos) {
      for (const k of Object.keys(base) as (keyof Attrs)[]) base[k] += selectedSpec.bonusAtributos[k] ?? 0;
    }
    if (selectedOrigem?.bonusAtributos) {
      for (const k of Object.keys(base) as (keyof Attrs)[]) base[k] += selectedOrigem.bonusAtributos[k] ?? 0;
    }
    return base;
  };

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
      const newHpMax = updated.hpMax;
      const newHp    = Math.min(hp, newHpMax);
      const newEnMax = updated.energiaMax;
      const newEn    = Math.min(energia, newEnMax);
      setHpMax(newHpMax);
      setHp(newHp);
      setEnergiaMax(newEnMax);
      setEnergia(newEn);
      persist(sKey, {
        attributes: updated.attributes,
        specialization: updated.specialization,
        origemRelacao: updated.origemRelacao,
        hpMax: newHpMax,
        hpAtual: newHp,
        energiaMax: newEnMax,
        energiaAtual: newEn,
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

  const handleSkillPoints = (skillName: string, delta: number) => {
    const current = skillPoints[skillName] ?? 0;
    const next = Math.max(0, Math.min(20, current + delta));
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

  // ── Derived ──
  const defesa = 10 + attrs.AGI;
  const xpNext = XP_TABLE[character.nivel] ?? 355000;
  const xpPct  = Math.min(100, (character.xpAtual / xpNext) * 100);

  return (
    <div style={{
      height: "100vh",
      paddingTop: 68,
      paddingLeft: 16,
      paddingRight: 16,
      paddingBottom: 16,
      backgroundColor: "#0D0D0D",
      boxSizing: "border-box",
      overflow: "hidden",
      fontFamily: "Inter, sans-serif",
    }}>
      <style>{`@keyframes diceTimerDrain { from { width: 100%; } to { width: 0%; } }`}</style>
      <div style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr 1fr",
        gap: 12,
        height: "100%",
        maxWidth: 1600,
        margin: "0 auto",
      }}>

        {/* ══════════════ LEFT ══════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", paddingRight: 2 }}>

          {/* Header */}
          <div style={{ ...SURFACE, padding: 16, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 56, height: 56, background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <User size={22} color="#2A2A2A" />
                {(["tl","tr","bl","br"] as const).map(p => (
                  <div key={p} style={{ position: "absolute", top: p.startsWith("t") ? -3 : undefined, bottom: p.startsWith("b") ? -3 : undefined, left: p.endsWith("l") ? -3 : undefined, right: p.endsWith("r") ? -3 : undefined, width: 5, height: 5, background: "#2A2A2A" }} />
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
                  {/* Nome — editável */}
                  <div>
                    <div style={{ fontSize: 9, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Personagem</div>
                    {editingNome ? (
                      <input
                        autoFocus
                        value={nome}
                        onChange={e => setNome(e.target.value)}
                        onBlur={async () => {
                          setEditingNome(false);
                          const trimmed = nome.trim();
                          if (!trimmed || trimmed === nome) {
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
                        style={{ fontSize: 13, fontWeight: 600, color: "#E5E7EB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "text" }}
                      >
                        {nome}
                      </div>
                    )}
                  </div>

                  {([
                    { label: "Origem", value: charOrigem?.nome ?? "—" },
                    { label: "Classe", value: charSpec?.nome ?? "—", accent: true },
                    { label: "Nível",  value: String(character.nivel) },
                  ] as { label: string; value: string; accent?: boolean }[]).map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize: 9, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>{f.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: f.accent ? "#A855F7" : "#E5E7EB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #1A1A1A", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 6px #22C55E88", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#52525B" }}>Campanha: <span style={{ color: "#9CA3AF" }}>{character.campaign.name}</span></span>
              {character.isApproved && <span style={{ marginLeft: "auto", fontSize: 9, color: "#22C55E", border: "1px solid #14532D", padding: "1px 6px", borderRadius: 2 }}>Aprovado</span>}
            </div>
          </div>

          {/* Attribute ring */}
          <div style={{ ...SURFACE, padding: "16px 12px 12px", flexShrink: 0 }}>
            <div style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "#3F3F46", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "Cinzel, serif", marginBottom: 4 }}>
              Atributos <span style={{ color: "#27272A", fontWeight: 400 }}>— passe o mouse para editar</span>
            </div>
            <AttributeRing attrs={attrs} maestriaBonus={character.maestriaBonus} onChangeAttr={handleAttrChange} onRollAttr={handleRollAttr} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px 2px" }}>
              <span style={{ fontSize: 8, color: "#52525B", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", minWidth: 20 }}>XP</span>
              <div style={{ flex: 1, height: 3, background: "#1A1A1A", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg, #2A2A2A, #D1D5DB)", width: `${xpPct}%`, transition: "width 0.4s ease" }} />
              </div>
              <span style={{ fontSize: 10, color: "#52525B", minWidth: 80, textAlign: "right" }}>{character.xpAtual.toLocaleString("pt-BR")} / {xpNext.toLocaleString("pt-BR")}</span>
            </div>
          </div>

          {/* Status bars */}
          <div style={{ ...SURFACE, padding: 16, display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
            <StatusBar
              label="Pontos de Vida"
              current={hp} max={hpMax}
              color="#EF4444" dimColor="#7F1D1D"
              onChange={handleHpChange}
              onChangeMax={handleHpMaxChange}
            />
            <StatusBar
              label="Energia Amaldiçoada"
              current={energia} max={energiaMax}
              color="#A855F7" dimColor="#4C1D95"
              onChange={handleEnChange}
              onChangeMax={handleEnMaxChange}
            />
          </div>

          {/* Defense */}
          <div style={{ ...SURFACE, padding: "14px 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <svg width="54" height="60" viewBox="0 0 54 60" fill="none">
                  <path d="M27 3L5 13V33C5 46 27 57 27 57C27 57 49 46 49 33V13L27 3Z" fill="#0A0A0A" stroke="#2A2A2A" strokeWidth="1.5" />
                  <path d="M27 9L10 18V32C10 41.5 27 51 27 51C27 51 44 41.5 44 32V18L27 9Z" fill="transparent" stroke="#1F1F1F" strokeWidth="1" />
                </svg>
                <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -52%)", fontSize: 18, fontWeight: 800, color: "#FFF" }}>{defesa}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 5, fontFamily: "Cinzel, serif" }}>Defesa</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>10 + AGI ({attrs.AGI})</div>
              </div>
              <div style={{ textAlign: "center", padding: "8px 14px", background: "#0A0A0A", border: "1px solid #1F1F1F", borderRadius: 2 }}>
                <div style={{ fontSize: 9, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>Maestria</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#7C3AED", lineHeight: 1 }}>+{character.maestriaBonus}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════ MIDDLE — Perícias ══════════════ */}
        <div style={{ ...SURFACE, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid #1A1A1A", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#E5E7EB", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "Cinzel, serif" }}>Perícias</span>
            <span style={{ fontSize: 9, color: "#3F3F46" }}>pontos: 0–20 por perícia</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 36px 40px 90px", gap: 2, padding: "7px 18px", borderBottom: "1px solid #1A1A1A", flexShrink: 0 }}>
            {(["PERÍCIA", "BÔN.", "DADO", "TREINAMENTO"] as const).map((h, i) => (
              <span key={h} style={{ fontSize: 9, color: "#3F3F46", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i === 0 ? "left" : "center" }}>{h}</span>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {ALL_SKILLS.map((skill, i) => {
              const pontos   = skillPoints[skill.nome] ?? 0;
              const treinada = pontos > 0;
              const attrVal  = attrs[skill.atributoBase as keyof Attrs] ?? 0;
              const maestria = treinada ? character.maestriaBonus : 0;
              return (
                <div key={skill.nome} style={{
                  display: "grid", gridTemplateColumns: "1fr 36px 40px 90px", gap: 2,
                  padding: "5px 18px", alignItems: "center",
                  background: i % 2 !== 0 ? "rgba(255,255,255,0.012)" : "transparent",
                  borderBottom: "1px solid rgba(26,26,26,0.9)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <button
                      onClick={() => handleRollSkill(skill.nome)}
                      title={`Rolar ${skill.nome}`}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#3F3F46", padding: "1px 2px", display: "flex", alignItems: "center", borderRadius: 2, flexShrink: 0, transition: "color 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#A855F7")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#3F3F46")}
                    ><Dices size={12} /></button>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      background: treinada ? "#3B82F6" : "#1F1F1F",
                      boxShadow: treinada ? "0 0 5px rgba(59,130,246,0.5)" : "none",
                    }} />
                    <span style={{ fontSize: 12, fontWeight: treinada ? 500 : 400, color: treinada ? "#E5E7EB" : "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {skill.nome}
                    </span>
                    <span style={{ fontSize: 9, color: "#3F3F46", flexShrink: 0 }}>({skill.atributoBase})</span>
                  </div>

                  <span style={{ fontSize: 13, fontWeight: 700, textAlign: "center", color: (attrVal + maestria) > 0 ? "#D1D5DB" : "#3F3F46" }}>
                    +{attrVal + maestria}
                  </span>

                  <span style={{ fontSize: 10, color: "#3F3F46", textAlign: "center" }}>d20</span>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                    <button
                      onClick={() => handleSkillPoints(skill.nome, -1)}
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
                    <button
                      onClick={() => handleSkillPoints(skill.nome, 1)}
                      disabled={pontos === 20}
                      style={{
                        width: 16, height: 16, border: "none", borderRadius: 2,
                        cursor: pontos === 20 ? "default" : "pointer",
                        background: pontos === 20 ? "transparent" : "#1A1A1A",
                        color: pontos === 20 ? "#2A2A2A" : "#9CA3AF",
                        fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 0, lineHeight: 1,
                      }}
                      onMouseEnter={e => { if (pontos < 20) e.currentTarget.style.background = "#7C3AED"; }}
                      onMouseLeave={e => { if (pontos < 20) e.currentTarget.style.background = "#1A1A1A"; }}
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: "7px 18px", borderTop: "1px solid #1A1A1A", flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: "#3F3F46" }}>● Treinada se pontos &gt; 0 · Bônus = atributo + maestria</span>
          </div>
        </div>

        {/* ══════════════ RIGHT — Tabs ══════════════ */}
        <div style={{ ...SURFACE, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #1A1A1A", flexShrink: 0 }}>
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

          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

            {activeTab === "classe" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <SectionDivider>Especialização</SectionDivider>

                {/* Spec cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {specs.length === 0 && <span style={{ fontSize: 12, color: "#52525B" }}>Carregando…</span>}
                  {specs.map(s => {
                    const active = selectedSpec?.id === s.id;
                    const bonuses = Object.entries(s.bonusAtributos ?? {}).filter(([, v]) => v > 0);
                    return (
                      <button key={s.id} onClick={() => setSelectedSpec(active ? null : s)} style={{
                        background: active ? "rgba(124,58,237,0.12)" : "#0A0A0A",
                        border: `1px solid ${active ? "#7C3AED" : "#1F1F1F"}`,
                        borderRadius: 2, padding: "10px 12px", cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s", boxShadow: active ? "0 0 12px rgba(124,58,237,0.15)" : "none",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: active ? "#A855F7" : "#D1D5DB" }}>{s.nome}</span>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: "#EF4444" }}>♥{s.hpPorNivel}</span>
                            <span style={{ fontSize: 10, color: "#7C3AED" }}>⚡{s.energiaPorNivel}</span>
                          </div>
                        </div>
                        {bonuses.length > 0 && (
                          <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                            {bonuses.map(([k, v]) => (
                              <span key={k} style={{ fontSize: 10, color: "#22C55E", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", padding: "1px 6px", borderRadius: 2 }}>+{v} {k}</span>
                            ))}
                            {s.habilidadesTreinadas?.slice(0,3).map(h => (
                              <span key={h} style={{ fontSize: 10, color: "#3B82F6", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", padding: "1px 6px", borderRadius: 2 }}>{h}</span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <SectionDivider>Origem</SectionDivider>

                {/* Origem cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {origens.length === 0 && <span style={{ fontSize: 12, color: "#52525B" }}>Carregando…</span>}
                  {origens.map(o => {
                    const active = selectedOrigem?.id === o.id;
                    const bonuses = Object.entries(o.bonusAtributos ?? {}).filter(([, v]) => v > 0);
                    return (
                      <button key={o.id} onClick={() => setSelectedOrigem(active ? null : o)} style={{
                        background: active ? "rgba(59,130,246,0.1)" : "#0A0A0A",
                        border: `1px solid ${active ? "#3B82F6" : "#1F1F1F"}`,
                        borderRadius: 2, padding: "10px 12px", cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: active ? "#60A5FA" : "#D1D5DB" }}>{o.nome}</span>
                        </div>
                        {bonuses.length > 0 && (
                          <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                            {bonuses.map(([k, v]) => (
                              <span key={k} style={{ fontSize: 10, color: "#22C55E", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", padding: "1px 6px", borderRadius: 2 }}>+{v} {k}</span>
                            ))}
                            {o.habilidadesTreinadas?.slice(0,3).map(h => (
                              <span key={h} style={{ fontSize: 10, color: "#3B82F6", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", padding: "1px 6px", borderRadius: 2 }}>{h}</span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Attribute preview */}
                {(selectedSpec || selectedOrigem) && (() => {
                  const p = previewAttrs();
                  const nonZero = Object.entries(p).filter(([, v]) => v > 0);
                  return nonZero.length > 0 ? (
                    <div style={{ background: "#0A0A0A", border: "1px solid #22C55E33", borderRadius: 2, padding: "10px 14px" }}>
                      <div style={{ fontSize: 9, color: "#22C55E", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Bônus totais de atributos</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {Object.entries(p).map(([k, v]) => (
                          <span key={k} style={{ fontSize: 13, fontWeight: 700, color: v > 0 ? "#22C55E" : "#3F3F46" }}>{k}: {v > 0 ? `+${v}` : v}</span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {classeError && (
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 2, padding: "10px 14px", fontSize: 12, color: "#EF4444" }}>
                    {classeError}
                  </div>
                )}

                <button
                  onClick={handleSalvarClasse}
                  disabled={classeSaving || !selectedSpec}
                  style={{
                    padding: "12px", background: classeSaving || !selectedSpec ? "#1A1A1A" : "#7C3AED",
                    border: "none", borderRadius: 2, cursor: classeSaving || !selectedSpec ? "not-allowed" : "pointer",
                    color: classeSaving || !selectedSpec ? "#52525B" : "#FFF",
                    fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                    fontFamily: "Cinzel, serif", transition: "background 0.2s",
                    boxShadow: !classeSaving && selectedSpec ? "0 0 16px rgba(124,58,237,0.3)" : "none",
                  }}
                >
                  {classeSaving ? "Salvando…" : "✦ Salvar Classe & Origem"}
                </button>

                <div style={{ borderTop: "1px solid #1A1A1A", paddingTop: 14, marginTop: 4 }}>
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                        background: "transparent", border: "1px solid #3F3F46", borderRadius: 2,
                        cursor: "pointer", color: "#6B7280", fontSize: 11, fontWeight: 600,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#EF4444"; e.currentTarget.style.color = "#EF4444"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#3F3F46"; e.currentTarget.style.color = "#6B7280"; }}
                    >
                      <Trash2 size={13} /> Excluir Ficha
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#EF4444", flex: 1 }}>Confirmar exclusão da ficha?</span>
                      <button
                        onClick={handleExcluir}
                        disabled={deleting}
                        style={{ padding: "6px 16px", background: "#991B1B", border: "none", borderRadius: 2, cursor: deleting ? "not-allowed" : "pointer", color: "#FFF", fontSize: 11, fontWeight: 700 }}
                      >{deleting ? "…" : "Excluir"}</button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        style={{ padding: "6px 12px", background: "transparent", border: "1px solid #3F3F46", borderRadius: 2, cursor: "pointer", color: "#6B7280", fontSize: 11 }}
                      >Cancelar</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "tecnicas" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}><SectionDivider>Técnicas ({localTechniques.length})</SectionDivider></div>
                  <button
                    onClick={() => setShowAddTech(true)}
                    style={{ flexShrink: 0, padding: "4px 12px", background: "transparent", border: "1px solid #7C3AED", borderRadius: 2, cursor: "pointer", color: "#A855F7", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "Cinzel, serif", whiteSpace: "nowrap", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.15)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >+ Adicionar</button>
                </div>
                {localTechniques.length === 0
                  ? <EmptyState icon={<Zap size={26} />} message="Nenhuma técnica cadastrada" sub="Clique em + Adicionar para começar" />
                  : localTechniques.map((t, i) => <TechniqueCard key={t.id ?? i} t={t} attrs={attrs} maestriaBonus={character.maestriaBonus} onRoll={() => handleRollTechnique(t)} />)
                }
              </div>
            )}

            {activeTab === "armas" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}><SectionDivider>Arsenal ({localWeapons.length})</SectionDivider></div>
                  <button
                    onClick={() => setShowAddWeapon(true)}
                    style={{ flexShrink: 0, padding: "4px 12px", background: "transparent", border: "1px solid #991B1B", borderRadius: 2, cursor: "pointer", color: "#EF4444", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "Cinzel, serif", whiteSpace: "nowrap", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(153,27,27,0.15)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >+ Adicionar</button>
                </div>
                {localWeapons.length === 0
                  ? <EmptyState icon={<Swords size={26} />} message="Nenhuma arma equipada" sub="Clique em + Adicionar para equipar" />
                  : localWeapons.map((w, i) => <WeaponCard key={w.id ?? i} w={w} onRoll={() => handleRollWeapon(w)} />)
                }
              </div>
            )}

            {activeTab === "aptidoes" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SectionDivider>Aptidões ({character.aptitudes.length})</SectionDivider>
                {character.aptitudes.length === 0
                  ? <EmptyState icon={<Star size={26} />} message="Nenhuma aptidão adquirida" />
                  : character.aptitudes.map((a, i) => (
                    <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", borderLeft: "3px solid #7C3AED", borderRadius: "0 2px 2px 0", padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#E5E7EB" }}>{a.aptitude.nome}</span>
                        <span style={{ fontSize: 10, color: "#52525B", background: "#1A1A1A", padding: "1px 6px", borderRadius: 2 }}>Nv. {a.adquiridaNoNivel}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, lineHeight: 1.6 }}>{a.aptitude.descricao}</p>
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === "combate" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SectionDivider>Estado de Combate</SectionDivider>
                <EmptyState icon={<Shield size={26} />} message="Sem combate ativo" sub="Entre em uma campanha e aguarde o Mestre iniciar o combate" />
              </div>
            )}

            {activeTab === "descricao" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <SectionDivider>Ficha</SectionDivider>
                {([
                  { label: "Origem", value: character.origemRelacao?.nome || "Não definida." },
                  { label: "Status", value: character.isApproved ? "✓ Aprovada pelo Mestre" : "⏳ Aguardando aprovação" },
                  { label: "XP Acumulado", value: `${character.xpAtual.toLocaleString("pt-BR")} pontos` },
                  { label: "Próximo nível em", value: `${Math.max(0, xpNext - character.xpAtual).toLocaleString("pt-BR")} XP` },
                  { label: "Bônus de Maestria", value: `+${character.maestriaBonus} em perícias treinadas` },
                ] as { label: string; value: string }[]).map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: 9, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6, fontFamily: "Cinzel, serif" }}>{item.label}</div>
                    <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, lineHeight: 1.7 }}>{item.value}</p>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>

      {currentRoll && <DiceToast roll={currentRoll} visible={rollVisible} />}

      {showAddTech && backendToken && (
        <AddTechniqueModal
          characterId={character.id}
          backendToken={backendToken}
          onAdded={(t) => { setLocalTechniques(prev => [...prev, t]); setShowAddTech(false); }}
          onClose={() => setShowAddTech(false)}
        />
      )}

      {showAddWeapon && backendToken && (
        <AddWeaponModal
          characterId={character.id}
          backendToken={backendToken}
          onAdded={(w) => { setLocalWeapons(prev => [...prev, w]); setShowAddWeapon(false); }}
          onClose={() => setShowAddWeapon(false)}
        />
      )}
    </div>
  );
}
