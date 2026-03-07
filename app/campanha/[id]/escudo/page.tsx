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
    <div className="flex-1 flex items-center justify-center">
      <span className="text-text-faint text-[12px]">NPC selecionado</span>
    </div>
  );

  const filteredWeapons = full?.weapons.filter(w => !weaponFilter || w.nome.toLowerCase().includes(weaponFilter.toLowerCase())) ?? [];

  const ATTR_KEYS: (keyof Attrs)[] = ["FOR", "AGI", "VIG", "INT", "PRE"];

  return (
    <div className="flex-1 flex flex-col overflow-hidden border-l border-border-subtle">

      {/* ── Header: name + class ── */}
      <div className="px-5 pt-4 pb-[14px] border-b border-border-subtle shrink-0">
        <div className="flex items-start gap-[14px] mb-4">
          <div className="w-16 h-16 shrink-0 bg-bg-dark border border-border-md rounded-[3px] flex items-center justify-center">
            <span className="text-[26px] font-black text-border-md font-cinzel">{char.nome[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[18px] font-bold text-text-near font-cinzel tracking-[0.04em] whitespace-nowrap overflow-hidden text-ellipsis">{char.nome}</div>
            <div className="text-[11px] text-text-muted mt-[3px] tracking-[0.04em]">
              {char.specialization?.nome ?? "Sem classe"} · NEX: Nv.{char.nivel}
            </div>
            <Link href={`/ficha/${char.id}`} target="_blank"
              className="inline-block mt-[6px] text-[9px] text-text-faint no-underline tracking-[0.1em] transition-colors hover:text-brand-muted"
            >VER FICHA ↗</Link>
          </div>
        </div>

        {/* Stat bars — full width with << < VALUE > >> */}
        <div className="flex flex-col gap-2">
          {([
            { label: "HP",  cur: hp, max: hpMax, color: "#C62828", field: "hpAtual"      as const },
            { label: "EN",  cur: en, max: enMax, color: "#6A1B9A", field: "energiaAtual" as const },
          ] as const).map(({ label: _label, cur, max, color, field }) => {
            const pct = max > 0 ? Math.min(100, (cur / max) * 100) : 0;
            return (
              <div key={field} className="flex items-center">
                {/* Left: big decrease */}
                {([-5, -1] as const).map(d => (
                  <button key={d} onClick={() => adjustStat(field, d)} className="w-[28px] h-[36px] bg-bg-surface border border-[#222] cursor-pointer text-red-500 text-[10px] font-bold shrink-0"
                    style={{ borderRight: "none", borderRadius: d === -5 ? "3px 0 0 3px" : 0 }}
                  >{d}</button>
                ))}
                {/* Bar */}
                <div className="flex-1 h-[36px] bg-bg-dark border border-[#222] relative overflow-hidden">
                  <div className="absolute left-0 top-0 h-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[14px] font-bold text-white font-cinzel" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{cur} / {max}</span>
                  </div>
                </div>
                {/* Right: big increase */}
                {([1, 5] as const).map(d => (
                  <button key={d} onClick={() => adjustStat(field, d)} className="w-[28px] h-[36px] bg-bg-surface border border-[#222] cursor-pointer text-green-500 text-[10px] font-bold shrink-0"
                    style={{ borderLeft: "none", borderRadius: d === 5 ? "0 3px 3px 0" : 0 }}
                  >+{d}</button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-border-subtle shrink-0">
        {([
          { id: "atributos",   label: "ATRIBUTOS"  },
          { id: "combate",     label: "COMBATE"    },
          { id: "habilidades", label: "TÉCNICAS"   },
        ] as { id: MiniTab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 bg-transparent border-none cursor-pointer py-[11px] text-[10px] font-bold tracking-[0.1em] font-cinzel transition-colors -mb-px"
            style={{
              color: tab === t.id ? "#E5E7EB" : "#52525B",
              borderBottom: `2px solid ${tab === t.id ? "#7C3AED" : "transparent"}`,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto px-[18px] py-[14px]">

        {/* ATRIBUTOS — 2×3 grid */}
        {tab === "atributos" && (
          <div className="grid grid-cols-2 gap-2">
            {char.attributes && ATTR_KEYS.filter(k => k in char.attributes!).map(k => {
              const v = (char.attributes as unknown as Record<string, number>)[k];
              return (
                <button
                  key={k}
                  onClick={() => rollAttr(k)}
                  disabled={rolling}
                  className="bg-bg-dark border border-[#1E1E1E] rounded-[3px] px-3 py-[14px] flex flex-col items-center gap-[3px] transition-colors hover:border-brand outline-none disabled:cursor-not-allowed"
                >
                  <span className="text-[9px] text-text-faint tracking-[0.18em] font-cinzel">{k}</span>
                  <span className="text-[32px] font-black text-text-base font-cinzel leading-none">{v}</span>
                  <span className="text-[8px] text-[#3B1A6B] tracking-[0.1em] flex items-center gap-[3px]">
                    <Dices size={8} /> ROLAR
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* COMBATE */}
        {tab === "combate" && (
          <div className="flex flex-col gap-3">
            {/* Weapon filter */}
            <input
              value={weaponFilter}
              onChange={e => setWeaponFilter(e.target.value)}
              placeholder="Filtrar ataques"
              className="w-full box-border bg-transparent border-0 border-b border-border-strong px-0 py-2 text-text-dim text-[13px] outline-none focus:border-brand transition-colors"
              onFocus={e => (e.target.style.borderBottomColor = "#7C3AED")}
              onBlur={e => (e.target.style.borderBottomColor = "#27272A")}
            />

            {/* Free dice */}
            <div className="flex items-center border-b border-border-strong">
              <input
                value={diceInput}
                onChange={e => setDiceInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && rollFree()}
                placeholder="Rolar dados"
                className="flex-1 bg-transparent border-none py-2 text-text-dim text-[13px] outline-none"
              />
              <button onClick={rollFree}
                className="bg-transparent border-none cursor-pointer text-text-faint p-1 transition-colors hover:text-brand-muted"
              >
                <Dices size={18} />
              </button>
            </div>

            {/* Weapons — single column rows */}
            {!full ? (
              <p className="text-[11px] text-text-faint text-center py-4">Carregando…</p>
            ) : filteredWeapons.length === 0 ? (
              <p className="text-[11px] text-text-ghost text-center py-4">Nenhuma arma equipada.</p>
            ) : (
              <div className="flex flex-col gap-[6px]">
                {filteredWeapons.map(w => (
                  <div key={w.id} className="flex items-center gap-3 px-[14px] py-[10px] bg-bg-dark border border-border-subtle rounded-[3px]">
                    <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-text-base">{w.nome}</div>
                      <div className="text-[11px] text-text-muted mt-[2px]">
                        Dano: <span className="text-text-dim">{w.damageDice}</span>
                        {"  "}Crítico: <span className="text-text-dim">{w.threatRange < 20 ? w.threatRange : "20"}/×{w.criticalMultiplier}</span>
                      </div>
                    </div>
                    <button onClick={() => rollWeapon(w)} disabled={rolling}
                      className="bg-transparent border-none shrink-0 p-1 text-text-faint transition-colors hover:text-brand-muted disabled:cursor-not-allowed"
                    ><Dices size={18} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HABILIDADES — single column rows */}
        {tab === "habilidades" && (
          <div className="flex flex-col gap-[6px]">
            {!full ? (
              <p className="text-[11px] text-text-faint text-center py-4">Carregando…</p>
            ) : full.techniques.length === 0 ? (
              <p className="text-[11px] text-text-ghost text-center py-4">Nenhuma técnica aprendida.</p>
            ) : (
              <div className="flex flex-col gap-[6px]">
                {full.techniques.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-[14px] py-[10px] bg-bg-dark border border-border-subtle rounded-[3px]">
                    <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full" style={{ background: "#6A1B9A" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-text-base">{t.nome}</div>
                      <div className="text-[11px] text-text-muted mt-[2px] flex items-center gap-1">
                        <Zap size={10} /> {t.custoEnergia} energia
                      </div>
                    </div>
                    <button onClick={() => rollTechnique(t)} disabled={rolling}
                      className="bg-transparent border-none shrink-0 p-1 text-text-faint transition-colors hover:text-brand-muted disabled:cursor-not-allowed"
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
    <div className="bg-bg-deep border border-border rounded-[4px] p-[18px_20px] flex flex-col gap-[14px]">
      {/* Header */}
      <div className="flex gap-[14px] items-start">
        <div className="w-[52px] h-[52px] shrink-0 bg-[#1A1A1A] border border-border-md rounded-[2px] flex items-center justify-center">
          <Users size={20} color="#3A3A3A" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-text-near font-cinzel tracking-[0.04em] whitespace-nowrap overflow-hidden text-ellipsis">
            {char.nome}
          </div>
          <div className="text-[11px] text-text-muted mt-[2px]">
            {char.specialization?.nome ?? "Sem classe"}
            {char.origemRelacao ? ` · ${char.origemRelacao.nome}` : ""}
          </div>
          <div className="text-[10px] text-brand tracking-[0.1em] mt-[3px] font-cinzel">
            NÍV. {char.nivel}
          </div>
        </div>
      </div>

      {/* Attributes */}
      {attrs && (
        <div className="grid grid-cols-5 gap-1">
          {(["AGI","FOR","INT","PRE","VIG"] as (keyof Attrs)[]).map(k => (
            <div key={k} className="text-center">
              <div className="text-[9px] text-text-faint tracking-[0.1em] mb-[2px]">{k}</div>
              <div className="text-[14px] font-bold text-[#D1D5DB]">{attrs[k]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bars */}
      <div className="flex flex-col gap-2">
        {/* HP */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[9px] text-text-faint tracking-[0.12em]">VIDA</span>
            <span className="text-[9px] text-text-dim">{char.hpAtual}/{char.hpMax}</span>
          </div>
          <div className="h-2 bg-[#1A1A1A] rounded-[2px] overflow-hidden">
            <div className="h-full transition-[width] duration-300" style={{ width: `${hpPct}%`, background: hpColor(char.hpAtual, char.hpMax) }} />
          </div>
        </div>
        {/* Energia */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[9px] text-text-faint tracking-[0.12em]">ENERGIA</span>
            <span className="text-[9px] text-text-dim">{char.energiaAtual}/{char.energiaMax}</span>
          </div>
          <div className="h-2 bg-[#1A1A1A] rounded-[2px] overflow-hidden">
            <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${enPct}%` }} />
          </div>
        </div>
      </div>

      {/* Ficha link */}
      <Link
        href={`/ficha/${char.id}`}
        className="flex items-center justify-center gap-[6px] py-[7px] bg-transparent border border-border-strong rounded-[2px] text-text-mid text-[11px] font-semibold tracking-[0.08em] no-underline uppercase transition-colors hover:border-brand hover:text-brand-muted"
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
      <div className="flex flex-col items-center justify-center py-20 px-6 gap-5">
        <div className="w-[72px] h-[72px] border border-border-strong rounded-full flex items-center justify-center">
          <Swords size={28} color="#3F3F46" />
        </div>
        <div className="text-center">
          <p className="text-[14px] text-text-mid m-0 mb-[6px]">Nenhum combate ativo</p>
          <p className="text-[12px] text-text-ghost m-0">Ao iniciar, a iniciativa será rolada automaticamente para todos os agentes aprovados.</p>
        </div>
        {agents.length === 0
          ? <p className="text-[12px] text-red-500">Nenhum agente aprovado na campanha.</p>
          : <button onClick={handleStartCombat} disabled={loading}
              className="flex items-center gap-2 px-6 py-[10px] border-none rounded-[3px] text-white text-[13px] font-bold tracking-[0.1em] uppercase font-cinzel disabled:cursor-not-allowed transition-colors"
              style={{ background: loading ? "#3B0764" : "#7C3AED", cursor: loading ? "not-allowed" : "pointer" }}
            >
              <Play size={14} /> {loading ? "Iniciando…" : "Iniciar Combate"}
            </button>
        }
        {error && <p className="text-[12px] text-red-400">{error}</p>}
      </div>
    );
  }

  const sorted = [...participants].sort((a, b) => (b.iniciativa ?? 0) - (a.iniciativa ?? 0));
  const currentPart = sorted[combat.currentTurn % Math.max(sorted.length, 1)];

  return (
    <div className="flex h-full min-h-0 gap-0">
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* Left: turn order — responsive */}
      <div className="w-full lg:w-[280px] shrink-0 flex flex-col border-r border-border-subtle overflow-hidden">
        {/* Combat header */}
        <div className="px-[14px] py-3 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-[7px] h-[7px] rounded-full bg-red-500" style={{ boxShadow: "0 0 6px #EF4444", animation: "pulse 1.5s ease-in-out infinite" }} />
            <span className="text-[11px] text-red-500 font-bold tracking-[0.08em]">RODADA {combat.round}</span>
          </div>
          <button onClick={handleFinishCombat} disabled={loading}
            className="flex items-center gap-[5px] px-[10px] py-1 bg-transparent border border-[#3F1515] rounded-[2px] text-red-500 text-[10px] font-bold cursor-pointer"
          >
            <StopCircle size={11} /> Encerrar
          </button>
        </div>

        {error && <p className="text-[11px] text-red-400 px-[14px] py-[6px] m-0">{error}</p>}

        {/* Turn list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-[14px] pt-2 pb-1 text-[9px] text-text-ghost tracking-[0.15em] uppercase font-cinzel">Iniciativa</div>
          <div className="text-[10px] text-text-faint px-[14px] pb-[10px]">Rodada Atual: {combat.round}</div>
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
                className="flex items-center gap-[10px] px-[14px] py-[10px] cursor-pointer border-b border-[#111] transition-colors"
                style={{
                  background: isSel ? "rgba(124,58,237,0.1)" : isCur ? "rgba(124,58,237,0.06)" : "transparent",
                  borderLeft: `3px solid ${isSel ? "#7C3AED" : isCur ? "#4C1D95" : "transparent"}`,
                }}
              >
                {/* Avatar */}
                <div className="w-[42px] h-[42px] bg-bg-dark rounded-[3px] flex items-center justify-center shrink-0"
                  style={{ border: `1px solid ${isCur ? "#7C3AED" : "#1E1E1E"}` }}
                >
                  <span className="text-[16px] font-black font-cinzel" style={{ color: isCur ? "#A78BFA" : "#2A2A2A" }}>{name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis mb-1" style={{ color: isCur ? "#F3F4F6" : "#9CA3AF" }}>{name}</div>
                  <div className="text-[11px] text-text-faint flex gap-[10px]">
                    <span style={{ color: "#C62828" }}>{hp}/{hpMax}</span>
                    <span style={{ color: "#6A1B9A" }}>{en}/{enMax}</span>
                  </div>
                </div>
                <div className="text-[26px] font-black font-cinzel shrink-0 min-w-[32px] text-right" style={{ color: isCur ? "#A78BFA" : "#3F3F46" }}>
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
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <Users size={28} color="#27272A" />
          <p className="text-[12px] text-text-ghost m-0">Clique em um participante para ver a mini ficha</p>
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
    <div className="w-[260px] shrink-0 bg-bg-input border-r border-border-subtle flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-border-subtle">
        <p className="text-[10px] text-text-faint tracking-[0.18em] uppercase m-0 font-cinzel">
          Resultados
        </p>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {logs.length === 0 && (
          <p className="text-[11px] text-text-ghost text-center px-4 py-8">
            Nenhum registro ainda.
          </p>
        )}
        {logs.map(log => {
          const { ataque, dano } = parseDetails(log);
          const hasNumbers = ataque !== undefined || dano !== undefined;

          return (
            <div key={log.id} className="px-[14px] py-[10px] border-b border-[#111]">
              <div className="text-[11px] text-text-muted mb-1">
                {log.actorName ?? "Sistema"}
              </div>
              <div className="text-[12px] text-[#D1D5DB]" style={{ marginBottom: hasNumbers ? 6 : 0 }}>
                {log.action}
                {log.result ? ` · ${log.result}` : ""}
              </div>
              {hasNumbers && (
                <div className="flex gap-2">
                  {ataque !== undefined && (
                    <div className="flex-1 bg-bg-surface border border-border rounded-[2px] px-2 py-1 text-center">
                      <div className="text-[18px] font-bold text-brand-muted font-cinzel">{ataque}</div>
                      <div className="text-[8px] text-text-faint tracking-[0.1em]">ROLAGEM</div>
                    </div>
                  )}
                  {dano !== undefined && (
                    <div className="flex-1 bg-bg-surface border border-border rounded-[2px] px-2 py-1 text-center">
                      <div className="text-[18px] font-bold text-red-500 font-cinzel">{dano}</div>
                      <div className="text-[8px] text-text-faint tracking-[0.1em]">DANO</div>
                    </div>
                  )}
                </div>
              )}
              <div className="text-[9px] text-text-ghost mt-1">
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

function AjustesPanel({ agents, token, campaignId, onRefresh }: { agents: Character[]; token: string; campaignId: string; onRefresh?: () => void }) {
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
      onRefresh?.();
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : "Erro ao aplicar ajuste." });
    } finally { setApplying(false); }
  }

  if (agents.length === 0) return (
    <div className="text-center py-[60px] px-6">
      <Users size={28} color="#27272A" className="mb-[10px]" />
      <p className="text-[13px] text-text-faint">Nenhum agente aprovado na campanha.</p>
    </div>
  );

  return (
    <div className="max-w-[560px] flex flex-col gap-5">

      {/* Direction toggle */}
      <div className="flex border border-border rounded-[3px] overflow-hidden">
        {([
          { id: "add", label: "CONCEDER", color: "#22C55E" },
          { id: "sub", label: "REDUZIR",  color: "#EF4444" },
        ] as const).map(d => (
          <button key={d.id} onClick={() => { setDirection(d.id); setResult(null); setAmount(""); }}
            className="flex-1 py-3 border-none cursor-pointer text-[12px] font-bold tracking-[0.14em] font-cinzel transition-all"
            style={{
              background: direction === d.id
                ? d.id === "add" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)"
                : "#0D0D0D",
              color: direction === d.id ? d.color : "#3F3F46",
              borderRight: d.id === "add" ? "1px solid #1F1F1F" : "none",
            }}
          >{d.id === "add" ? "+ " : "− "}{d.label}</button>
        ))}
      </div>

      {/* Stat type selector */}
      <div>
        <p className="text-[10px] text-text-faint tracking-[0.18em] m-0 mb-3 font-cinzel">TIPO DE STAT</p>
        <div className="grid grid-cols-2 gap-2">
          {AJUSTE_DEFS.filter(d => !(direction === "sub" && d.type === "XP")).map(d => {
            const active = selectedType === d.type;
            return (
              <button key={d.type} onClick={() => { setSelectedType(active ? null : d.type); setResult(null); setAmount(""); }}
                className="rounded-[3px] px-[14px] py-3 cursor-pointer text-left transition-all"
                style={{
                  background: active ? `rgba(${
                    d.color === "#A855F7" ? "168,85,247" :
                    d.color === "#EF4444" ? "239,68,68"  :
                    d.color === "#7C3AED" ? "124,58,237" : "245,158,11"
                  },0.12)` : "#0F0F0F",
                  border: `1px solid ${active ? d.color : "#1F1F1F"}`,
                }}
              >
                <div className="flex items-center gap-[10px]">
                  <span className="text-[20px] leading-none" style={{ color: active ? d.color : "#3F3F46" }}>{d.icon}</span>
                  <span className="text-[12px] font-bold" style={{ color: active ? d.color : "#9CA3AF" }}>{d.label}</span>
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
            <p className="text-[10px] text-text-faint tracking-[0.18em] m-0 mb-3 font-cinzel">DESTINO</p>
            <div className="flex flex-col gap-[6px]">
              <button onClick={() => setTarget("all")}
                className="flex items-center gap-3 rounded-[3px] px-[14px] py-[10px] cursor-pointer text-left transition-all"
                style={{
                  background: target === "all" ? "rgba(124,58,237,0.1)" : "#0F0F0F",
                  border: `1px solid ${target === "all" ? "#7C3AED" : "#1F1F1F"}`,
                }}
              >
                <Users size={16} color={target === "all" ? "#A78BFA" : "#52525B"} />
                <div className="flex-1">
                  <div className="text-[12px] font-bold" style={{ color: target === "all" ? "#A78BFA" : "#9CA3AF" }}>Todos os Agentes</div>
                  <div className="text-[10px] text-text-faint">{agents.length} personagem{agents.length !== 1 ? "s" : ""}</div>
                </div>
                {target === "all" && <div className="w-2 h-2 rounded-full bg-brand" />}
              </button>

              {agents.map(char => {
                const active = target === char.id;
                const base   = currentBase(char);
                return (
                  <button key={char.id} onClick={() => setTarget(active ? "all" : char.id)}
                    className="flex items-center gap-3 rounded-[3px] px-[14px] py-[10px] cursor-pointer text-left transition-all"
                    style={{
                      background: active ? `rgba(${
                        def!.color === "#A855F7" ? "168,85,247" :
                        def!.color === "#EF4444" ? "239,68,68"  :
                        def!.color === "#7C3AED" ? "124,58,237" : "245,158,11"
                      },0.08)` : "#0F0F0F",
                      border: `1px solid ${active ? def!.color : "#1F1F1F"}`,
                    }}
                  >
                    <div className="w-8 h-8 rounded-[2px] bg-[#1A1A1A] border border-border-md flex items-center justify-center shrink-0">
                      <span className="text-[13px] font-extrabold" style={{ color: active ? def!.color : "#3F3F46" }}>{char.nome[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: active ? "#F3F4F6" : "#9CA3AF" }}>{char.nome}</div>
                      <div className="text-[10px] text-text-faint">{char.specialization?.nome ?? "Sem classe"} · Nv.{char.nivel}</div>
                    </div>
                    {selectedType !== "XP" && (
                      <div className="text-right shrink-0">
                        <div className="text-[9px] text-text-ghost tracking-[0.1em]">ATUAL</div>
                        <div className="text-[16px] font-bold font-cinzel" style={{ color: active ? def!.color : "#52525B" }}>{base}</div>
                      </div>
                    )}
                    {active && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: def!.color }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount + preview + apply */}
          <div>
            <p className="text-[10px] text-text-faint tracking-[0.18em] m-0 mb-3 font-cinzel">VALOR</p>

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
                <div className="bg-bg-input rounded-[3px] px-[14px] py-[10px] mb-3 flex items-center gap-3"
                  style={{ border: `1px solid ${def!.color}33` }}
                >
                  <span className="text-[13px] text-text-faint">{base}</span>
                  <span className="text-[11px]" style={{ color: resColor }}>{sign}{n}</span>
                  <span className="text-[11px] text-text-ghost">=</span>
                  <span className="text-[22px] font-black text-text-near font-cinzel">{result}</span>
                  <span className="text-[10px] text-text-faint ml-1">{def!.label}</span>
                </div>
              );
            })()}

            <div className="flex gap-[10px]">
              <input
                type="number" min={1}
                value={amount}
                onChange={e => { setAmount(e.target.value); setResult(null); }}
                onKeyDown={e => e.key === "Enter" && applyAjuste()}
                placeholder="Ex.: 5"
                className="flex-1 bg-bg-input border border-border-md rounded-[3px] text-text-base text-[18px] font-bold font-cinzel px-[14px] py-[10px] outline-none text-center transition-colors"
                onFocus={e => (e.currentTarget.style.borderColor = direction === "add" ? "#22C55E" : "#EF4444")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
              />
              <button
                onClick={applyAjuste}
                disabled={applying || !amount.trim()}
                className="px-6 rounded-[3px] text-[12px] font-bold tracking-[0.1em] font-cinzel whitespace-nowrap shrink-0 transition-all"
                style={{
                  background: applying || !amount.trim() ? "#1A1A1A" : direction === "add" ? "#166534" : "#7F1D1D",
                  border: `1px solid ${applying || !amount.trim() ? "#2A2A2A" : direction === "add" ? "#22C55E" : "#EF4444"}`,
                  cursor: applying || !amount.trim() ? "not-allowed" : "pointer",
                  color: applying || !amount.trim() ? "#52525B" : direction === "add" ? "#22C55E" : "#EF4444",
                }}
              >{applying ? "Aplicando…" : direction === "add" ? "+ Conceder" : "− Reduzir"}</button>
            </div>
          </div>

          {result && (
            <div
              className="rounded-[3px] px-4 py-3 text-[13px] font-semibold flex items-center gap-2"
              style={{
                background: result.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${result.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                color: result.ok ? "#22C55E" : "#EF4444",
              }}
            >
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

      // If active combat, fetch combat state using combats already returned by campaign endpoint
      const activeCombatMeta = (camp as any).combats?.find((c: { state: string }) =>
        !["IDLE", "COMBAT_FINISHED"].includes(c.state)
      );
      if (activeCombatMeta) {
        const combatState = await apiCall<Combat>(`/combats/${activeCombatMeta.id}`, token);
        setCombat(combatState);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [id, token]);

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status !== "authenticated" || !token) return;
    fetchAll();
  }, [status, token, fetchAll, router]);

  // Poll campaign data every 10s to keep agent stats up to date
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      try {
        const camp = await apiCall<Campaign>(`/campaigns/${id}`, token);
        setCampaign(camp);
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [token, id]);

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
      <div className="h-screen bg-bg-dark flex items-center justify-center flex-col gap-[14px]">
        <div className="w-9 h-9 border-2 border-border border-t-brand rounded-full animate-spin" />
        <span className="text-[12px] text-text-faint tracking-[0.1em]">Carregando Escudo…</span>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="h-screen bg-bg-dark flex items-center justify-center">
        <span className="text-red-500">Campanha não encontrada.</span>
      </div>
    );
  }

  const isMaster = campaign.master.id === userId;
  if (!isMaster) {
    return (
      <div className="h-screen bg-bg-dark flex items-center justify-center flex-col gap-3">
        <Shield size={32} color="#3F3F46" />
        <span className="text-[13px] text-text-mid">Apenas o Mestre pode acessar o Escudo.</span>
        <Link href={`/campanha/${id}`} className="text-[12px] text-brand no-underline">← Voltar</Link>
      </div>
    );
  }

  const agents = campaign.characters.filter(c => !c.isMob && c.isApproved);

  return (
    <div className="min-h-screen bg-bg-main pt-[68px] flex flex-col">

      {/* Top bar */}
      <div className="h-[52px] bg-[rgba(10,10,10,0.98)] border-b border-border-subtle flex items-center px-6 gap-4 shrink-0">
        <Link
          href={`/campanha/${id}`}
          className="flex items-center gap-[6px] text-text-faint no-underline text-[12px] transition-colors hover:text-brand-muted"
        >
          <ChevronLeft size={14} /> Campanha
        </Link>

        <div className="w-px h-4 bg-border" />

        <div className="flex items-center gap-2">
          <Shield size={14} color="#7C3AED" />
          <span className="font-cinzel text-[13px] font-bold text-text-near tracking-[0.1em]">
            Escudo do Mestre
          </span>
          <span className="text-[12px] text-text-faint">— {campaign.name}</span>
        </div>

        <div className="ml-auto flex gap-[6px]">
          <button
            onClick={fetchAll}
            className="bg-transparent border-none cursor-pointer text-text-faint p-1 flex items-center gap-1 text-[11px] transition-colors hover:text-brand-muted"
          >
            <RefreshCw size={13} /> Atualizar
          </button>
        </div>
      </div>

      {/* Body: sidebar + main */}
      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 68px - 52px)" }}>

        {/* Left: log feed */}
        <LogFeed logs={logs} />

        {/* Right: tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tab bar */}
          <div className="flex gap-0 border-b border-border-subtle px-6 shrink-0">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="bg-transparent border-none cursor-pointer px-[18px] py-[14px] text-[11px] font-bold tracking-[0.12em] font-cinzel transition-colors -mb-px"
                style={{
                  color: tab === t.id ? "#F3F4F6" : "#52525B",
                  borderBottom: `2px solid ${tab === t.id ? "#7C3AED" : "transparent"}`,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* AGENTES */}
            {tab === "agentes" && (
              agents.length === 0 ? (
                <div className="text-center py-[60px] px-6">
                  <Users size={32} color="#27272A" className="mb-3" />
                  <p className="text-[13px] text-text-faint">Nenhum agente aprovado.</p>
                </div>
              ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
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
              <AjustesPanel agents={agents} token={token!} campaignId={id} onRefresh={fetchAll} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
