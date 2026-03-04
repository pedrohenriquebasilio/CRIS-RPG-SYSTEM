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
    <div className="border-b border-[#111]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full bg-transparent border-none cursor-pointer grid items-center gap-4 px-4 py-3 text-left"
        style={{ gridTemplateColumns: "1fr auto auto auto auto" }}
      >
        {/* Name */}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-text-base flex items-center gap-2">
            {w.nome}
            {w.duasMaos && (
              <span className="text-[9px] text-text-muted border border-border-strong px-1.5 py-px rounded-sm tracking-[0.08em]">2 MÃOS</span>
            )}
            {w.requiresMarcial && (
              <span className="text-[9px] text-[#D97706] border border-[#92400E] px-1.5 py-px rounded-sm tracking-[0.08em]">MARCIAL</span>
            )}
          </div>
          <div className="text-[11px] text-text-faint mt-0.5">{w.distancia}</div>
        </div>

        {/* Damage dice */}
        <div className="text-center">
          <div className="text-[16px] font-bold text-text-near font-cinzel">{w.damageDice}</div>
          <div className="text-[9px] text-text-faint tracking-[0.1em]">DADO</div>
        </div>

        {/* Tipo dano */}
        <div className="text-center">
          <div className="text-[10px] font-bold tracking-[0.08em]" style={{ color: danoColor }}>{w.tipoDano}</div>
          <div className="text-[9px] text-text-faint tracking-[0.1em]">TIPO</div>
        </div>

        {/* Crit */}
        <div className="text-center">
          <div className={`text-[12px] font-bold font-cinzel ${isCrit ? "text-[#F59E0B]" : "text-text-ghost"}`}>
            {w.threatRange === 20 ? "20" : `${w.threatRange}–20`}
            {" / "}×{w.criticalMultiplier}
          </div>
          <div className="text-[9px] text-text-faint tracking-[0.1em]">CRÍTICO</div>
        </div>

        {open ? <ChevronDown size={14} color="#52525B" /> : <ChevronRight size={14} color="#52525B" />}
      </button>

      {open && (
        <div className="px-4 pb-3.5 flex flex-col gap-2">
          <div className="flex gap-6 flex-wrap">
            <div>
              <div className="text-[9px] text-text-faint tracking-[0.12em] uppercase">Dano</div>
              <div className="text-[13px] text-[#D1D5DB]">{w.damageDice} {w.tipoDano}</div>
            </div>
            <div>
              <div className="text-[9px] text-text-faint tracking-[0.12em] uppercase">Ameaça</div>
              <div className="text-[13px] text-[#D1D5DB]">{w.threatRange === 20 ? "20" : `${w.threatRange}–20`}</div>
            </div>
            <div>
              <div className="text-[9px] text-text-faint tracking-[0.12em] uppercase">Multiplicador</div>
              <div className="text-[13px] text-[#D1D5DB]">×{w.criticalMultiplier}</div>
            </div>
            <div>
              <div className="text-[9px] text-text-faint tracking-[0.12em] uppercase">Alcance</div>
              <div className="text-[13px] text-[#D1D5DB]">{w.distancia}</div>
            </div>
            {w.duasMaos && (
              <div>
                <div className="text-[9px] text-text-faint tracking-[0.12em] uppercase">Empunhadura</div>
                <div className="text-[13px] text-[#D1D5DB]">Duas mãos</div>
              </div>
            )}
            {w.requiresMarcial && (
              <div>
                <div className="text-[9px] text-text-faint tracking-[0.12em] uppercase">Proficiência</div>
                <div className="text-[13px] text-[#D97706]">Arma Marcial</div>
              </div>
            )}
          </div>
          {w.regraEspecial && (
            <div className="flex gap-2 items-start px-3 py-2.5 bg-bg-input border border-border rounded-sm">
              <AlertTriangle size={13} color="#D97706" className="shrink-0 mt-px" />
              <p className="text-[12px] text-text-dim m-0 leading-relaxed">{w.regraEspecial}</p>
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
    <div className="bg-bg-deep border border-border rounded overflow-hidden mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full bg-transparent border-none cursor-pointer flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <Sword size={15} color="#7C3AED" />
          <h3 className="font-cinzel text-[14px] font-bold text-text-near m-0 tracking-[0.08em]">
            {category}
          </h3>
          <span className="text-[10px] text-text-faint">{weapons.length} arma(s)</span>
        </div>
        {open ? <ChevronDown size={14} color="#52525B" /> : <ChevronRight size={14} color="#52525B" />}
      </button>

      {open && (
        <>
          {/* Table header */}
          <div
            className="grid gap-4 px-4 py-1.5 bg-bg-input border-t border-b border-[#111]"
            style={{ gridTemplateColumns: "1fr auto auto auto auto" }}
          >
            {["Nome", "Dado", "Tipo", "Crítico", ""].map((h, i) => (
              <div key={i} className={`text-[9px] text-text-ghost tracking-[0.12em] uppercase ${i === 0 ? "text-left" : "text-center"}`}>
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
      <div className="h-screen bg-bg-dark flex flex-col items-center justify-center gap-3.5">
        <div className="w-9 h-9 rounded-full border-2 border-border border-t-brand animate-spin-fast" />
        <span className="text-xs text-text-faint tracking-[0.1em]">Carregando arsenal…</span>
      </div>
    );
  }

  const filtered = weapons.filter(w =>
    !search ||
    w.nome.toLowerCase().includes(search.toLowerCase()) ||
    w.categoria.toLowerCase().includes(search.toLowerCase()) ||
    w.tipoDano.toLowerCase().includes(search.toLowerCase())
  );

  const byCategory = filtered.reduce<Record<string, WeaponTemplate[]>>((acc, w) => {
    (acc[w.categoria] ??= []).push(w);
    return acc;
  }, {});
  const categories = Object.keys(byCategory).sort();

  return (
    <div className="min-h-screen bg-bg-main pt-[calc(68px+32px)] pb-[60px]">
      <div className="bg-grid fixed inset-0 opacity-30 pointer-events-none" />

      <div className="relative max-w-[900px] mx-auto px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
          <div>
            <p className="text-[10px] text-text-faint tracking-[0.2em] uppercase m-0 mb-1.5 font-cinzel">
              Arsenal & Equipamentos
            </p>
            <h1 className="font-cinzel text-[26px] font-bold text-white m-0 tracking-[0.08em]">
              Armas
            </h1>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar arma…"
            className="ficha-input w-[200px]"
          />
        </div>

        {/* Stats bar */}
        <div className="flex gap-5 mb-7 px-4 py-2.5 bg-bg-deep border border-[#1A1A1A] rounded flex-wrap">
          <div className="text-[11px] text-text-faint">
            <span className="text-text-near font-bold">{filtered.length}</span> arma(s) catalogada(s)
          </div>
          <div className="text-[11px] text-text-faint">
            <span className="text-text-near font-bold">{categories.length}</span> categorias
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-[11px] text-brand bg-transparent border-none cursor-pointer p-0 hover:text-brand-muted"
            >
              Limpar busca
            </button>
          )}
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-20 px-6 border border-dashed border-border rounded">
            <Sword size={36} color="#27272A" className="mb-4 mx-auto" />
            <p className="text-[14px] text-text-faint">
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
