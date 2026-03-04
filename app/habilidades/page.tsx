"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api";
import { Sparkles, ChevronDown, ChevronRight, BookOpen } from "lucide-react";

interface Ability {
  id: string;
  nome: string;
  nivelRequerido: number;
  tipo: string;
  custo: string;
  alcance: string;
  duracao: string;
  descricao: string;
}

interface Specialization {
  id: string;
  nome: string;
  hpPorNivel: number;
  energiaPorNivel: number;
  abilities: Ability[];
}

interface Aptitude {
  id: string;
  nome: string;
  descricao: string;
  prerequisitos: unknown[];
}

const TIPO_COLORS: Record<string, string> = {
  ativa:   "#7C3AED",
  passiva: "#059669",
  reacao:  "#D97706",
};

function AbilityRow({ ab }: { ab: Ability }) {
  const [open, setOpen] = useState(false);
  const color = TIPO_COLORS[ab.tipo] ?? "#52525B";

  return (
    <div className="border-b border-[#111]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full bg-transparent border-none cursor-pointer flex items-center gap-3 px-4 py-3 text-left"
      >
        {/* Nivel */}
        <div
          className="w-7 h-7 shrink-0 rounded-sm flex items-center justify-center"
          style={{ border: `1px solid ${color}44`, background: `${color}11` }}
        >
          <span className="text-[11px] font-bold font-cinzel" style={{ color }}>{ab.nivelRequerido}</span>
        </div>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-text-base">{ab.nome}</span>
            <span
              className="text-[9px] font-bold tracking-[0.1em] px-1.5 py-px rounded-sm"
              style={{ color, background: `${color}18`, border: `1px solid ${color}44` }}
            >
              {ab.tipo.toUpperCase()}
            </span>
          </div>
          <div className="text-[11px] text-text-faint mt-0.5 flex gap-3">
            {ab.custo !== "nenhum" && <span>Custo: {ab.custo}</span>}
            {ab.alcance !== "pessoal" && <span>Alcance: {ab.alcance}</span>}
            {ab.duracao !== "imediato" && <span>Duração: {ab.duracao}</span>}
          </div>
        </div>

        {open ? <ChevronDown size={14} color="#52525B" /> : <ChevronRight size={14} color="#52525B" />}
      </button>

      {open && (
        <div className="px-4 pb-3.5 pl-14">
          <p className="text-[13px] text-text-dim m-0 leading-relaxed">{ab.descricao}</p>
        </div>
      )}
    </div>
  );
}

function AptitudeRow({ apt }: { apt: Aptitude }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#111]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full bg-transparent border-none cursor-pointer flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="w-7 h-7 shrink-0 border border-border-strong rounded-sm flex items-center justify-center bg-[#111]">
          <Sparkles size={12} color="#52525B" />
        </div>
        <span className="flex-1 text-[13px] font-semibold text-text-base text-left">{apt.nome}</span>
        {open ? <ChevronDown size={14} color="#52525B" /> : <ChevronRight size={14} color="#52525B" />}
      </button>

      {open && (
        <div className="px-4 pb-3.5 pl-14">
          <p className="text-[13px] text-text-dim m-0 leading-relaxed">{apt.descricao}</p>
        </div>
      )}
    </div>
  );
}

