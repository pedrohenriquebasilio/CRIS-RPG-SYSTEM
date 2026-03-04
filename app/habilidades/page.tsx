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
    <div style={{ borderBottom: "1px solid #111" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px",
          textAlign: "left",
        }}
      >
        {/* Nivel */}
        <div style={{
          width: 28, height: 28, flexShrink: 0,
          border: `1px solid ${color}44`,
          borderRadius: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${color}11`,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "Cinzel, serif" }}>{ab.nivelRequerido}</span>
        </div>

        {/* Name + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#E5E7EB" }}>{ab.nome}</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color, background: `${color}18`, border: `1px solid ${color}44`, padding: "1px 6px", borderRadius: 2 }}>
              {ab.tipo.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#52525B", marginTop: 2, display: "flex", gap: 12 }}>
            {ab.custo !== "nenhum" && <span>Custo: {ab.custo}</span>}
            {ab.alcance !== "pessoal" && <span>Alcance: {ab.alcance}</span>}
            {ab.duracao !== "imediato" && <span>Duração: {ab.duracao}</span>}
          </div>
        </div>

        {open ? <ChevronDown size={14} color="#52525B" /> : <ChevronRight size={14} color="#52525B" />}
      </button>

      {open && (
        <div style={{ padding: "0 16px 14px 56px" }}>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, lineHeight: 1.6 }}>{ab.descricao}</p>
        </div>
      )}
    </div>
  );
}

function AptitudeRow({ apt }: { apt: Aptitude }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: "1px solid #111" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px",
          textAlign: "left",
        }}
      >
        <div style={{
          width: 28, height: 28, flexShrink: 0,
          border: "1px solid #27272A",
          borderRadius: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#111",
        }}>
          <Sparkles size={12} color="#52525B" />
        </div>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#E5E7EB", textAlign: "left" }}>{apt.nome}</span>
        {open ? <ChevronDown size={14} color="#52525B" /> : <ChevronRight size={14} color="#52525B" />}
      </button>

      {open && (
        <div style={{ padding: "0 16px 14px 56px" }}>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, lineHeight: 1.6 }}>{apt.descricao}</p>
        </div>
      )}
    </div>
  );
}

function SpecSection({ spec }: { spec: Specialization }) {
  const [open, setOpen] = useState(false);
  const hue = spec.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  // Group abilities by level
  const byLevel = spec.abilities.reduce<Record<number, Ability[]>>((acc, ab) => {
    (acc[ab.nivelRequerido] ??= []).push(ab);
    return acc;
  }, {});
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);

  return (
    <div style={{
      background: "#0F0F0F",
      border: "1px solid #1F1F1F",
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 12,
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 14,
          padding: "16px 20px",
          textAlign: "left",
        }}
      >
        <div style={{
          width: 40, height: 40, flexShrink: 0,
          border: `1px solid hsl(${hue},45%,30%)`,
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `hsl(${hue},40%,8%)`,
          boxShadow: `0 0 14px hsl(${hue},45%,15%)`,
        }}>
          <Sparkles size={16} color={`hsl(${hue},60%,55%)`} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 className="font-cinzel" style={{ fontSize: 15, fontWeight: 700, color: "#F3F4F6", margin: "0 0 3px", letterSpacing: "0.06em" }}>
            {spec.nome}
          </h3>
          <span style={{ fontSize: 11, color: "#52525B" }}>
            {spec.abilities.length} habilidade(s) · HP +{spec.hpPorNivel}/nível · Energia +{spec.energiaPorNivel}/nível
          </span>
        </div>
        {open
          ? <ChevronDown size={16} color="#52525B" />
          : <ChevronRight size={16} color="#52525B" />}
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #1A1A1A" }}>
          {levels.length === 0 && (
            <p style={{ fontSize: 12, color: "#3F3F46", padding: "16px 20px", margin: 0 }}>Nenhuma habilidade cadastrada.</p>
          )}
          {levels.map(lvl => (
            <div key={lvl}>
              <div style={{
                padding: "8px 16px",
                background: "#0A0A0A",
                borderBottom: "1px solid #111",
                fontSize: 9, color: "#52525B", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Cinzel, serif",
              }}>
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
      <div style={{ height: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <div style={{ width: 36, height: 36, border: "2px solid #1F1F1F", borderTop: "2px solid #7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 12, color: "#52525B", letterSpacing: "0.1em" }}>Carregando habilidades…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
    <div style={{ minHeight: "100vh", background: "#0A0A0A", paddingTop: "calc(68px + 32px)", paddingBottom: 60 }}>
      <div className="bg-grid" style={{ position: "fixed", inset: 0, opacity: 0.3, pointerEvents: "none" }} />

      <div style={{ position: "relative", maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "Cinzel, serif" }}>
              Poderes & Técnicas
            </p>
            <h1 className="font-cinzel" style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "0.08em" }}>
              Habilidades
            </h1>
          </div>
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar habilidade…"
            style={{
              background: "#0F0F0F", border: "1px solid #27272A", borderRadius: 3,
              padding: "8px 14px", color: "#E5E7EB", fontSize: 13, outline: "none",
              width: 220, transition: "border-color 0.15s",
            }}
            onFocus={e => (e.target.style.borderColor = "#7C3AED")}
            onBlur={e => (e.target.style.borderColor = "#27272A")}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1A1A1A", marginBottom: 24 }}>
          {([
            { id: "especializacoes", label: "Por Especialização" },
            { id: "gerais",          label: "Habilidades Gerais" },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "12px 20px",
                fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Cinzel, serif",
                color: tab === t.id ? "#F3F4F6" : "#52525B",
                borderBottom: `2px solid ${tab === t.id ? "#7C3AED" : "transparent"}`,
                marginBottom: -1,
                transition: "color 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "especializacoes" && (
          filteredSpecs.length === 0
            ? <div style={{ textAlign: "center", padding: "60px 0" }}>
                <BookOpen size={32} color="#27272A" style={{ marginBottom: 12 }} />
                <p style={{ color: "#52525B", fontSize: 13 }}>Nenhum resultado.</p>
              </div>
            : filteredSpecs.map(s => <SpecSection key={s.id} spec={s} />)
        )}

        {tab === "gerais" && (
          filteredApts.length === 0
            ? <div style={{ textAlign: "center", padding: "60px 0" }}>
                <Sparkles size={32} color="#27272A" style={{ marginBottom: 12 }} />
                <p style={{ color: "#52525B", fontSize: 13 }}>Nenhum resultado.</p>
              </div>
            : (
              <div style={{ background: "#0F0F0F", border: "1px solid #1F1F1F", borderRadius: 4, overflow: "hidden" }}>
                {filteredApts.map(a => <AptitudeRow key={a.id} apt={a} />)}
              </div>
            )
        )}
      </div>
    </div>
  );
}
