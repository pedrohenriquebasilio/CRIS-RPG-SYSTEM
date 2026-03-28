"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api";
import { Skull, ChevronRight, Heart, Zap, Plus, Search, CheckCircle, X } from "lucide-react";
import Link from "next/link";

interface Attrs { FOR: number; AGI: number; VIG: number; INT: number; PRE: number }

interface MobCharacter {
  id: string;
  nome: string;
  nivel: number;
  hpAtual: number;
  hpMax: number;
  energiaAtual: number;
  energiaMax: number;
  isMob: boolean;
  isApproved: boolean;
  specialization: { nome: string } | null;
  attributes: Attrs | null;
  campaign?: { id: string; name: string };
}

interface Campaign {
  id: string;
  name: string;
  characters?: MobCharacter[];
}

type CampaignInfo = { id: string; name: string; master: { email: string }; playerCount: number; inviteCode: string };

function hpColor(cur: number, max: number) {
  const pct = max > 0 ? cur / max : 0;
  if (pct > 0.6) return "#EF4444";
  if (pct > 0.3) return "#F97316";
  return "#7F1D1D";
}

function MobCard({ mob, campaignName }: { mob: MobCharacter; campaignName: string }) {
  const hpPct = mob.hpMax > 0 ? (mob.hpAtual / mob.hpMax) * 100 : 0;
  const enPct = mob.energiaMax > 0 ? (mob.energiaAtual / mob.energiaMax) * 100 : 0;
  const attrs = mob.attributes;

  const hue = mob.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 40;

  return (
    <div className="bg-bg-deep border border-border rounded overflow-hidden flex flex-col transition-colors hover:border-[#EF4444]">
      {/* Banner */}
      <div
        className="w-full relative flex items-center justify-center"
        style={{
          aspectRatio: "16/7",
          background: `radial-gradient(ellipse at 40% 50%, hsl(${hue},55%,14%) 0%, #0A0A0A 70%)`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div
          className="w-[52px] h-[52px] rounded-full flex items-center justify-center opacity-60"
          style={{
            border: `1px solid hsl(${hue},55%,30%)`,
            boxShadow: `0 0 20px hsl(${hue},55%,20%)`,
          }}
        >
          <Skull size={22} color={`hsl(${hue},65%,55%)`} />
        </div>
        {/* Campaign badge */}
        <div className="absolute top-2 left-2 bg-[rgba(0,0,0,0.6)] border border-border-strong px-2 py-px rounded-sm text-[9px] text-text-muted tracking-[0.08em]">
          {campaignName}
        </div>
        {/* Mob badge */}
        <div className="absolute top-2 right-2 bg-[rgba(127,29,29,0.5)] border border-[#991B1B] px-2 py-px rounded-sm text-[9px] font-bold text-[#FCA5A5] tracking-[0.1em]">
          MALDIÇÃO
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3.5 flex flex-col gap-3">
        {/* Name + class */}
        <div>
          <h2 className="font-cinzel text-[15px] font-bold text-text-near m-0 mb-0.5 tracking-[0.05em]">
            {mob.nome}
          </h2>
          <div className="text-[11px] text-text-faint">
            {mob.specialization?.nome ?? "Sem classe"} · Nív. {mob.nivel}
          </div>
        </div>

        {/* Attrs */}
        {attrs && (
          <div className="grid grid-cols-5 gap-1">
            {(["AGI","FOR","INT","PRE","VIG"] as (keyof Attrs)[]).map(k => (
              <div key={k} className="text-center">
                <div className="text-[8px] text-text-faint tracking-[0.1em] mb-0.5">{k}</div>
                <div className="text-[13px] font-bold text-text-dim">{attrs[k]}</div>
              </div>
            ))}
          </div>
        )}

        {/* Bars */}
        <div className="flex flex-col gap-1.5">
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-[9px] text-text-faint flex items-center gap-1"><Heart size={8} /> VIDA</span>
              <span className="text-[9px] text-text-muted">{mob.hpAtual}/{mob.hpMax}</span>
            </div>
            <div className="h-1.5 bg-[#1A1A1A] rounded-sm overflow-hidden">
              <div className="h-full" style={{ width: `${hpPct}%`, background: hpColor(mob.hpAtual, mob.hpMax) }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-[9px] text-text-faint flex items-center gap-1"><Zap size={8} /> ENERGIA</span>
              <span className="text-[9px] text-text-muted">{mob.energiaAtual}/{mob.energiaMax}</span>
            </div>
            <div className="h-1.5 bg-[#1A1A1A] rounded-sm overflow-hidden">
              <div className="h-full bg-brand" style={{ width: `${enPct}%` }} />
            </div>
          </div>
        </div>

        <Link
          href={`/ficha/${mob.id}`}
          className="flex items-center justify-center gap-1.5 py-2 bg-transparent border border-border-strong rounded-sm text-text-mid text-[11px] font-semibold tracking-[0.08em] uppercase no-underline transition-colors hover:border-[#EF4444] hover:text-[#FCA5A5]"
        >
          Ver Ficha <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function CreateMaldicaoModal({ token, onClose, onCreated }: {
  token: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"code" | "name">("code");
  const [inviteCode, setInviteCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [nome, setNome] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function handleVerify() {
    const code = inviteCode.trim();
    if (!code) { setCodeError("Informe o código da campanha."); return; }
    setCodeError("");
    setVerifying(true);
    setCampaign(null);
    try {
      const camp = await apiCall<CampaignInfo>(`/campaigns/invite/${code}`, token);
      setCampaign(camp);
      setStep("name");
    } catch {
      setCodeError("Código inválido ou campanha não encontrada.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleCreate() {
    if (!campaign || !nome.trim()) return;
    setCreateError("");
    setCreating(true);
    try {
      const char = await apiCall<{ id: string }>("/characters", token, {
        method: "POST",
        body: { campaignId: campaign.id, nome: nome.trim(), isMob: true },
      });
      onCreated();
      router.push(`/ficha/${char.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao criar maldição.";
      setCreateError(msg);
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="bg-bg-surface border border-border rounded overflow-hidden w-full max-w-[480px]">
        <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, #EF4444, transparent)" }} />

        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <Skull size={18} color="#EF4444" />
            <span className="font-cinzel text-[14px] font-bold text-white tracking-[0.1em] uppercase">
              Criar Maldição
            </span>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-white transition-colors bg-transparent border-none cursor-pointer p-1">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Step: código */}
          <div>
            <div className="text-[10px] text-text-faint uppercase tracking-[0.15em] mb-2 font-cinzel">
              Código da Campanha
            </div>
            <div className="flex gap-2">
              <input
                value={inviteCode}
                onChange={e => { setInviteCode(e.target.value); setCodeError(""); setCampaign(null); if (step === "name") setStep("code"); }}
                onKeyDown={e => e.key === "Enter" && handleVerify()}
                placeholder="Cole o código de convite"
                maxLength={36}
                disabled={verifying}
                className="ficha-input flex-1 font-cinzel tracking-[0.14em] text-[13px]"
              />
              <button
                onClick={handleVerify}
                disabled={verifying || !inviteCode.trim()}
                className="flex items-center gap-1.5 px-4 border border-[#EF444466] rounded-sm cursor-pointer text-[#FCA5A5] text-[11px] font-bold tracking-[0.08em] whitespace-nowrap transition-colors disabled:cursor-not-allowed"
                style={{ background: verifying ? "#1A1A1A" : "rgba(239,68,68,0.1)" }}
              >
                {verifying
                  ? <div className="w-3 h-3 rounded-full border-2 border-[#333] border-t-[#EF4444] animate-spin-fast" />
                  : <Search size={12} />
                }
                {verifying ? "" : "Verificar"}
              </button>
            </div>
            {codeError && <p className="text-xs text-[#EF4444] mt-1.5 mb-0">{codeError}</p>}
          </div>

          {/* Campaign confirmed */}
          {campaign && (
            <div className="bg-bg-input border border-[#EF444433] border-l-[3px] border-l-[#EF4444] rounded-r-sm px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle size={12} color="#22C55E" />
                <span className="text-[10px] text-[#22C55E] font-semibold tracking-[0.08em]">Campanha encontrada</span>
              </div>
              <div className="text-[13px] font-semibold text-text-base">{campaign.name}</div>
              <div className="text-[11px] text-text-faint mt-0.5">Mestre: {campaign.master.email.split("@")[0]}</div>
            </div>
          )}

          {/* Step: nome */}
          {step === "name" && campaign && (
            <div>
              <div className="text-[10px] text-text-faint uppercase tracking-[0.15em] mb-2 font-cinzel">
                Nome da Maldição
              </div>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                onKeyDown={e => e.key === "Enter" && nome.trim() && handleCreate()}
                placeholder="Ex: Sombra do Abismo"
                autoFocus
                className="ficha-input w-full text-[14px] font-cinzel tracking-[0.08em]"
              />
            </div>
          )}

          {createError && (
            <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-sm px-3.5 py-2.5 text-[12px] text-[#EF4444]">
              {createError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-transparent border border-border rounded-sm text-text-muted text-[11px] font-semibold tracking-[0.08em] uppercase cursor-pointer hover:border-border-strong hover:text-text-mid transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !campaign || !nome.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border-none rounded-sm cursor-pointer text-white text-[11px] font-bold tracking-[0.1em] uppercase font-cinzel transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: creating || !campaign || !nome.trim() ? "#1A1A1A" : "#991B1B",
                boxShadow: creating || !campaign || !nome.trim() ? "none" : "0 0 20px rgba(239,68,68,0.3)",
              }}
            >
              {creating
                ? <><div className="w-3 h-3 rounded-full border-2 border-[#333] border-t-white animate-spin-fast" /> Conjurando…</>
                : <><Skull size={13} /> Invocar Maldição</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MaldicoesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token = (session?.user as any)?.backendToken as string | undefined;

  const [mobs, setMobs] = useState<{ mob: MobCharacter; campaignName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  function loadMobs(t: string) {
    setLoading(true);
    apiCall<Campaign[]>("/campaigns", t)
      .then(campaigns => {
        const all: { mob: MobCharacter; campaignName: string }[] = [];
        for (const camp of campaigns) {
          for (const char of camp.characters ?? []) {
            if (char.isMob) all.push({ mob: char, campaignName: camp.name });
          }
        }
        setMobs(all);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status !== "authenticated" || !token) return;
    loadMobs(token);
  }, [status, token, router]);

  if (status === "loading" || loading) {
    return (
      <div className="h-screen bg-bg-dark flex flex-col items-center justify-center gap-3.5">
        <div className="w-9 h-9 rounded-full border-2 border-border border-t-[#EF4444] animate-spin-fast" />
        <span className="text-xs text-text-faint tracking-[0.1em]">Carregando maldições…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main pt-[calc(68px+32px)] pb-[60px]">
      <div className="bg-grid fixed inset-0 opacity-30 pointer-events-none" />

      <div className="relative max-w-[1100px] mx-auto px-6">
        {/* Header */}
        <div className="mb-9 flex items-end justify-between">
          <div>
            <p className="text-[10px] text-text-faint tracking-[0.2em] uppercase m-0 mb-1.5 font-cinzel">
              Entidades & Criaturas
            </p>
            <h1 className="font-cinzel text-[26px] font-bold text-white m-0 tracking-[0.08em]">
              Maldições
            </h1>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#EF444466] rounded-sm cursor-pointer text-[#FCA5A5] text-[11px] font-bold tracking-[0.08em] uppercase font-cinzel transition-colors hover:border-[#EF4444] hover:bg-[rgba(239,68,68,0.08)]"
            style={{ background: "rgba(239,68,68,0.06)" }}
          >
            <Plus size={13} />
            Criar Maldição
          </button>
        </div>

        {mobs.length === 0 ? (
          <div className="text-center py-20 px-6 border border-dashed border-border rounded">
            <Skull size={36} color="#27272A" className="mb-4 mx-auto" />
            <p className="text-[14px] text-text-faint m-0 mb-1.5">Nenhuma maldição encontrada.</p>
            <p className="text-[12px] text-text-ghost m-0">
              Crie uma maldição usando o botão acima.
            </p>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {mobs.map(({ mob, campaignName }) => (
              <MobCard key={mob.id} mob={mob} campaignName={campaignName} />
            ))}
          </div>
        )}
      </div>

      {showModal && token && (
        <CreateMaldicaoModal
          token={token}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            if (token) loadMobs(token);
          }}
        />
      )}
    </div>
  );
}
