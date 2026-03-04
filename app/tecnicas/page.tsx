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

  // Close on Escape
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

  const input: React.CSSProperties = {
    background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 3,
    color: "#E5E7EB", fontSize: 13, padding: "9px 12px", outline: "none",
    width: "100%", boxSizing: "border-box", transition: "border-color 0.15s",
    fontFamily: "inherit",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#111", border: "1px solid #1F1F1F", borderRadius: 6,
        width: "100%", maxWidth: 540,
        boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.15)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Zap size={16} color="#A855F7" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#F3F4F6", letterSpacing: "0.06em", fontFamily: "Cinzel, serif" }}>
              Nova Técnica
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#52525B", padding: 4, display: "flex" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
            onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
          ><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Nome */}
          <div>
            <label style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.14em", textTransform: "uppercase", display: "block", marginBottom: 6, fontFamily: "Cinzel, serif" }}>Nome *</label>
            <input
              ref={firstRef}
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex.: Onda de Choque Etérea"
              style={input}
              onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
              onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
            />
          </div>

          {/* Nivel + Atributo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.14em", textTransform: "uppercase", display: "block", marginBottom: 6, fontFamily: "Cinzel, serif" }}>Nível</label>
              <div style={{ display: "flex", gap: 4 }}>
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n} type="button"
                    onClick={() => setNivel(n)}
                    style={{
                      flex: 1, padding: "8px 0", background: nivel === n ? NIVEL_COLORS[n] : "#0A0A0A",
                      border: `1px solid ${nivel === n ? NIVEL_COLORS[n] : "#2A2A2A"}`,
                      borderRadius: 3, cursor: "pointer",
                      color: nivel === n ? "#FFF" : "#6B7280",
                      fontSize: 13, fontWeight: 700,
                      transition: "all 0.15s",
                    }}
                  >{n}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.14em", textTransform: "uppercase", display: "block", marginBottom: 6, fontFamily: "Cinzel, serif" }}>Atributo Base</label>
              <div style={{ display: "flex", gap: 4 }}>
                {ATRIBUTOS.map(a => (
                  <button
                    key={a} type="button"
                    onClick={() => setAtributo(a)}
                    style={{
                      flex: 1, padding: "8px 0", background: atributo === a ? "rgba(124,58,237,0.2)" : "#0A0A0A",
                      border: `1px solid ${atributo === a ? "#7C3AED" : "#2A2A2A"}`,
                      borderRadius: 3, cursor: "pointer",
                      color: atributo === a ? "#A855F7" : "#6B7280",
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                      transition: "all 0.15s",
                    }}
                  >{a}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Tipo Dano + CD + Custo */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.14em", textTransform: "uppercase", display: "block", marginBottom: 6, fontFamily: "Cinzel, serif" }}>Tipo de Dano</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {DANO_TYPES.map(d => {
                  const c = DANO_COLORS[d];
                  const active = tipoDano === d;
                  return (
                    <button
                      key={d} type="button"
                      onClick={() => setTipoDano(active ? "" : d)}
                      style={{
                        padding: "6px 0", background: active ? c.bg : "#0A0A0A",
                        border: `1px solid ${active ? c.border : "#2A2A2A"}`,
                        borderRadius: 3, cursor: "pointer",
                        color: active ? c.text : "#6B7280",
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                        transition: "all 0.15s",
                      }}
                    >{d.charAt(0) + d.slice(1).toLowerCase()}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.14em", textTransform: "uppercase", display: "block", marginBottom: 6, fontFamily: "Cinzel, serif" }}>CD</label>
              <input
                type="number" min={1} value={cd}
                onChange={e => setCd(e.target.value)}
                placeholder="—"
                style={{ ...input, textAlign: "center" }}
                onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.14em", textTransform: "uppercase", display: "block", marginBottom: 6, fontFamily: "Cinzel, serif" }}>Custo ⚡</label>
              <input
                type="number" min={0} value={custo}
                onChange={e => setCusto(e.target.value)}
                placeholder="0"
                style={{ ...input, textAlign: "center" }}
                onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.14em", textTransform: "uppercase", display: "block", marginBottom: 6, fontFamily: "Cinzel, serif" }}>Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva o efeito da técnica..."
              rows={3}
              style={{ ...input, resize: "none", lineHeight: 1.6 }}
              onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
              onBlur={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
            />
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 3, padding: "10px 14px", fontSize: 12, color: "#EF4444" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "9px 20px", background: "transparent", border: "1px solid #2A2A2A", borderRadius: 3, cursor: "pointer", color: "#6B7280", fontSize: 12, fontWeight: 600 }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !nome.trim()}
              style={{
                padding: "9px 24px", background: saving || !nome.trim() ? "#1A1A1A" : "#7C3AED",
                border: "none", borderRadius: 3, cursor: saving || !nome.trim() ? "not-allowed" : "pointer",
                color: saving || !nome.trim() ? "#52525B" : "#FFF",
                fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                fontFamily: "Cinzel, serif", transition: "background 0.15s",
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
    <div style={{
      background: "#0F0F0F",
      border: "1px solid #1A1A1A",
      borderLeft: `3px solid ${danoStyle ? danoStyle.text : "#7C3AED"}`,
      borderRadius: "0 4px 4px 0",
      padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 10,
      position: "relative",
      transition: "border-color 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = danoStyle ? danoStyle.text : "#A855F7")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1A1A1A")}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#F3F4F6" }}>{t.nome}</span>
            {t.isSystem && (
              <span style={{ fontSize: 8, color: "#F59E0B", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", padding: "1px 6px", borderRadius: 2, letterSpacing: "0.1em", fontWeight: 700 }}>SISTEMA</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>
            {ATTR_LABELS[t.atributoBase]} · {t.createdBy ? t.createdBy.email.split("@")[0] : "Sistema"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Nivel badge */}
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `${NIVEL_COLORS[t.nivel]}22`,
            border: `1px solid ${NIVEL_COLORS[t.nivel]}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: NIVEL_COLORS[t.nivel], fontFamily: "Cinzel, serif" }}>{t.nivel}</span>
          </div>

          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ background: "none", border: "none", cursor: deleting ? "not-allowed" : "pointer", color: "#3F3F46", padding: 2, display: "flex", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
              onMouseLeave={e => (e.currentTarget.style.color = "#3F3F46")}
            ><Trash2 size={13} /></button>
          )}
        </div>
      </div>

      {/* Tags row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#7C3AED", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", padding: "2px 8px", borderRadius: 2, fontWeight: 600 }}>
          {t.atributoBase}
        </span>
        {t.custoEnergia > 0 && (
          <span style={{ fontSize: 10, color: "#A855F7", display: "flex", alignItems: "center", gap: 3 }}>
            <Zap size={9} /> {t.custoEnergia}
          </span>
        )}
        {t.tipoDano && danoStyle && (
          <span style={{ fontSize: 10, fontWeight: 600, color: danoStyle.text, background: danoStyle.bg, border: `1px solid ${danoStyle.border}`, padding: "2px 8px", borderRadius: 2 }}>
            {t.tipoDano.charAt(0) + t.tipoDano.slice(1).toLowerCase()}
          </span>
        )}
        {t.cd != null && (
          <span style={{ fontSize: 10, color: "#9CA3AF", background: "rgba(255,255,255,0.04)", border: "1px solid #2A2A2A", padding: "2px 8px", borderRadius: 2 }}>
            CD {t.cd}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 9, color: "#3F3F46", display: "flex", alignItems: "center", gap: 3 }}>
          <Dices size={9} /> d20 + {t.atributoBase}
        </span>
      </div>

      {/* Description */}
      {t.descricaoLivre && (
        <p style={{ fontSize: 12, color: "#6B7280", margin: 0, lineHeight: 1.65, borderTop: "1px solid #1A1A1A", paddingTop: 10 }}>
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
      <div style={{ height: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <div style={{ width: 36, height: 36, border: "2px solid #1F1F1F", borderTop: "2px solid #7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 12, color: "#52525B", letterSpacing: "0.1em" }}>Carregando técnicas…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0D0D0D", paddingTop: 68, fontFamily: "Inter, sans-serif" }}>

      {/* Header band */}
      <div style={{ borderBottom: "1px solid #1A1A1A", padding: "28px 32px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Zap size={18} color="#A855F7" />
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#F3F4F6", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Cinzel, serif" }}>
                Técnicas
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#52525B" }}>
              {techniques.length} técnica{techniques.length !== 1 ? "s" : ""} no catálogo · {system.length} do sistema · {custom.length} dos jogadores
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", background: "#7C3AED", border: "none", borderRadius: 3,
              cursor: "pointer", color: "#FFF", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Cinzel, serif",
              boxShadow: "0 0 20px rgba(124,58,237,0.35)", transition: "background 0.15s, box-shadow 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#6D28D9"; e.currentTarget.style.boxShadow = "0 0 32px rgba(124,58,237,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#7C3AED"; e.currentTarget.style.boxShadow = "0 0 20px rgba(124,58,237,0.35)"; }}
          >
            <Plus size={14} /> Criar Técnica
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: "16px 32px", borderBottom: "1px solid #111", background: "#0A0A0A" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
            <Search size={13} color="#3F3F46" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar técnicas…"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#111", border: "1px solid #1F1F1F", borderRadius: 3,
                color: "#E5E7EB", fontSize: 12, padding: "8px 12px 8px 34px", outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#7C3AED")}
              onBlur={e => (e.currentTarget.style.borderColor = "#1F1F1F")}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#52525B", padding: 0 }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Attr filter */}
          <div style={{ display: "flex", gap: 4 }}>
            {ATRIBUTOS.map(a => (
              <button key={a} onClick={() => setFilterAttr(filterAttr === a ? "" : a)} style={{
                padding: "6px 12px", background: filterAttr === a ? "rgba(124,58,237,0.2)" : "#111",
                border: `1px solid ${filterAttr === a ? "#7C3AED" : "#1F1F1F"}`,
                borderRadius: 3, cursor: "pointer",
                color: filterAttr === a ? "#A855F7" : "#52525B",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                transition: "all 0.15s",
              }}>{a}</button>
            ))}
          </div>

          {/* Dano filter */}
          <div style={{ display: "flex", gap: 4 }}>
            {DANO_TYPES.map(d => {
              const c = DANO_COLORS[d];
              const active = filterDano === d;
              return (
                <button key={d} onClick={() => setFilterDano(filterDano === d ? "" : d)} style={{
                  padding: "6px 12px", background: active ? c.bg : "#111",
                  border: `1px solid ${active ? c.border : "#1F1F1F"}`,
                  borderRadius: 3, cursor: "pointer",
                  color: active ? c.text : "#52525B",
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.07em",
                  transition: "all 0.15s",
                }}>{d.charAt(0) + d.slice(1).toLowerCase()}</button>
              );
            })}
          </div>

          {(search || filterAttr || filterDano) && (
            <button onClick={() => { setSearch(""); setFilterAttr(""); setFilterDano(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#52525B", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
              onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
              onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
            >
              <X size={11} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px 60px" }}>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Zap size={32} color="#27272A" />
            <p style={{ fontSize: 14, color: "#52525B", margin: 0 }}>Nenhuma técnica encontrada.</p>
            {techniques.length === 0 && (
              <p style={{ fontSize: 12, color: "#3F3F46", margin: 0 }}>Crie a primeira técnica usando o botão acima.</p>
            )}
          </div>
        )}

        {/* System techniques */}
        {system.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.16em", fontFamily: "Cinzel, serif" }}>Do Sistema</span>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(245,158,11,0.25), transparent)" }} />
              <span style={{ fontSize: 10, color: "#52525B" }}>{system.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
              {system.map(t => (
                <TechCard key={t.id} t={t} currentUserId={userId} token={token} onDelete={id => setTechniques(prev => prev.filter(x => x.id !== id))} />
              ))}
            </div>
          </section>
        )}

        {/* Player techniques */}
        {custom.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#A855F7", textTransform: "uppercase", letterSpacing: "0.16em", fontFamily: "Cinzel, serif" }}>Dos Jogadores</span>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(168,85,247,0.25), transparent)" }} />
              <span style={{ fontSize: 10, color: "#52525B" }}>{custom.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
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
