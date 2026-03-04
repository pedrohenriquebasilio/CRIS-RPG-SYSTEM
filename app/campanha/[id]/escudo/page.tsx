"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiCall } from "@/lib/api";
import {
  Shield, Swords, ChevronLeft, Play,
  StopCircle, Users, RefreshCw, ChevronRight,
  Dices, Zap, Heart,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Attrs { FOR: number; AGI: number; VIG: number; INT: number; PRE: number }

interface Character {
  id: string; nome: string; nivel: number;
  hpAtual: number; hpMax: number;
  energiaAtual: number; energiaMax: number;
  maestriaBonus: number;
  isMob: boolean; isApproved: boolean;
  specialization: { nome: string } | null;
  origemRelacao: { nome: string } | null;
  attributes: Attrs | null;
  user: { id: string; email: string };
}

interface Campaign {
  id: string; name: string;
  isActiveCombat: boolean;
  master: { id: string; email: string };
  characters: Character[];
}

interface CombatParticipant {
  id: string; ordem: number;
  iniciativa: number | null;
  hpAtual: number; energiaAtual: number;
  character: (Character & { attributes: Attrs | null }) | null;
  npc: { id: string; nome: string; hpAtual: number; hpMax: number; energiaAtual: number; energiaMax: number } | null;
  conditions: { id: string; condition: { nome: string; icone: string } }[];
}

interface Combat {
  id: string; state: string; round: number;
  currentTurn: number;
  campaignId: string;
  participants: CombatParticipant[];
}

interface CampaignLog {
  id: string; timestamp: string;
  actorName: string | null;
  action: string;
  result: string | null;
  details: Record<string, unknown> | null;
}

interface Weapon {
  id: string; nome: string; damageDice: string; damageType: string;
  threatRange: number; criticalMultiplier: number;
}
interface Technique {
  id: string; nome: string; custoEnergia: number; descricao?: string;
}
interface FullCharacter extends Character {
  weapons: Weapon[];
  techniques: Technique[];
}

// ─── Roll helpers ─────────────────────────────────────────────────────────────
function rollDiceLocally(expr: string): number {
  const match = expr.trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return NaN;
  const [, nd, ds, mod] = match;
  let total = 0;
  for (let i = 0; i < parseInt(nd); i++) total += Math.floor(Math.random() * parseInt(ds)) + 1;
  return total + (mod ? parseInt(mod) : 0);
}


// ─── Mini Sheet ───────────────────────────────────────────────────────────────
type MiniTab = "atributos" | "combate" | "habilidades";

function MiniSheet({ participant, token, combatId, campaignId, onStatsChange }: {
  participant: CombatParticipant;
  token: string;
  combatId: string;
  campaignId: string;
  onStatsChange: (participantId: string, hp: number, en: number) => void;
}) {
  const char = participant.character;
  const [full, setFull] = useState<FullCharacter | null>(null);
  const [tab, setTab] = useState<MiniTab>("combate");
  const [hp, setHp] = useState(participant.hpAtual);
  const [en, setEn] = useState(participant.energiaAtual);
  const [diceInput, setDiceInput] = useState("");
  const [lastRoll, setLastRoll] = useState<{ label: string; value: number; crit?: boolean } | null>(null);
  const [rolling, setRolling] = useState(false);
  const [weaponFilter, setWeaponFilter] = useState("");

  const hpMax = char?.hpMax ?? 1;
  const enMax = char?.energiaMax ?? 1;

  useEffect(() => {
    setHp(participant.hpAtual);
    setEn(participant.energiaAtual);
  }, [participant.hpAtual, participant.energiaAtual]);

  useEffect(() => {
    if (!char?.id || !token) return;
    apiCall<FullCharacter>(`/characters/${char.id}`, token)
      .then(setFull)
      .catch(() => {});
  }, [char?.id, token]);

  async function adjustStat(field: "hpAtual" | "energiaAtual", delta: number) {
    if (!char?.id) return;
    const maxVal = field === "hpAtual" ? hpMax : enMax;
    const cur    = field === "hpAtual" ? hp : en;
    const next   = Math.max(0, Math.min(maxVal, cur + delta));
    if (field === "hpAtual") setHp(next); else setEn(next);
    onStatsChange(participant.id, field === "hpAtual" ? next : hp, field === "energiaAtual" ? next : en);
    await apiCall(`/characters/${char.id}/stats`, token, { method: "PATCH", body: { [field]: next } }).catch(() => {});
  }

  async function rollWeapon(w: Weapon) {
    if (!char?.id || rolling) return;
    setRolling(true);
    try {
      const res = await apiCall<any>("/roll/weapon-attack", token, {
        method: "POST",
        body: { characterId: char.id, weaponId: w.id, combatId, campaignId },
      });
      const isCrit = res.naturalRoll >= w.threatRange;
      setLastRoll({ label: w.nome, value: res.total ?? res.roll ?? res.naturalRoll, crit: isCrit });
    } catch { /* ignore */ } finally { setRolling(false); }
  }

  async function rollTechnique(t: Technique) {
    if (!char?.id || rolling) return;
    setRolling(true);
    try {
      const res = await apiCall<any>("/roll/technique", token, {
        method: "POST",
        body: { techniqueId: t.id, actorId: char.id, combatId, campaignId },
      });
      setLastRoll({ label: t.nome, value: res.total ?? res.roll });
    } catch { /* ignore */ } finally { setRolling(false); }
  }

  async function rollAttr(attr: keyof Attrs) {
    if (!char?.id || rolling) return;
    setRolling(true);
    try {
      const res = await apiCall<any>("/roll/attribute", token, {
        method: "POST",
        body: { characterId: char.id, attribute: attr, combatId, campaignId },
      });
      setLastRoll({ label: attr, value: res.total ?? res.roll });
    } catch { /* ignore */ } finally { setRolling(false); }
  }

  function rollFree() {
    if (!diceInput.trim()) return;
    const result = rollDiceLocally(diceInput.trim());
    if (!isNaN(result)) setLastRoll({ label: diceInput.trim(), value: result });
    setDiceInput("");
  }

  if (!char) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#52525B", fontSize: 12 }}>NPC selecionado</span>
    </div>
  );

  const filteredWeapons = full?.weapons.filter(w => !weaponFilter || w.nome.toLowerCase().includes(weaponFilter.toLowerCase())) ?? [];

  const ATTR_KEYS: (keyof Attrs)[] = ["FOR", "AGI", "VIG", "INT", "PRE"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "1px solid #1A1A1A" }}>

      {/* ── Header: name + class ── */}
      <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #1A1A1A", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, flexShrink: 0,
            background: "#0D0D0D", border: "1px solid #2A2A2A", borderRadius: 3,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: "#2A2A2A", fontFamily: "Cinzel, serif" }}>{char.nome[0]?.toUpperCase()}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#F3F4F6", fontFamily: "Cinzel, serif", letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{char.nome}</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3, letterSpacing: "0.04em" }}>
              {char.specialization?.nome ?? "Sem classe"} · NEX: Nv.{char.nivel}
            </div>
            <Link href={`/ficha/${char.id}`} target="_blank"
              style={{ display: "inline-block", marginTop: 6, fontSize: 9, color: "#52525B", textDecoration: "none", letterSpacing: "0.1em" }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = "#A78BFA")}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "#52525B")}
            >VER FICHA ↗</Link>
          </div>
        </div>

        {/* Stat bars — full width with << < VALUE > >> */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {([
            { label: "HP",  cur: hp, max: hpMax, color: "#C62828", field: "hpAtual"      as const },
            { label: "EN",  cur: en, max: enMax, color: "#6A1B9A", field: "energiaAtual" as const },
          ] as const).map(({ label: _label, cur, max, color, field }) => {
            const pct = max > 0 ? Math.min(100, (cur / max) * 100) : 0;
            return (
              <div key={field} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {/* Left: big decrease */}
                {([-5, -1] as const).map(d => (
                  <button key={d} onClick={() => adjustStat(field, d)} style={{
                    width: 28, height: 36, background: "#111", border: "1px solid #222",
                    borderRight: "none", cursor: "pointer",
                    color: "#EF4444", fontSize: 10, fontWeight: 700,
                    borderRadius: d === -5 ? "3px 0 0 3px" : 0,
                    flexShrink: 0,
                  }}>{d}</button>
                ))}
                {/* Bar */}
                <div style={{ flex: 1, height: 36, background: "#0D0D0D", border: "1px solid #222", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.9)", fontFamily: "Cinzel, serif" }}>{cur} / {max}</span>
                  </div>
                </div>
                {/* Right: big increase */}
                {([1, 5] as const).map(d => (
                  <button key={d} onClick={() => adjustStat(field, d)} style={{
                    width: 28, height: 36, background: "#111", border: "1px solid #222",
                    borderLeft: "none", cursor: "pointer",
                    color: "#22C55E", fontSize: 10, fontWeight: 700,
                    borderRadius: d === 5 ? "0 3px 3px 0" : 0,
                    flexShrink: 0,
                  }}>+{d}</button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "1px solid #1A1A1A", flexShrink: 0 }}>
        {([
          { id: "atributos",   label: "ATRIBUTOS"  },
          { id: "combate",     label: "COMBATE"    },
          { id: "habilidades", label: "TÉCNICAS"   },
        ] as { id: MiniTab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            padding: "11px 0",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Cinzel, serif",
            color: tab === t.id ? "#E5E7EB" : "#52525B",
            borderBottom: `2px solid ${tab === t.id ? "#7C3AED" : "transparent"}`,
            marginBottom: -1, transition: "color 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>

        {/* ATRIBUTOS — 2×3 grid, somente chaves conhecidas */}
        {tab === "atributos" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {char.attributes && ATTR_KEYS.filter(k => k in char.attributes!).map(k => {
              const v = (char.attributes as unknown as Record<string, number>)[k];
              return (
                <button
                  key={k}
                  onClick={() => rollAttr(k)}
                  disabled={rolling}
                  style={{
                    background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 3,
                    padding: "14px 12px", cursor: rolling ? "not-allowed" : "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    transition: "border-color 0.15s", outline: "none",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
                >
                  <span style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.18em", fontFamily: "Cinzel, serif" }}>{k}</span>
                  <span style={{ fontSize: 32, fontWeight: 900, color: "#E5E7EB", fontFamily: "Cinzel, serif", lineHeight: 1 }}>{v}</span>
                  <span style={{ fontSize: 8, color: "#3B1A6B", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 3 }}>
                    <Dices size={8} /> ROLAR
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* COMBATE */}
        {tab === "combate" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Weapon filter */}
            <input
              value={weaponFilter}
              onChange={e => setWeaponFilter(e.target.value)}
              placeholder="Filtrar ataques"
              style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: "none", borderBottom: "1px solid #27272A", padding: "8px 0", color: "#9CA3AF", fontSize: 13, outline: "none" }}
              onFocus={e => (e.target.style.borderBottomColor = "#7C3AED")}
              onBlur={e => (e.target.style.borderBottomColor = "#27272A")}
            />

            {/* Free dice */}
            <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #27272A" }}>
              <input
                value={diceInput}
                onChange={e => setDiceInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && rollFree()}
                placeholder="Rolar dados"
                style={{ flex: 1, background: "transparent", border: "none", padding: "8px 0", color: "#9CA3AF", fontSize: 13, outline: "none" }}
              />
              <button onClick={rollFree} style={{ background: "none", border: "none", cursor: "pointer", color: "#52525B", padding: "4px" }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#A78BFA")}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#52525B")}
              >
                <Dices size={18} />
              </button>
            </div>

            {/* Weapons — single column rows */}
            {!full ? (
              <p style={{ fontSize: 11, color: "#52525B", textAlign: "center", padding: "16px 0" }}>Carregando…</p>
            ) : filteredWeapons.length === 0 ? (
              <p style={{ fontSize: 11, color: "#3F3F46", textAlign: "center", padding: "16px 0" }}>Nenhuma arma equipada.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredWeapons.map(w => (
                  <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#0D0D0D", border: "1px solid #1A1A1A", borderRadius: 3 }}>
                    <div style={{ width: 20, height: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C3AED" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#E5E7EB" }}>{w.nome}</div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                        Dano: <span style={{ color: "#9CA3AF" }}>{w.damageDice}</span>
                        {"  "}Crítico: <span style={{ color: "#9CA3AF" }}>{w.threatRange < 20 ? w.threatRange : "20"}/×{w.criticalMultiplier}</span>
                      </div>
                    </div>
                    <button onClick={() => rollWeapon(w)} disabled={rolling} style={{ background: "none", border: "none", cursor: rolling ? "not-allowed" : "pointer", color: "#52525B", flexShrink: 0, padding: "4px" }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#A78BFA")}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#52525B")}
                    ><Dices size={18} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HABILIDADES — single column rows */}
        {tab === "habilidades" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {!full ? (
              <p style={{ fontSize: 11, color: "#52525B", textAlign: "center", padding: "16px 0" }}>Carregando…</p>
            ) : full.techniques.length === 0 ? (
              <p style={{ fontSize: 11, color: "#3F3F46", textAlign: "center", padding: "16px 0" }}>Nenhuma técnica aprendida.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {full.techniques.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#0D0D0D", border: "1px solid #1A1A1A", borderRadius: 3 }}>
                    <div style={{ width: 20, height: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6A1B9A" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#E5E7EB" }}>{t.nome}</div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <Zap size={10} /> {t.custoEnergia} energia
                      </div>
                    </div>
                    <button onClick={() => rollTechnique(t)} disabled={rolling} style={{ background: "none", border: "none", cursor: rolling ? "not-allowed" : "pointer", color: "#52525B", flexShrink: 0, padding: "4px" }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#A78BFA")}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#52525B")}
                    ><Dices size={18} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type Tab = "agentes" | "combates" | "ajustes";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: "agentes",  label: "AGENTES"  },
  { id: "combates", label: "COMBATES" },
  { id: "ajustes",  label: "AJUSTES"  },
];

function hpColor(cur: number, max: number) {
  const pct = max > 0 ? cur / max : 0;
  if (pct > 0.5) return "#EF4444";
  if (pct > 0.25) return "#F97316";
  return "#7F1D1D";
}

// ─── Agent Card ───────────────────────────────────────────────────────────────
function AgentCard({ char }: { char: Character }) {
  const attrs = char.attributes;
  const hpPct  = char.hpMax > 0 ? (char.hpAtual / char.hpMax) * 100 : 0;
  const enPct  = char.energiaMax > 0 ? (char.energiaAtual / char.energiaMax) * 100 : 0;

  return (
    <div style={{
      background: "#0F0F0F",
      border: "1px solid #1F1F1F",
      borderRadius: 4,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{
          width: 52, height: 52, flexShrink: 0,
          background: "#1A1A1A", border: "1px solid #2A2A2A",
          borderRadius: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Users size={20} color="#3A3A3A" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#F3F4F6", fontFamily: "Cinzel, serif", letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {char.nome}
          </div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
            {char.specialization?.nome ?? "Sem classe"}
            {char.origemRelacao ? ` · ${char.origemRelacao.nome}` : ""}
          </div>
          <div style={{ fontSize: 10, color: "#7C3AED", letterSpacing: "0.1em", marginTop: 3, fontFamily: "Cinzel, serif" }}>
            NÍV. {char.nivel}
          </div>
        </div>
      </div>

      {/* Attributes */}
      {attrs && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4 }}>
          {(["AGI","FOR","INT","PRE","VIG"] as (keyof Attrs)[]).map(k => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.1em", marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#D1D5DB" }}>{attrs[k]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* HP */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em" }}>VIDA</span>
            <span style={{ fontSize: 9, color: "#9CA3AF" }}>{char.hpAtual}/{char.hpMax}</span>
          </div>
          <div style={{ height: 8, background: "#1A1A1A", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${hpPct}%`, height: "100%", background: hpColor(char.hpAtual, char.hpMax), transition: "width 0.3s" }} />
          </div>
        </div>
        {/* Energia */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em" }}>ENERGIA</span>
            <span style={{ fontSize: 9, color: "#9CA3AF" }}>{char.energiaAtual}/{char.energiaMax}</span>
          </div>
          <div style={{ height: 8, background: "#1A1A1A", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${enPct}%`, height: "100%", background: "#7C3AED", transition: "width 0.3s" }} />
          </div>
        </div>
      </div>

      {/* Ficha link */}
      <Link
        href={`/ficha/${char.id}`}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "7px 0",
          background: "transparent",
          border: "1px solid #27272A",
          borderRadius: 2,
          color: "#71717A",
          fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
          textDecoration: "none",
          textTransform: "uppercase",
          transition: "border-color 0.15s, color 0.15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#7C3AED"; (e.currentTarget as HTMLAnchorElement).style.color = "#A78BFA"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#27272A"; (e.currentTarget as HTMLAnchorElement).style.color = "#71717A"; }}
      >
        Ficha <ChevronRight size={12} />
      </Link>
    </div>
  );
}

// ─── Combat Panel ─────────────────────────────────────────────────────────────
function CombatPanel({
  campaign, combat, token,
  onCombatUpdate,
}: {
  campaign: Campaign;
  combat: Combat | null;
  token: string;
  onCombatUpdate: (c: Combat | null) => void;
}) {
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [selected, setSelected]   = useState<CombatParticipant | null>(null);
  const [participants, setParticipants] = useState<CombatParticipant[]>([]);

  const agents = campaign.characters.filter(c => !c.isMob && c.isApproved);

  useEffect(() => {
    if (combat) setParticipants(combat.participants);
  }, [combat]);

  async function handleStartCombat() {
    setLoading(true); setError("");
    try {
      const created = await apiCall<Combat>("/combats", token, { method: "POST", body: { campaignId: campaign.id } });
      for (const char of agents) {
        await apiCall(`/combats/${created.id}/participants`, token, { method: "POST", body: { characterId: char.id } });
      }
      await apiCall(`/combats/${created.id}/initiative`, token, { method: "POST" });
      const state = await apiCall<Combat>(`/combats/${created.id}/round/start`, token, { method: "POST" });
      onCombatUpdate(state);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao iniciar combate.");
    } finally { setLoading(false); }
  }

  async function handleFinishCombat() {
    if (!combat) return;
    setLoading(true); setError("");
    try {
      await apiCall(`/combats/${combat.id}/finish`, token, { method: "POST" });
      onCombatUpdate(null);
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao encerrar.");
    } finally { setLoading(false); }
  }

  function handleStatsChange(participantId: string, hp: number, en: number) {
    setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, hpAtual: hp, energiaAtual: en } : p));
    if (selected?.id === participantId) setSelected(prev => prev ? { ...prev, hpAtual: hp, energiaAtual: en } : prev);
  }

  // No active combat
  if (!combat || combat.state === "COMBAT_FINISHED" || combat.state === "IDLE") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: 20 }}>
        <div style={{ width: 72, height: 72, border: "1px solid #27272A", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Swords size={28} color="#3F3F46" />
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#71717A", margin: "0 0 6px" }}>Nenhum combate ativo</p>
          <p style={{ fontSize: 12, color: "#3F3F46", margin: 0 }}>Ao iniciar, a iniciativa será rolada automaticamente para todos os agentes aprovados.</p>
        </div>
        {agents.length === 0
          ? <p style={{ fontSize: 12, color: "#EF4444" }}>Nenhum agente aprovado na campanha.</p>
          : <button onClick={handleStartCombat} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", background: loading ? "#3B0764" : "#7C3AED", border: "none", borderRadius: 3, color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Cinzel, serif", cursor: loading ? "not-allowed" : "pointer" }}>
              <Play size={14} /> {loading ? "Iniciando…" : "Iniciar Combate"}
            </button>
        }
        {error && <p style={{ fontSize: 12, color: "#F87171" }}>{error}</p>}
      </div>
    );
  }

  const sorted = [...participants].sort((a, b) => (b.iniciativa ?? 0) - (a.iniciativa ?? 0));
  const currentPart = sorted[combat.currentTurn % Math.max(sorted.length, 1)];

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0, gap: 0 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* Left: turn order */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid #1A1A1A", overflow: "hidden" }}>
        {/* Combat header */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#EF4444", boxShadow: "0 0 6px #EF4444", animation: "pulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 700, letterSpacing: "0.08em" }}>RODADA {combat.round}</span>
          </div>
          <button onClick={handleFinishCombat} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "transparent", border: "1px solid #3F1515", borderRadius: 2, color: "#EF4444", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            <StopCircle size={11} /> Encerrar
          </button>
        </div>

        {error && <p style={{ fontSize: 11, color: "#F87171", padding: "6px 14px", margin: 0 }}>{error}</p>}

        {/* Turn list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "8px 14px 4px", fontSize: 9, color: "#3F3F46", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Cinzel, serif" }}>Iniciativa</div>
          <div style={{ fontSize: 10, color: "#52525B", padding: "0 14px 10px" }}>Rodada Atual: {combat.round}</div>
          {sorted.map(p => {
            const name    = p.character?.nome ?? p.npc?.nome ?? "?";
            const hp      = p.hpAtual;
            const en      = p.energiaAtual;
            const hpMax   = p.character?.hpMax ?? p.npc?.hpMax ?? 1;
            const enMax   = p.character?.energiaMax ?? p.npc?.energiaMax ?? 1;
            const isCur   = p.id === currentPart?.id;
            const isSel   = selected?.id === p.id;

            return (
              <div
                key={p.id}
                onClick={() => setSelected(isSel ? null : p)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  background: isSel ? "rgba(124,58,237,0.1)" : isCur ? "rgba(124,58,237,0.06)" : "transparent",
                  borderLeft: `3px solid ${isSel ? "#7C3AED" : isCur ? "#4C1D95" : "transparent"}`,
                  borderBottom: "1px solid #111",
                  transition: "background 0.15s",
                }}
              >
                {/* Avatar */}
                <div style={{ width: 42, height: 42, background: "#0D0D0D", border: `1px solid ${isCur ? "#7C3AED" : "#1E1E1E"}`, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: isCur ? "#A78BFA" : "#2A2A2A", fontFamily: "Cinzel, serif" }}>{name[0]?.toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isCur ? "#F3F4F6" : "#9CA3AF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>{name}</div>
                  <div style={{ fontSize: 11, color: "#52525B", display: "flex", gap: 10 }}>
                    <span style={{ color: "#C62828" }}>{hp}/{hpMax}</span>
                    <span style={{ color: "#6A1B9A" }}>{en}/{enMax}</span>
                  </div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: isCur ? "#A78BFA" : "#3F3F46", fontFamily: "Cinzel, serif", flexShrink: 0, minWidth: 32, textAlign: "right" }}>
                  {p.iniciativa ?? 0}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: mini sheet or placeholder */}
      {selected ? (
        <MiniSheet
          key={selected.id}
          participant={selected}
          token={token}
          combatId={combat.id}
          campaignId={campaign.id}
          onStatsChange={handleStatsChange}
        />
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
          <Users size={28} color="#27272A" />
          <p style={{ fontSize: 12, color: "#3F3F46", margin: 0 }}>Clique em um participante para ver a mini ficha</p>
        </div>
      )}
    </div>
  );
}

// ─── Log Feed ─────────────────────────────────────────────────────────────────
function LogFeed({ logs }: { logs: CampaignLog[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  function parseDetails(log: CampaignLog): { ataque?: number; dano?: number; roll?: number } {
    if (!log.details) return {};
    const d = log.details as Record<string, unknown>;
    return {
      ataque: typeof d.total === "number" ? d.total : typeof d.roll === "number" ? d.roll : undefined,
      dano:   typeof d.damage === "number" ? d.damage : undefined,
      roll:   typeof d.total === "number" ? d.total : typeof d.roll === "number" ? d.roll : undefined,
    };
  }

  return (
    <div style={{
      width: 260, flexShrink: 0,
      background: "#0A0A0A",
      borderRight: "1px solid #1A1A1A",
      display: "flex", flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #1A1A1A" }}>
        <p style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0, fontFamily: "Cinzel, serif" }}>
          Resultados
        </p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {logs.length === 0 && (
          <p style={{ fontSize: 11, color: "#3F3F46", textAlign: "center", padding: "32px 16px" }}>
            Nenhum registro ainda.
          </p>
        )}
        {logs.map(log => {
          const { ataque, dano } = parseDetails(log);
          const hasNumbers = ataque !== undefined || dano !== undefined;

          return (
            <div key={log.id} style={{
              padding: "10px 14px",
              borderBottom: "1px solid #111",
            }}>
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
                {log.actorName ?? "Sistema"}
              </div>
              <div style={{ fontSize: 12, color: "#D1D5DB", marginBottom: hasNumbers ? 6 : 0 }}>
                {log.action}
                {log.result ? ` · ${log.result}` : ""}
              </div>
              {hasNumbers && (
                <div style={{ display: "flex", gap: 8 }}>
                  {ataque !== undefined && (
                    <div style={{ flex: 1, background: "#111", border: "1px solid #1F1F1F", borderRadius: 2, padding: "4px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#A78BFA", fontFamily: "Cinzel, serif" }}>{ataque}</div>
                      <div style={{ fontSize: 8, color: "#52525B", letterSpacing: "0.1em" }}>ROLAGEM</div>
                    </div>
                  )}
                  {dano !== undefined && (
                    <div style={{ flex: 1, background: "#111", border: "1px solid #1F1F1F", borderRadius: 2, padding: "4px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#EF4444", fontFamily: "Cinzel, serif" }}>{dano}</div>
                      <div style={{ fontSize: 8, color: "#52525B", letterSpacing: "0.1em" }}>DANO</div>
                    </div>
                  )}
                </div>
              )}
              <div style={{ fontSize: 9, color: "#3F3F46", marginTop: 4 }}>
                {new Date(log.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ─── Ajustes Panel (Ganhos + Perdas unificado) ────────────────────────────────
type AjusteType = "MAESTRIA" | "HP" | "ENERGIA" | "XP";

const AJUSTE_DEFS: { type: AjusteType; label: string; color: string; icon: string; field: string }[] = [
  { type: "MAESTRIA", label: "Maestria",          color: "#A855F7", icon: "✦", field: "maestriaBonus" },
  { type: "HP",       label: "Pontos de Vida",    color: "#EF4444", icon: "♥", field: "hpMax"         },
  { type: "ENERGIA",  label: "Pontos de Energia", color: "#7C3AED", icon: "⚡", field: "energiaMax"    },
  { type: "XP",       label: "Experiência",       color: "#F59E0B", icon: "★", field: "xp"            },
];

function AjustesPanel({ agents, token, campaignId }: { agents: Character[]; token: string; campaignId: string }) {
  const [selectedType, setSelectedType] = useState<AjusteType | null>(null);
  const [direction, setDirection]       = useState<"add" | "sub">("add");
  const [target, setTarget]             = useState<"all" | string>("all");
  const [amount, setAmount]             = useState("");
  const [applying, setApplying]         = useState(false);
  const [result, setResult]             = useState<{ ok: boolean; msg: string } | null>(null);

  const def = AJUSTE_DEFS.find(d => d.type === selectedType);

  function currentBase(char: Character): number {
    if (!selectedType) return 0;
    switch (selectedType) {
      case "MAESTRIA": return char.maestriaBonus;
      case "HP":       return char.hpMax;
      case "ENERGIA":  return char.energiaMax;
      case "XP":       return 0;
    }
  }

  async function applyAjuste() {
    if (!selectedType || !amount.trim()) return;
    const n = parseInt(amount, 10);
    if (isNaN(n) || n <= 0) { setResult({ ok: false, msg: "Valor deve ser um inteiro positivo." }); return; }

    const targets = target === "all" ? agents : agents.filter(a => a.id === target);
    if (targets.length === 0) { setResult({ ok: false, msg: "Nenhum alvo selecionado." }); return; }

    const delta = direction === "add" ? n : -n;

    setApplying(true); setResult(null);

    try {
      for (const char of targets) {
        if (selectedType === "XP") {
          if (direction === "sub") { setResult({ ok: false, msg: "Não é possível remover XP." }); return; }
          await apiCall(`/characters/${char.id}/xp`, token, { method: "POST", body: { amount: n, campaignId } });
        } else {
          const base   = currentBase(char);
          const newVal = Math.max(1, base + delta);
          await apiCall(`/characters/${char.id}/stats`, token, { method: "PATCH", body: { [def!.field]: newVal } });
        }
      }
      const who  = target === "all" ? "todos os agentes" : targets[0].nome;
      const sign = direction === "add" ? "+" : "−";
      setResult({ ok: true, msg: `${sign}${n} ${def?.label} aplicado a ${who}.` });
      setAmount("");
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : "Erro ao aplicar ajuste." });
    } finally { setApplying(false); }
  }

  if (agents.length === 0) return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <Users size={28} color="#27272A" style={{ marginBottom: 10 }} />
      <p style={{ fontSize: 13, color: "#52525B" }}>Nenhum agente aprovado na campanha.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Direction toggle */}
      <div style={{ display: "flex", gap: 0, border: "1px solid #1F1F1F", borderRadius: 3, overflow: "hidden" }}>
        {([
          { id: "add", label: "CONCEDER", color: "#22C55E" },
          { id: "sub", label: "REDUZIR",  color: "#EF4444" },
        ] as const).map(d => (
          <button key={d.id} onClick={() => { setDirection(d.id); setResult(null); setAmount(""); }} style={{
            flex: 1, padding: "12px 0", border: "none", cursor: "pointer",
            background: direction === d.id
              ? d.id === "add" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)"
              : "#0D0D0D",
            color: direction === d.id ? d.color : "#3F3F46",
            fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", fontFamily: "Cinzel, serif",
            borderRight: d.id === "add" ? "1px solid #1F1F1F" : "none",
            transition: "all 0.15s",
          }}>{d.id === "add" ? "+ " : "− "}{d.label}</button>
        ))}
      </div>

      {/* Stat type selector */}
      <div>
        <p style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.18em", margin: "0 0 12px", fontFamily: "Cinzel, serif" }}>TIPO DE STAT</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {AJUSTE_DEFS.filter(d => !(direction === "sub" && d.type === "XP")).map(d => {
            const active = selectedType === d.type;
            return (
              <button key={d.type} onClick={() => { setSelectedType(active ? null : d.type); setResult(null); setAmount(""); }} style={{
                background: active ? `rgba(${
                  d.color === "#A855F7" ? "168,85,247" :
                  d.color === "#EF4444" ? "239,68,68"  :
                  d.color === "#7C3AED" ? "124,58,237" : "245,158,11"
                },0.12)` : "#0F0F0F",
                border: `1px solid ${active ? d.color : "#1F1F1F"}`,
                borderRadius: 3, padding: "12px 14px", cursor: "pointer", textAlign: "left",
                transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20, color: active ? d.color : "#3F3F46", lineHeight: 1 }}>{d.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: active ? d.color : "#9CA3AF" }}>{d.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedType && (
        <>
          {/* Target */}
          <div>
            <p style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.18em", margin: "0 0 12px", fontFamily: "Cinzel, serif" }}>DESTINO</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={() => setTarget("all")} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: target === "all" ? "rgba(124,58,237,0.1)" : "#0F0F0F",
                border: `1px solid ${target === "all" ? "#7C3AED" : "#1F1F1F"}`,
                borderRadius: 3, padding: "10px 14px", cursor: "pointer", textAlign: "left",
                transition: "all 0.15s",
              }}>
                <Users size={16} color={target === "all" ? "#A78BFA" : "#52525B"} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: target === "all" ? "#A78BFA" : "#9CA3AF" }}>Todos os Agentes</div>
                  <div style={{ fontSize: 10, color: "#52525B" }}>{agents.length} personagem{agents.length !== 1 ? "s" : ""}</div>
                </div>
                {target === "all" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C3AED" }} />}
              </button>

              {agents.map(char => {
                const active = target === char.id;
                const base   = currentBase(char);
                return (
                  <button key={char.id} onClick={() => setTarget(active ? "all" : char.id)} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: active ? `rgba(${
                      def!.color === "#A855F7" ? "168,85,247" :
                      def!.color === "#EF4444" ? "239,68,68"  :
                      def!.color === "#7C3AED" ? "124,58,237" : "245,158,11"
                    },0.08)` : "#0F0F0F",
                    border: `1px solid ${active ? def!.color : "#1F1F1F"}`,
                    borderRadius: 3, padding: "10px 14px", cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s",
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: 2, background: "#1A1A1A", border: "1px solid #2A2A2A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: active ? def!.color : "#3F3F46" }}>{char.nome[0].toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#F3F4F6" : "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{char.nome}</div>
                      <div style={{ fontSize: 10, color: "#52525B" }}>{char.specialization?.nome ?? "Sem classe"} · Nv.{char.nivel}</div>
                    </div>
                    {selectedType !== "XP" && (
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 9, color: "#3F3F46", letterSpacing: "0.1em" }}>ATUAL</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: active ? def!.color : "#52525B", fontFamily: "Cinzel, serif" }}>{base}</div>
                      </div>
                    )}
                    {active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: def!.color, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount + preview + apply */}
          <div>
            <p style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.18em", margin: "0 0 12px", fontFamily: "Cinzel, serif" }}>VALOR</p>

            {/* Preview */}
            {selectedType !== "XP" && target !== "all" && (() => {
              const char = agents.find(a => a.id === target);
              const n = parseInt(amount, 10);
              if (!char || !n || n <= 0) return null;
              const base   = currentBase(char);
              const result = Math.max(1, base + (direction === "add" ? n : -n));
              const sign   = direction === "add" ? "+" : "−";
              const resColor = direction === "add" ? "#22C55E" : "#EF4444";
              return (
                <div style={{ background: "#0A0A0A", border: `1px solid ${def!.color}33`, borderRadius: 3, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, color: "#52525B" }}>{base}</span>
                  <span style={{ fontSize: 11, color: resColor }}>{sign}{n}</span>
                  <span style={{ fontSize: 11, color: "#3F3F46" }}>=</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "#F3F4F6", fontFamily: "Cinzel, serif" }}>{result}</span>
                  <span style={{ fontSize: 10, color: "#52525B", marginLeft: 4 }}>{def!.label}</span>
                </div>
              );
            })()}

            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="number" min={1}
                value={amount}
                onChange={e => { setAmount(e.target.value); setResult(null); }}
                onKeyDown={e => e.key === "Enter" && applyAjuste()}
                placeholder="Ex.: 5"
                style={{
                  flex: 1, background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 3,
                  color: "#E5E7EB", fontSize: 18, fontWeight: 700, fontFamily: "Cinzel, serif",
                  padding: "10px 14px", outline: "none", textAlign: "center",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = direction === "add" ? "#22C55E" : "#EF4444")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
              />
              <button
                onClick={applyAjuste}
                disabled={applying || !amount.trim()}
                style={{
                  padding: "0 24px",
                  background: applying || !amount.trim() ? "#1A1A1A" : direction === "add" ? "#166534" : "#7F1D1D",
                  border: `1px solid ${applying || !amount.trim() ? "#2A2A2A" : direction === "add" ? "#22C55E" : "#EF4444"}`,
                  borderRadius: 3, cursor: applying || !amount.trim() ? "not-allowed" : "pointer",
                  color: applying || !amount.trim() ? "#52525B" : direction === "add" ? "#22C55E" : "#EF4444",
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
                  fontFamily: "Cinzel, serif", whiteSpace: "nowrap", flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >{applying ? "Aplicando…" : direction === "add" ? "+ Conceder" : "− Reduzir"}</button>
            </div>
          </div>

          {result && (
            <div style={{
              background: result.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${result.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              borderRadius: 3, padding: "12px 16px",
              fontSize: 13, fontWeight: 600,
              color: result.ok ? "#22C55E" : "#EF4444",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>{result.ok ? "✓" : "✗"}</span> {result.msg}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function EscudoPage() {
  const params  = useParams();
  const id      = params?.id as string;
  const router  = useRouter();
  const { data: session, status } = useSession();

  const token  = (session?.user as any)?.backendToken as string | undefined;
  const userId = (session?.user as any)?.backendUserId as string | undefined;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [combat,   setCombat]   = useState<Combat | null>(null);
  const [logs,     setLogs]     = useState<CampaignLog[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<Tab>("agentes");

  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      const [camp, logsData] = await Promise.all([
        apiCall<Campaign>(`/campaigns/${id}`, token),
        apiCall<CampaignLog[]>(`/campaigns/${id}/logs`, token),
      ]);
      setCampaign(camp);
      setLogs(logsData);

      // If active combat, fetch combat state
      if (camp.isActiveCombat) {
        // Get active combat id from campaign endpoint
        const campFull = await apiCall<{ combats?: { id: string; state: string }[] }>(`/campaigns/${id}`, token);
        const activeCombat = (campFull as any).combats?.find((c: { state: string }) =>
          !["IDLE", "COMBAT_FINISHED"].includes(c.state)
        );
        if (activeCombat) {
          const combatState = await apiCall<Combat>(`/combats/${activeCombat.id}`, token);
          setCombat(combatState);
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [id, token]);

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status !== "authenticated" || !token) return;
    fetchAll();
  }, [status, token, fetchAll, router]);

  // Poll logs every 5s when on combates tab
  useEffect(() => {
    if (!token || tab !== "combates") return;
    const interval = setInterval(async () => {
      try {
        const logsData = await apiCall<CampaignLog[]>(`/campaigns/${id}/logs`, token);
        setLogs(logsData);
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [token, id, tab]);

  if (status === "loading" || loading) {
    return (
      <div style={{ height: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <div style={{ width: 36, height: 36, border: "2px solid #1F1F1F", borderTop: "2px solid #7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 12, color: "#52525B", letterSpacing: "0.1em" }}>Carregando Escudo…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={{ height: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#EF4444" }}>Campanha não encontrada.</span>
      </div>
    );
  }

  const isMaster = campaign.master.id === userId;
  if (!isMaster) {
    return (
      <div style={{ height: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <Shield size={32} color="#3F3F46" />
        <span style={{ fontSize: 13, color: "#71717A" }}>Apenas o Mestre pode acessar o Escudo.</span>
        <Link href={`/campanha/${id}`} style={{ fontSize: 12, color: "#7C3AED", textDecoration: "none" }}>← Voltar</Link>
      </div>
    );
  }

  const agents = campaign.characters.filter(c => !c.isMob && c.isApproved);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", paddingTop: 68, display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div style={{
        height: 52,
        background: "rgba(10,10,10,0.98)",
        borderBottom: "1px solid #1A1A1A",
        display: "flex", alignItems: "center",
        padding: "0 24px",
        gap: 16,
        flexShrink: 0,
      }}>
        <Link
          href={`/campanha/${id}`}
          style={{ display: "flex", alignItems: "center", gap: 6, color: "#52525B", textDecoration: "none", fontSize: 12, transition: "color 0.15s" }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "#A78BFA"}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "#52525B"}
        >
          <ChevronLeft size={14} /> Campanha
        </Link>

        <div style={{ width: 1, height: 16, background: "#1F1F1F" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={14} color="#7C3AED" />
          <span className="font-cinzel" style={{ fontSize: 13, fontWeight: 700, color: "#F3F4F6", letterSpacing: "0.1em" }}>
            Escudo do Mestre
          </span>
          <span style={{ fontSize: 12, color: "#52525B" }}>— {campaign.name}</span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={fetchAll}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#52525B", padding: 4, display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#A78BFA"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#52525B"}
          >
            <RefreshCw size={13} /> Atualizar
          </button>
        </div>
      </div>

      {/* Body: sidebar + main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", height: "calc(100vh - 68px - 52px)" }}>

        {/* Left: log feed */}
        <LogFeed logs={logs} />

        {/* Right: tabs */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Tab bar */}
          <div style={{
            display: "flex", gap: 0,
            borderBottom: "1px solid #1A1A1A",
            padding: "0 24px",
            flexShrink: 0,
          }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "14px 18px",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                  fontFamily: "Cinzel, serif",
                  color: tab === t.id ? "#F3F4F6" : "#52525B",
                  borderBottom: `2px solid ${tab === t.id ? "#7C3AED" : "transparent"}`,
                  transition: "color 0.15s, border-color 0.15s",
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

            {/* AGENTES */}
            {tab === "agentes" && (
              agents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 24px" }}>
                  <Users size={32} color="#27272A" style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: "#52525B" }}>Nenhum agente aprovado.</p>
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 16,
                }}>
                  {agents.map(c => <AgentCard key={c.id} char={c} />)}
                </div>
              )
            )}

            {/* COMBATES */}
            {tab === "combates" && (
              <CombatPanel
                campaign={campaign}
                combat={combat}
                token={token!}
                onCombatUpdate={c => {
                  setCombat(c);
                  if (!c) setCampaign(prev => prev ? { ...prev, isActiveCombat: false } : prev);
                }}
              />
            )}

            {/* AJUSTES */}
            {tab === "ajustes" && (
              <AjustesPanel agents={agents} token={token!} campaignId={id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
