"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api";
import { Shield, Users, ChevronRight, Plus, X, Swords, Trash2 } from "lucide-react";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  inviteCode: string;
  isActiveCombat: boolean;
  master: { id: string; email: string };
  _count?: { characters: number };
  characters?: { id: string }[];
}

function CampaignCard({ campaign, token, userId, onDeleted }: { campaign: Campaign; token: string; userId: string; onDeleted: (id: string) => void }) {
  const isMaster = campaign.master.id === userId;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hue = campaign.id
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiCall(`/campaigns/${campaign.id}`, token, { method: "DELETE" });
      onDeleted(campaign.id);
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div
      className="bg-bg-surface border border-border rounded overflow-hidden flex flex-col transition-colors hover:border-brand"
    >
      {/* Campaign image placeholder */}
      <div
        className="w-full relative overflow-hidden flex items-center justify-center"
        style={{
          aspectRatio: "16/9",
          background: `radial-gradient(ellipse at 30% 40%, hsl(${hue},40%,18%) 0%, #0A0A0A 70%)`,
        }}
      >
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center opacity-50"
          style={{ border: `1px solid hsl(${hue},50%,35%)`, boxShadow: `0 0 24px hsl(${hue},50%,25%)` }}
        >
          <Shield size={24} color={`hsl(${hue},60%,55%)`} />
        </div>
        {campaign.isActiveCombat && (
          <div className="absolute top-2.5 right-2.5 bg-[#991B1B] border border-[#EF4444] px-2 py-0.5 rounded-sm text-[9px] font-bold text-[#FCA5A5] tracking-[0.1em]">
            EM COMBATE
          </div>
        )}
        {isMaster && (
          <div className="absolute top-2.5 left-2.5 bg-[rgba(124,58,237,0.25)] border border-brand px-2 py-0.5 rounded-sm text-[9px] font-bold text-brand-muted tracking-[0.1em]">
            MESTRE
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-[18px] py-4 flex-1 flex flex-col gap-2.5">
        <div>
          <h2 className="font-cinzel text-[17px] font-bold text-[#F3F4F6] m-0 mb-1 tracking-[0.05em]">
            {campaign.name}
          </h2>
          <div className="flex items-center gap-1.5">
            <Users size={11} color="#52525B" />
            <span className="text-[11px] text-text-faint">
              {campaign._count?.characters ?? 0} agente(s) · Mestre: {campaign.master.email.split("@")[0]}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/campanha/${campaign.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-[9px] bg-brand text-white no-underline text-xs font-bold tracking-[0.1em] uppercase rounded-sm font-cinzel transition-all hover:bg-brand-dark"
            style={{ boxShadow: "0 0 16px rgba(124,58,237,0.3)" }}
          >
            Acessar <ChevronRight size={14} />
          </Link>
          {isMaster && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center justify-center w-9 bg-transparent border border-border rounded-sm cursor-pointer text-text-faint transition-colors hover:border-[#EF4444] hover:text-[#EF4444]"
              title="Excluir campanha"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="bg-[rgba(127,29,29,0.1)] border border-[#EF444444] rounded-sm p-3 flex flex-col gap-2.5">
            <p className="text-[11px] text-[#FCA5A5] m-0">
              Excluir <strong>{campaign.name}</strong>? Todos os personagens, combates e dados serão removidos permanentemente.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-1.5 bg-transparent border border-border rounded-sm text-text-muted text-[10px] font-semibold tracking-[0.08em] uppercase cursor-pointer hover:border-border-strong transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-1.5 border-none rounded-sm cursor-pointer text-white text-[10px] font-bold tracking-[0.08em] uppercase transition-colors disabled:opacity-50"
                style={{ background: "#991B1B" }}
              >
                {deleting ? "Excluindo…" : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateCampaignModal({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: (c: Campaign) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await apiCall<Campaign>("/campaigns", token, {
        method: "POST",
        body: { name: name.trim() },
      });
      onCreated(created);
    } catch {
      setError("Erro ao criar campanha. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-[rgba(0,0,0,0.75)] flex items-center justify-center backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-surface border border-border-strong rounded-md p-7 w-full max-w-[420px] relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Swords size={18} color="#7C3AED" />
            <h2 className="font-cinzel text-base font-bold text-[#F3F4F6] m-0 tracking-[0.08em]">
              Nova Campanha
            </h2>
          </div>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-text-faint p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] text-text-mid tracking-[0.15em] uppercase mb-2 font-cinzel">
              Nome da Campanha
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: A Maldição de Ferro..."
              maxLength={80}
              className="ficha-input"
            />
          </div>

          {error && (
            <p className="text-xs text-[#F87171] m-0">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex items-center justify-center gap-2 py-2.5 border-none rounded cursor-pointer text-xs font-bold tracking-[0.1em] uppercase font-cinzel transition-colors disabled:cursor-not-allowed"
            style={{
              background: saving || !name.trim() ? "#3B0764" : "#7C3AED",
              color: saving || !name.trim() ? "#6D28D9" : "#fff",
            }}
          >
            {saving ? "Criando…" : <><Plus size={13} /> Criar Campanha</>}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CampanhaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token = (session?.user as any)?.backendToken as string | undefined;
  const userId = (session?.user as any)?.backendUserId as string | undefined;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status !== "authenticated" || !token) return;

    apiCall<Campaign[]>("/campaigns", token)
      .then(setCampaigns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, token, router]);

  if (status === "loading" || loading) {
    return (
      <div className="h-screen bg-bg-dark flex flex-col items-center justify-center gap-3.5">
        <div className="w-9 h-9 rounded-full border-2 border-border border-t-brand animate-spin-fast" />
        <span className="text-xs text-text-faint tracking-[0.1em]">Carregando campanhas…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main pt-[calc(68px+32px)] pb-16">
      <div className="bg-grid fixed inset-0 opacity-40 pointer-events-none" />

      {showCreate && token && (
        <CreateCampaignModal
          token={token}
          onClose={() => setShowCreate(false)}
          onCreated={c => { setCampaigns(prev => [...prev, c]); setShowCreate(false); }}
        />
      )}

      <div className="relative max-w-[1100px] mx-auto px-6">

        {/* Header */}
        <div className="flex items-end justify-between mb-9 flex-wrap gap-4">
          <div>
            <p className="text-[10px] text-text-faint tracking-[0.2em] uppercase m-0 mb-1.5 font-cinzel">
              Suas mesas
            </p>
            <h1 className="font-cinzel text-[26px] font-bold text-white m-0 tracking-[0.08em]">
              Campanhas
            </h1>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-[7px] px-4 py-2 bg-brand border-none rounded-sm text-white text-xs font-bold tracking-[0.08em] uppercase font-cinzel cursor-pointer transition-all hover:bg-brand-dark"
              style={{ boxShadow: "0 0 16px rgba(124,58,237,0.3)" }}
            >
              <Plus size={13} /> Criar Campanha
            </button>
            <Link
              href="/ficha"
              className="flex items-center gap-[7px] px-4 py-2 bg-transparent border border-border-strong rounded-sm text-text-secondary text-xs font-semibold tracking-[0.06em] no-underline transition-colors hover:border-brand hover:text-brand-muted"
            >
              <Plus size={13} /> Entrar em campanha
            </Link>
          </div>
        </div>

        {/* Grid */}
        {campaigns.length === 0 ? (
          <div className="text-center py-20 px-6 border border-dashed border-border rounded">
            <Shield size={36} color="#27272A" className="mb-4 mx-auto" />
            <p className="text-[14px] text-text-faint m-0 mb-1.5">Nenhuma campanha encontrada.</p>
            <p className="text-xs text-text-ghost m-0">
              Peça um código ao Mestre e acesse pelo menu <strong className="text-text-mid">Ficha</strong>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {campaigns.map(c => (
              <CampaignCard
                key={c.id}
                campaign={c}
                token={token!}
                userId={userId ?? ""}
                onDeleted={id => setCampaigns(prev => prev.filter(p => p.id !== id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
