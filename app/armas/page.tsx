"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api";
import { Sword, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";

interface WeaponTemplate {
  id: string;
  nome: string;
  categoria: string;
  damageDice: string;
  tipoDano: string;
  distancia: string;
  duasMaos: boolean;
  requiresMarcial: boolean;
  regraEspecial: string | null;
  threatRange: number;
  criticalMultiplier: number;
}

const DANO_COLORS: Record<string, string> = {
  BALÍSTICO:   "#F97316",
  CORTANTE:    "#EF4444",
  PERFURANTE:  "#EC4899",
  CONTUNDENTE: "#A78BFA",
  FOGO:        "#F59E0B",
  ELETRICO:    "#3B82F6",
  QUIMICO:     "#10B981",
};

function WeaponRow({ w }: { w: WeaponTemplate }) {
  const [open, setOpen] = useState(false);
  const danoColor = DANO_COLORS[w.tipoDano.toUpperCase()] ?? "#52525B";
  const isCrit = w.threatRange < 20;

  return (
    <div style={{ borderBottom: "1px solid #111" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto auto",
          alignItems: "center",
          gap: 16,
          padding: "12px 16px",
          textAlign: "left",
        }}
      >
        {/* Name */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E5E7EB", display: "flex", alignItems: "center", gap: 8 }}>
            {w.nome}
            {w.duasMaos && (
              <span style={{ fontSize: 9, color: "#6B7280", border: "1px solid #27272A", padding: "1px 5px", borderRadius: 2, letterSpacing: "0.08em" }}>2 MÃOS</span>
            )}
            {w.requiresMarcial && (
              <span style={{ fontSize: 9, color: "#D97706", border: "1px solid #92400E", padding: "1px 5px", borderRadius: 2, letterSpacing: "0.08em" }}>MARCIAL</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#52525B", marginTop: 2 }}>{w.distancia}</div>
        </div>

        {/* Damage dice */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#F3F4F6", fontFamily: "Cinzel, serif" }}>{w.damageDice}</div>
          <div style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.1em" }}>DADO</div>
        </div>

        {/* Tipo dano */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: danoColor, letterSpacing: "0.08em" }}>{w.tipoDano}</div>
          <div style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.1em" }}>TIPO</div>
        </div>

        {/* Crit */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isCrit ? "#F59E0B" : "#3F3F46", fontFamily: "Cinzel, serif" }}>
            {w.threatRange === 20 ? "20" : `${w.threatRange}–20`}
            {" / "}×{w.criticalMultiplier}
          </div>
          <div style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.1em" }}>CRÍTICO</div>
        </div>

        {open ? <ChevronDown size={14} color="#52525B" /> : <ChevronRight size={14} color="#52525B" />}
      </button>

      {open && (
        <div style={{ padding: "0 16px 14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase" }}>Dano</div>
              <div style={{ fontSize: 13, color: "#D1D5DB" }}>{w.damageDice} {w.tipoDano}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase" }}>Ameaça</div>
              <div style={{ fontSize: 13, color: "#D1D5DB" }}>{w.threatRange === 20 ? "20" : `${w.threatRange}–20`}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase" }}>Multiplicador</div>
              <div style={{ fontSize: 13, color: "#D1D5DB" }}>×{w.criticalMultiplier}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase" }}>Alcance</div>
              <div style={{ fontSize: 13, color: "#D1D5DB" }}>{w.distancia}</div>
            </div>
            {w.duasMaos && (
              <div>
                <div style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase" }}>Empunhadura</div>
                <div style={{ fontSize: 13, color: "#D1D5DB" }}>Duas mãos</div>
              </div>
            )}
            {w.requiresMarcial && (
              <div>
                <div style={{ fontSize: 9, color: "#52525B", letterSpacing: "0.12em", textTransform: "uppercase" }}>Proficiência</div>
                <div style={{ fontSize: 13, color: "#D97706" }}>Arma Marcial</div>
              </div>
            )}
          </div>
          {w.regraEspecial && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", background: "#0A0A0A", border: "1px solid #1F1F1F", borderRadius: 3 }}>
              <AlertTriangle size={13} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, lineHeight: 1.6 }}>{w.regraEspecial}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategorySection({ category, weapons }: { category: string; weapons: WeaponTemplate[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ background: "#0F0F0F", border: "1px solid #1F1F1F", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Sword size={15} color="#7C3AED" />
          <h3 className="font-cinzel" style={{ fontSize: 14, fontWeight: 700, color: "#F3F4F6", margin: 0, letterSpacing: "0.08em" }}>
            {category}
          </h3>
          <span style={{ fontSize: 10, color: "#52525B" }}>{weapons.length} arma(s)</span>
        </div>
        {open ? <ChevronDown size={14} color="#52525B" /> : <ChevronRight size={14} color="#52525B" />}
      </button>

      {open && (
        <>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto auto",
            gap: 16,
            padding: "6px 16px",
            background: "#0A0A0A",
            borderTop: "1px solid #111",
            borderBottom: "1px solid #111",
          }}>
            {["Nome", "Dado", "Tipo", "Crítico", ""].map((h, i) => (
              <div key={i} style={{ fontSize: 9, color: "#3F3F46", letterSpacing: "0.12em", textTransform: "uppercase", textAlign: i === 0 ? "left" : "center" }}>
                {h}
              </div>
            ))}
          </div>
          {weapons.map(w => <WeaponRow key={w.id} w={w} />)}
        </>
      )}
    </div>
  );
}

export default function ArmasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token  = (session?.user as any)?.backendToken as string | undefined;

  const [weapons, setWeapons]   = useState<WeaponTemplate[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status !== "authenticated" || !token) return;

    apiCall<WeaponTemplate[]>("/seeds/weapon-templates", token)
      .then(setWeapons)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, token, router]);

  if (status === "loading" || loading) {
    return (
      <div style={{ height: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <div style={{ width: 36, height: 36, border: "2px solid #1F1F1F", borderTop: "2px solid #7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 12, color: "#52525B", letterSpacing: "0.1em" }}>Carregando arsenal…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const filtered = weapons.filter(w =>
    !search ||
    w.nome.toLowerCase().includes(search.toLowerCase()) ||
    w.categoria.toLowerCase().includes(search.toLowerCase()) ||
    w.tipoDano.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const byCategory = filtered.reduce<Record<string, WeaponTemplate[]>>((acc, w) => {
    (acc[w.categoria] ??= []).push(w);
    return acc;
  }, {});
  const categories = Object.keys(byCategory).sort();

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", paddingTop: "calc(68px + 32px)", paddingBottom: 60 }}>
      <div className="bg-grid" style={{ position: "fixed", inset: 0, opacity: 0.3, pointerEvents: "none" }} />

      <div style={{ position: "relative", maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "Cinzel, serif" }}>
              Arsenal & Equipamentos
            </p>
            <h1 className="font-cinzel" style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "0.08em" }}>
              Armas
            </h1>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar arma…"
            style={{
              background: "#0F0F0F", border: "1px solid #27272A", borderRadius: 3,
              padding: "8px 14px", color: "#E5E7EB", fontSize: 13, outline: "none",
              width: 200, transition: "border-color 0.15s",
            }}
            onFocus={e => (e.target.style.borderColor = "#7C3AED")}
            onBlur={e => (e.target.style.borderColor = "#27272A")}
          />
        </div>

        {/* Stats bar */}
        <div style={{
          display: "flex", gap: 20, marginBottom: 28,
          padding: "10px 16px",
          background: "#0F0F0F", border: "1px solid #1A1A1A", borderRadius: 4,
          flexWrap: "wrap",
        }}>
          <div style={{ fontSize: 11, color: "#52525B" }}>
            <span style={{ color: "#F3F4F6", fontWeight: 700 }}>{filtered.length}</span> arma(s) catalogada(s)
          </div>
          <div style={{ fontSize: 11, color: "#52525B" }}>
            <span style={{ color: "#F3F4F6", fontWeight: 700 }}>{categories.length}</span> categorias
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ fontSize: 11, color: "#7C3AED", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Limpar busca
            </button>
          )}
        </div>

        {categories.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", border: "1px dashed #1F1F1F", borderRadius: 4 }}>
            <Sword size={36} color="#27272A" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 14, color: "#52525B" }}>
              {search ? "Nenhuma arma encontrada para esta busca." : "Nenhuma arma no catálogo."}
            </p>
          </div>
        ) : (
          categories.map(cat => (
            <CategorySection key={cat} category={cat} weapons={byCategory[cat]} />
          ))
        )}
      </div>
    </div>
  );
}
