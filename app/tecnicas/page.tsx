"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Zap, Plus, Search, X, Dices, Trash2 } from "lucide-react";
import { apiCall } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type Atributo = "FOR" | "AGI" | "VIG" | "INT" | "PRE";
type TipoDano = "FISICO" | "ENERGETICO" | "MENTAL" | "ESPIRITUAL";

interface TechniqueTemplate {
  id: string;
  nome: string;
  nivel: number;
  atributoBase: Atributo;
  custoEnergia: number;
  tipoDano: TipoDano | null;
  cd: number | null;
  descricaoLivre: string;
  isSystem: boolean;
  createdBy: { id: string; email: string } | null;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ATRIBUTOS: Atributo[] = ["FOR", "AGI", "VIG", "INT", "PRE"];
const DANO_TYPES: TipoDano[] = ["FISICO", "ENERGETICO", "MENTAL", "ESPIRITUAL"];

const DANO_COLORS: Record<TipoDano, { bg: string; border: string; text: string }> = {
  FISICO:     { bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.3)",   text: "#EF4444" },
  ENERGETICO: { bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.3)",  text: "#8B5CF6" },
  MENTAL:     { bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.3)",  text: "#3B82F6" },
  ESPIRITUAL: { bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.3)",  text: "#10B981" },
};

const NIVEL_COLORS = ["", "#6B7280", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444"];
const ATTR_LABELS: Record<Atributo, string> = {
  FOR: "Força", AGI: "Agilidade", VIG: "Vigor", INT: "Inteligência", PRE: "Presença",
};

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({ token, onCreated, onClose }: {
  token: string;
  onCreated: (t: TechniqueTemplate) => void;
  onClose: () => void;
}) {
  const [nome, setNome]               = useState("");
  const [nivel, setNivel]             = useState(1);
  const [atributo, setAtributo]       = useState<Atributo>("INT");
  const [tipoDano, setTipoDano]       = useState<TipoDano | "">("");
  const [cd, setCd]                   = useState("");
  const [custo, setCusto]             = useState("0");
  const [descricao, setDescricao]     = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError("Nome é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = {
        nome: nome.trim(),
        nivel,
        atributoBase: atributo,
        custoEnergia: parseInt(custo) || 0,
        descricaoLivre: descricao.trim(),
      };
      if (tipoDano) body.tipoDano = tipoDano;
      if (cd.trim()) body.cd = parseInt(cd);
      const created = await apiCall<TechniqueTemplate>("/technique-templates", token, { method: "POST", body });
      onCreated(created);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao criar técnica.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-[rgba(0,0,0,0.75)] backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-bg-surface border border-border rounded-md w-full max-w-[540px] overflow-hidden"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.15)" }}
      >
        {/* Header */}
        <div className="px-6 py-5 pb-4 border-b border-[#1A1A1A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Zap size={16} color="#A855F7" />
            <span className="text-[14px] font-bold text-text-near tracking-[0.06em] font-cinzel">Nova Técnica</span>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-text-faint p-1 flex hover:text-[#EF4444] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 pb-6 flex flex-col gap-4">
          {/* Nome */}
          <div>
            <label className="block text-[10px] text-text-faint tracking-[0.14em] uppercase mb-1.5 font-cinzel">Nome *</label>
            <input
              ref={firstRef}
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex.: Onda de Choque Etérea"
              className="ficha-input"
            />
          </div>

          {/* Nivel + Atributo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-text-faint tracking-[0.14em] uppercase mb-1.5 font-cinzel">Nível</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n} type="button"
                    onClick={() => setNivel(n)}
                    className="flex-1 py-2 rounded-sm cursor-pointer text-[13px] font-bold transition-all border"
                    style={{
                      background: nivel === n ? NIVEL_COLORS[n] : "#0A0A0A",
                      borderColor: nivel === n ? NIVEL_COLORS[n] : "#2A2A2A",
                      color: nivel === n ? "#FFF" : "#6B7280",
                    }}
                  >{n}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-text-faint tracking-[0.14em] uppercase mb-1.5 font-cinzel">Atributo Base</label>
              <div className="flex gap-1">
                {ATRIBUTOS.map(a => (
                  <button
                    key={a} type="button"
                    onClick={() => setAtributo(a)}
                    className="flex-1 py-2 rounded-sm cursor-pointer text-[10px] font-bold tracking-[0.05em] transition-all border"
                    style={{
                      background: atributo === a ? "rgba(124,58,237,0.2)" : "#0A0A0A",
                      borderColor: atributo === a ? "#7C3AED" : "#2A2A2A",
                      color: atributo === a ? "#A855F7" : "#6B7280",
                    }}
                  >{a}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Tipo Dano + CD + Custo */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
            <div>
              <label className="block text-[10px] text-text-faint tracking-[0.14em] uppercase mb-1.5 font-cinzel">Tipo de Dano</label>
              <div className="grid grid-cols-2 gap-1">
                {DANO_TYPES.map(d => {
                  const c = DANO_COLORS[d];
                  const active = tipoDano === d;
                  return (
                    <button
                      key={d} type="button"
                      onClick={() => setTipoDano(active ? "" : d)}
                      className="py-1.5 rounded-sm cursor-pointer text-[9px] font-bold tracking-[0.06em] transition-all border"
                      style={{
                        background: active ? c.bg : "#0A0A0A",
                        borderColor: active ? c.border : "#2A2A2A",
                        color: active ? c.text : "#6B7280",
                      }}
                    >{d.charAt(0) + d.slice(1).toLowerCase()}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-text-faint tracking-[0.14em] uppercase mb-1.5 font-cinzel">CD</label>
              <input
                type="number" min={1} value={cd}
                onChange={e => setCd(e.target.value)}
                placeholder="—"
                className="ficha-input text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-faint tracking-[0.14em] uppercase mb-1.5 font-cinzel">Custo ⚡</label>
              <input
                type="number" min={0} value={custo}
                onChange={e => setCusto(e.target.value)}
                placeholder="0"
                className="ficha-input text-center"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-[10px] text-text-faint tracking-[0.14em] uppercase mb-1.5 font-cinzel">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva o efeito da técnica..."
              rows={3}
              className="ficha-input resize-none leading-relaxed"
            />
          </div>

          {error && (
            <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-sm px-3.5 py-2.5 text-[12px] text-[#EF4444]">
              {error}
            </div>
          )}

          <div className="flex gap-2.5 justify-end pt-1">
            <button
              type="button" onClick={onClose}
              className="px-5 py-2 bg-transparent border border-border-md rounded-sm cursor-pointer text-text-muted text-[12px] font-semibold hover:border-border-strong hover:text-text-dim transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !nome.trim()}
              className="px-6 py-2 border-none rounded-sm cursor-pointer text-[12px] font-bold tracking-[0.1em] uppercase font-cinzel transition-all disabled:cursor-not-allowed"
              style={{
                background: saving || !nome.trim() ? "#1A1A1A" : "#7C3AED",
                color: saving || !nome.trim() ? "#52525B" : "#FFF",
                boxShadow: !saving && nome.trim() ? "0 0 16px rgba(124,58,237,0.3)" : "none",
              }}
            >
              {saving ? "Salvando…" : "✦ Criar Técnica"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Technique Card ───────────────────────────────────────────────────────────
function TechCard({ t, currentUserId, token, onDelete }: {
  t: TechniqueTemplate;
  currentUserId?: string;
  token?: string;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const danoStyle = t.tipoDano ? DANO_COLORS[t.tipoDano] : null;
  const canDelete = !t.isSystem && t.createdBy?.id === currentUserId && token;
  const leftBorderColor = danoStyle ? danoStyle.text : "#7C3AED";

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!token || deleting) return;
    setDeleting(true);
    try {
      await apiCall(`/technique-templates/${t.id}`, token, { method: "DELETE" });
      onDelete(t.id);
    } catch { setDeleting(false); }
  }

  return (
    <div
      className="bg-bg-deep border border-[#1A1A1A] rounded-r flex flex-col gap-2.5 px-4 py-3.5 relative transition-colors"
      style={{ borderLeft: `3px solid ${leftBorderColor}` }}
    >
      {/* Top row */}
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-text-near">{t.nome}</span>
            {t.isSystem && (
              <span className="text-[8px] text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] px-1.5 py-px rounded-sm tracking-[0.1em] font-bold">SISTEMA</span>
            )}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">
            {ATTR_LABELS[t.atributoBase]} · {t.createdBy ? t.createdBy.email.split("@")[0] : "Sistema"}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Nivel badge */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: `${NIVEL_COLORS[t.nivel]}22`,
              border: `1px solid ${NIVEL_COLORS[t.nivel]}55`,
            }}
          >
            <span className="text-[13px] font-black font-cinzel" style={{ color: NIVEL_COLORS[t.nivel] }}>{t.nivel}</span>
          </div>

          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-transparent border-none cursor-pointer text-text-ghost p-0.5 flex transition-colors hover:text-[#EF4444] disabled:cursor-not-allowed"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Tags row */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[10px] text-brand bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] px-2 py-px rounded-sm font-semibold">
          {t.atributoBase}
        </span>
        {t.custoEnergia > 0 && (
          <span className="text-[10px] text-brand-light flex items-center gap-1">
            <Zap size={9} /> {t.custoEnergia}
          </span>
        )}
        {t.tipoDano && danoStyle && (
          <span
            className="text-[10px] font-semibold px-2 py-px rounded-sm"
            style={{ color: danoStyle.text, background: danoStyle.bg, border: `1px solid ${danoStyle.border}` }}
          >
            {t.tipoDano.charAt(0) + t.tipoDano.slice(1).toLowerCase()}
          </span>
        )}
        {t.cd != null && (
          <span className="text-[10px] text-text-dim bg-[rgba(255,255,255,0.04)] border border-border-md px-2 py-px rounded-sm">
            CD {t.cd}
          </span>
        )}
        <span className="ml-auto text-[9px] text-text-ghost flex items-center gap-1">
          <Dices size={9} /> d20 + {t.atributoBase}
        </span>
      </div>

      {/* Description */}
      {t.descricaoLivre && (
        <p className="text-[12px] text-text-muted m-0 leading-[1.65] border-t border-[#1A1A1A] pt-2.5">
          {t.descricaoLivre}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TecnicasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token       = (session?.user as any)?.backendToken as string | undefined;
  const userId      = (session?.user as any)?.backendUserId as string | undefined;

  const [techniques, setTechniques] = useState<TechniqueTemplate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterAttr, setFilterAttr] = useState<Atributo | "">("");
  const [filterDano, setFilterDano] = useState<TipoDano | "">("");
  const [showModal, setShowModal]   = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status !== "authenticated" || !token) return;
    apiCall<TechniqueTemplate[]>("/technique-templates", token)
      .then(data => { setTechniques(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status, token, router]);

  const filtered = techniques.filter(t => {
    if (search && !t.nome.toLowerCase().includes(search.toLowerCase()) && !t.descricaoLivre.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAttr && t.atributoBase !== filterAttr) return false;
    if (filterDano && t.tipoDano !== filterDano) return false;
    return true;
  });

  const system = filtered.filter(t => t.isSystem);
  const custom = filtered.filter(t => !t.isSystem);

  if (status === "loading" || loading) {
    return (
      <div className="h-screen bg-bg-dark flex flex-col items-center justify-center gap-3.5">
        <div className="w-9 h-9 rounded-full border-2 border-border border-t-brand animate-spin-fast" />
        <span className="text-xs text-text-faint tracking-[0.1em]">Carregando técnicas…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark pt-[68px] font-sans">

      {/* Header band */}
      <div className="border-b border-[#1A1A1A] px-8 pt-7 pb-6">
        <div className="max-w-[1100px] mx-auto flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <Zap size={18} color="#A855F7" />
              <h1 className="m-0 text-[22px] font-bold text-text-near tracking-[0.1em] uppercase font-cinzel">
                Técnicas
              </h1>
            </div>
            <p className="m-0 text-[12px] text-text-faint">
              {techniques.length} técnica{techniques.length !== 1 ? "s" : ""} no catálogo · {system.length} do sistema · {custom.length} dos jogadores
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand border-none rounded-sm cursor-pointer text-white text-[12px] font-bold tracking-[0.1em] uppercase font-cinzel transition-all hover:bg-brand-dark shrink-0"
            style={{ boxShadow: "0 0 20px rgba(124,58,237,0.35)" }}
          >
            <Plus size={14} /> Criar Técnica
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 border-b border-[#111] bg-bg-input">
        <div className="max-w-[1100px] mx-auto flex gap-2.5 items-center flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-[320px]">
            <Search size={13} color="#3F3F46" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar técnicas…"
              className="w-full ficha-input pl-8"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-faint p-0"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Attr filter */}
          <div className="flex gap-1">
            {ATRIBUTOS.map(a => (
              <button
                key={a}
                onClick={() => setFilterAttr(filterAttr === a ? "" : a)}
                className="px-3 py-1.5 rounded-sm cursor-pointer text-[10px] font-bold tracking-[0.08em] transition-all border"
                style={{
                  background: filterAttr === a ? "rgba(124,58,237,0.2)" : "#111",
                  borderColor: filterAttr === a ? "#7C3AED" : "#1F1F1F",
                  color: filterAttr === a ? "#A855F7" : "#52525B",
                }}
              >{a}</button>
            ))}
          </div>

          {/* Dano filter */}
          <div className="flex gap-1">
            {DANO_TYPES.map(d => {
              const c = DANO_COLORS[d];
              const active = filterDano === d;
              return (
                <button
                  key={d}
                  onClick={() => setFilterDano(filterDano === d ? "" : d)}
                  className="px-3 py-1.5 rounded-sm cursor-pointer text-[9px] font-bold tracking-[0.07em] transition-all border"
                  style={{
                    background: active ? c.bg : "#111",
                    borderColor: active ? c.border : "#1F1F1F",
                    color: active ? c.text : "#52525B",
                  }}
                >{d.charAt(0) + d.slice(1).toLowerCase()}</button>
              );
            })}
          </div>

          {(search || filterAttr || filterDano) && (
            <button
              onClick={() => { setSearch(""); setFilterAttr(""); setFilterDano(""); }}
              className="bg-transparent border-none cursor-pointer text-text-faint text-[11px] flex items-center gap-1 hover:text-[#EF4444] transition-colors"
            >
              <X size={11} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1100px] mx-auto px-8 pt-7 pb-[60px]">

        {filtered.length === 0 && (
          <div className="text-center py-20 flex flex-col items-center gap-3.5">
            <Zap size={32} color="#27272A" />
            <p className="text-[14px] text-text-faint m-0">Nenhuma técnica encontrada.</p>
            {techniques.length === 0 && (
              <p className="text-[12px] text-text-ghost m-0">Crie a primeira técnica usando o botão acima.</p>
            )}
          </div>
        )}

        {/* System techniques */}
        {system.length > 0 && (
          <section className="mb-9">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-[9px] font-bold text-[#F59E0B] uppercase tracking-[0.16em] font-cinzel">Do Sistema</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(245,158,11,0.25), transparent)" }} />
              <span className="text-[10px] text-text-faint">{system.length}</span>
            </div>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
              {system.map(t => (
                <TechCard key={t.id} t={t} currentUserId={userId} token={token} onDelete={id => setTechniques(prev => prev.filter(x => x.id !== id))} />
              ))}
            </div>
          </section>
        )}

        {/* Player techniques */}
        {custom.length > 0 && (
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-[9px] font-bold text-brand-light uppercase tracking-[0.16em] font-cinzel">Dos Jogadores</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(168,85,247,0.25), transparent)" }} />
              <span className="text-[10px] text-text-faint">{custom.length}</span>
            </div>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
              {custom.map(t => (
                <TechCard key={t.id} t={t} currentUserId={userId} token={token} onDelete={id => setTechniques(prev => prev.filter(x => x.id !== id))} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Modal */}
      {showModal && token && (
        <CreateModal
          token={token}
          onCreated={t => { setTechniques(prev => [t, ...prev]); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
