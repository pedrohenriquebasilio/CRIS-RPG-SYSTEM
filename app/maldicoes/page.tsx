"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api";
import { Skull, ChevronRight, Heart, Zap } from "lucide-react";
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
          MOB
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

export default function MaldicoesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token  = (session?.user as any)?.backendToken as string | undefined;

  const [mobs, setMobs]       = useState<{ mob: MobCharacter; campaignName: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status !== "authenticated" || !token) return;

    apiCall<Campaign[]>("/campaigns", token)
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
        <div className="mb-9">
          <p className="text-[10px] text-text-faint tracking-[0.2em] uppercase m-0 mb-1.5 font-cinzel">
            Entidades & Criaturas
          </p>
          <h1 className="font-cinzel text-[26px] font-bold text-white m-0 tracking-[0.08em]">
            Maldições
          </h1>
        </div>

        {mobs.length === 0 ? (
          <div className="text-center py-20 px-6 border border-dashed border-border rounded">
            <Skull size={36} color="#27272A" className="mb-4 mx-auto" />
            <p className="text-[14px] text-text-faint m-0 mb-1.5">Nenhuma maldição encontrada.</p>
            <p className="text-[12px] text-text-ghost m-0">
              Mobs são criados pelo Mestre dentro de uma campanha.
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
    </div>
  );
}