function SpecSection({ spec }: { spec: Specialization }) {
  const [open, setOpen] = useState(false);
  const hue = spec.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  const byLevel = spec.abilities.reduce<Record<number, Ability[]>>((acc, ab) => {
    (acc[ab.nivelRequerido] ??= []).push(ab);
    return acc;
  }, {});
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);

  return (
    <div className="bg-bg-deep border border-border rounded overflow-hidden mb-3">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full bg-transparent border-none cursor-pointer flex items-center gap-3.5 px-5 py-4 text-left"
      >
        <div
          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center"
          style={{
            border: `1px solid hsl(${hue},45%,30%)`,
            background: `hsl(${hue},40%,8%)`,
            boxShadow: `0 0 14px hsl(${hue},45%,15%)`,
          }}
        >
          <Sparkles size={16} color={`hsl(${hue},60%,55%)`} />
        </div>
        <div className="flex-1">
          <h3 className="font-cinzel text-[15px] font-bold text-text-near m-0 mb-0.5 tracking-[0.06em]">
            {spec.nome}
          </h3>
          <span className="text-[11px] text-text-faint">
            {spec.abilities.length} habilidade(s) · HP +{spec.hpPorNivel}/nível · Energia +{spec.energiaPorNivel}/nível
          </span>
        </div>
        {open ? <ChevronDown size={16} color="#52525B" /> : <ChevronRight size={16} color="#52525B" />}
      </button>

      {open && (
        <div className="border-t border-[#1A1A1A]">
          {levels.length === 0 && (
            <p className="text-[12px] text-text-ghost px-5 py-4 m-0">Nenhuma habilidade cadastrada.</p>
          )}
          {levels.map(lvl => (
            <div key={lvl}>
              <div className="px-4 py-2 bg-bg-input border-b border-[#111] text-[9px] text-text-faint tracking-[0.15em] uppercase font-cinzel">
                Nível {lvl}
              </div>
              {byLevel[lvl].map(ab => <AbilityRow key={ab.id} ab={ab} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Tab = "especializacoes" | "gerais";

export default function HabilidadesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token  = (session?.user as any)?.backendToken as string | undefined;

  const [specs, setSpecs]         = useState<Specialization[]>([]);
  const [aptitudes, setAptitudes] = useState<Aptitude[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<Tab>("especializacoes");
  const [search, setSearch]       = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status !== "authenticated" || !token) return;

    Promise.all([
      apiCall<Specialization[]>("/seeds/specializations", token),
      apiCall<Aptitude[]>("/seeds/aptitudes", token),
    ]).then(([s, a]) => { setSpecs(s); setAptitudes(a); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, token, router]);

  if (status === "loading" || loading) {
    return (
      <div className="h-screen bg-bg-dark flex flex-col items-center justify-center gap-3.5">
        <div className="w-9 h-9 rounded-full border-2 border-border border-t-brand animate-spin-fast" />
        <span className="text-xs text-text-faint tracking-[0.1em]">Carregando habilidades…</span>
      </div>
    );
  }

  const filteredSpecs = specs.map(s => ({
    ...s,
    abilities: s.abilities.filter(a =>
      !search || a.nome.toLowerCase().includes(search.toLowerCase()) || a.descricao.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(s => !search || s.abilities.length > 0 || s.nome.toLowerCase().includes(search.toLowerCase()));

  const filteredApts = aptitudes.filter(a =>
    !search || a.nome.toLowerCase().includes(search.toLowerCase()) || a.descricao.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg-main pt-[calc(68px+32px)] pb-[60px]">
      <div className="bg-grid fixed inset-0 opacity-30 pointer-events-none" />

      <div className="relative max-w-[900px] mx-auto px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
          <div>
            <p className="text-[10px] text-text-faint tracking-[0.2em] uppercase m-0 mb-1.5 font-cinzel">
              Poderes & Técnicas
            </p>
            <h1 className="font-cinzel text-[26px] font-bold text-white m-0 tracking-[0.08em]">
              Habilidades
            </h1>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar habilidade…"
            className="ficha-input w-[220px]"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#1A1A1A] mb-6">
          {([
            { id: "especializacoes", label: "Por Especialização" },
            { id: "gerais",          label: "Habilidades Gerais" },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`bg-transparent border-none border-b-2 -mb-px cursor-pointer px-5 py-3 text-xs font-bold tracking-[0.1em] font-cinzel transition-colors ${
                tab === t.id
                  ? "text-text-near border-brand"
                  : "text-text-faint border-transparent hover:text-text-dim"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "especializacoes" && (
          filteredSpecs.length === 0
            ? <div className="text-center py-[60px]">
                <BookOpen size={32} color="#27272A" className="mb-3 mx-auto" />
                <p className="text-[13px] text-text-faint">Nenhum resultado.</p>
              </div>
            : filteredSpecs.map(s => <SpecSection key={s.id} spec={s} />)
        )}

        {tab === "gerais" && (
          filteredApts.length === 0
            ? <div className="text-center py-[60px]">
                <Sparkles size={32} color="#27272A" className="mb-3 mx-auto" />
                <p className="text-[13px] text-text-faint">Nenhum resultado.</p>
              </div>
            : (
              <div className="bg-bg-deep border border-border rounded overflow-hidden">
                {filteredApts.map(a => <AptitudeRow key={a.id} apt={a} />)}
              </div>
            )
        )}
      </div>
    </div>
  );
}
