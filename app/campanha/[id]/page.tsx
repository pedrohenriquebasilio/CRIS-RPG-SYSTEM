"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiCall } from "@/lib/api";
import {
  Shield, Users, Copy, Check, LogOut, UserPlus,
  ChevronRight, Swords, Settings, Calendar,
} from "lucide-react";
import Link from "next/link";

interface Character {
  id: string;
  nome: string;
  nivel: number;
  isApproved: boolean;
  isMob: boolean;
  createdAt: string;
  userId: string;
  specialization: { nome: string } | null;
  user: { id: string; email: string };
}

interface Campaign {
  id: string;
  name: string;
  inviteCode: string;
  isActiveCombat: boolean;
  master: { id: string; email: string };
  characters: Character[];
}

function CampaignNavbar({
  campaign,
  isMaster,
  onLeave,
  onInvite,
}: {
  campaign: Campaign;
  isMaster: boolean;
  onLeave: () => void;
  onInvite: () => void;
}) {
  return (
    <div className="fixed top-[68px] left-0 right-0 z-40 bg-[rgba(10,10,10,0.95)] backdrop-blur-[10px] border-b border-border-subtle h-11 flex items-center justify-end px-6 gap-2">
      {campaign.isActiveCombat && (
        <div className="flex items-center gap-1.5 mr-auto">
          <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse-dot" style={{ boxShadow: "0 0 6px #EF4444" }} />
          <span className="text-[11px] text-[#EF4444] font-semibold tracking-[0.08em]">COMBATE ATIVO</span>
        </div>
      )}

      <button
        onClick={onInvite}
        className="flex items-center gap-1.5 px-3.5 py-[5px] bg-transparent border border-border-strong rounded-sm cursor-pointer text-text-secondary text-[11px] font-semibold tracking-[0.07em] whitespace-nowrap transition-colors hover:border-brand hover:text-brand-muted hover:bg-[rgba(124,58,237,0.08)]"
      >
        <UserPlus size={13} /> Convidar Jogadores
      </button>

      {isMaster && (
        <Link
          href={`/campanha/${campaign.id}/escudo`}
          className="flex items-center gap-1.5 px-3 py-[5px] bg-[rgba(124,58,237,0.15)] border border-brand rounded-sm text-brand-muted text-[11px] font-bold tracking-[0.08em] no-underline transition-colors hover:bg-[rgba(124,58,237,0.28)]"
        >
          <Shield size={13} /> Escudo do Mestre
        </Link>
      )}

      {!isMaster && (
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 px-3.5 py-[5px] bg-transparent border border-[#3F1515] rounded-sm cursor-pointer text-[#EF4444] text-[11px] font-semibold tracking-[0.07em] whitespace-nowrap transition-colors hover:border-[#EF4444] hover:text-[#FCA5A5] hover:bg-[rgba(239,68,68,0.08)]"
        >
          <LogOut size={13} /> Sair da Campanha
        </button>
      )}
    </div>
  );
}

function InviteModal({ code, onClose }: { code: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-[rgba(0,0,0,0.7)] backdrop-blur-sm flex items-center justify-center"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-bg-surface border border-border-strong rounded px-10 py-9 w-[380px] max-w-[calc(100vw-32px)] relative"
      >
        <div className="absolute top-0 left-[20%] right-[20%] h-px" style={{ background: "linear-gradient(90deg,transparent,#7C3AED,transparent)" }} />

        <div className="text-center mb-7">
          <div
            className="w-12 h-12 border border-brand flex items-center justify-center mx-auto mb-4"
            style={{ boxShadow: "0 0 16px rgba(124,58,237,0.3)" }}
          >
            <UserPlus size={20} color="#A78BFA" />
          </div>
          <h2 className="font-cinzel text-base font-bold text-white m-0 mb-1.5 tracking-[0.12em] uppercase">
            Convidar Jogadores
          </h2>
          <p className="text-xs text-text-faint m-0">
            Compartilhe o código abaixo com seus jogadores
          </p>
        </div>

        <div className="bg-bg-input border border-border-strong rounded-sm px-4 py-[14px] flex items-center justify-between gap-3 mb-3">
          <span className="font-cinzel text-xl font-bold tracking-[0.2em] text-brand-muted" style={{ textShadow: "0 0 20px rgba(167,139,250,0.4)" }}>
            {code}
          </span>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm cursor-pointer text-[11px] font-bold transition-all"
            style={{
              background: copied ? "rgba(34,197,94,0.1)" : "rgba(124,58,237,0.1)",
              border: `1px solid ${copied ? "#22C55E" : "#7C3AED"}`,
              color: copied ? "#22C55E" : "#A78BFA",
            }}
          >
            {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
          </button>
        </div>

        <p className="text-[10px] text-text-ghost text-center m-0 mb-5">
          O jogador acessa pelo menu <strong className="text-text-faint">Ficha → Entrar em Campanha</strong>
        </p>

        <button
          onClick={onClose}
          className="w-full py-[9px] bg-transparent border border-border-strong rounded-sm cursor-pointer text-text-mid text-xs"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function LeaveModal({ characterId, token, onClose, onDone }: { characterId: string; token: string; onClose: () => void; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLeave() {
    setLoading(true);
    try {
      await apiCall(`/characters/${characterId}`, token, { method: "DELETE" });
      onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao sair da campanha.");
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-[rgba(0,0,0,0.7)] backdrop-blur-sm flex items-center justify-center"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-bg-surface border border-border-strong rounded px-9 py-8 w-[360px] max-w-[calc(100vw-32px)]"
      >
        <h2 className="font-cinzel text-[15px] font-bold text-white m-0 mb-2.5 tracking-[0.1em]">
          Sair da Campanha
        </h2>
        <p className="text-[13px] text-text-mid m-0 mb-6 leading-[1.6]">
          Isso irá desativar seu personagem nesta campanha. Esta ação pode ser desfeita pelo Mestre.
        </p>
        {error && <p className="text-xs text-[#EF4444] m-0 mb-3">{error}</p>}
        <div className="flex gap-2.5">
          <button
            onClick={handleLeave}
            disabled={loading}
            className="flex-1 py-[9px] bg-[#991B1B] border border-[#EF4444] rounded-sm cursor-pointer disabled:cursor-not-allowed text-white text-xs font-bold"
          >
            {loading ? "Saindo…" : "Confirmar Saída"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-[9px] bg-transparent border border-border-strong rounded-sm cursor-pointer text-text-mid text-xs"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function CharacterCard({ char, isMaster, currentUserId, token, onApprove }: {
  char: Character;
  isMaster: boolean;
  currentUserId: string;
  token: string;
  onApprove: (id: string) => void;
}) {
  const isOwn = char.userId === currentUserId;
  const date = new Date(char.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  const hue = char.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  return (
    <div className="bg-[#0F0F0F] border border-border rounded overflow-hidden flex flex-col transition-colors hover:border-border-md">

      <div className="flex flex-1">
        {/* Avatar */}
        <div
          className="w-[90px] shrink-0 flex items-center justify-center relative min-h-[110px]"
          style={{ background: `linear-gradient(160deg, hsl(${hue},25%,12%) 0%, #0A0A0A 100%)` }}
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center opacity-80"
            style={{ border: `1px solid hsl(${hue},40%,28%)` }}
          >
            <Shield size={18} color={`hsl(${hue},55%,55%)`} />
          </div>
          {char.isMob && (
            <div className="absolute bottom-1.5 left-0 right-0 text-center text-[8px] text-text-muted tracking-[0.1em]">
              MOB
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 px-3.5 pt-3.5 pb-2.5 flex flex-col gap-0.5 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-base font-bold text-[#F3F4F6] tracking-[0.01em]">
                {char.nome}
              </div>
              <div className="text-xs text-[#8B5CF6] font-medium mt-0.5">
                {char.specialization?.nome ?? <span className="text-text-faint">Sem classe</span>}
              </div>
            </div>
            {(isMaster || isOwn) && (
              <button
                className="bg-transparent border-none cursor-pointer text-text-ghost p-0.5 rounded-sm transition-colors hover:text-text-mid"
              >
                <Settings size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <Calendar size={10} color="#3F3F46" />
            <span className="text-[10px] text-text-faint">Registrado em {date}</span>
          </div>

          {!char.isApproved && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-[#F59E0B] border border-[#78350F] px-1.5 py-0.5 rounded-sm">
                Aguardando aprovação
              </span>
              {isMaster && (
                <button
                  onClick={() => onApprove(char.id)}
                  className="text-[10px] text-[#22C55E] border border-[#14532D] px-1.5 py-0.5 rounded-sm bg-transparent cursor-pointer"
                >
                  Aprovar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {(isOwn || isMaster) && (
        <div className="border-t border-border-subtle px-3 py-2 flex justify-end">
          <Link
            href={`/ficha/${char.id}`}
            className="flex items-center gap-1.5 px-3.5 py-[5px] bg-brand text-white no-underline text-[11px] font-bold tracking-[0.06em] uppercase rounded-sm font-cinzel transition-colors hover:bg-brand-dark"
          >
            Acessar Ficha <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}

type Tab = "agentes" | "jogadores";

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { data: session, status } = useSession();

  const token = (session?.user as any)?.backendToken as string | undefined;
  const userId = (session?.user as any)?.backendUserId as string | undefined;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("agentes");
  const [showInvite, setShowInvite] = useState(false);
  const [showLeave, setShowLeave] = useState(false);

  const fetchCampaign = useCallback(() => {
    if (!token) return;
    apiCall<Campaign>(`/campaigns/${id}`, token)
      .then(setCampaign)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, token]);

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status !== "authenticated" || !token) return;
    fetchCampaign();
  }, [status, token, fetchCampaign, router]);

  async function handleApprove(charId: string) {
    if (!token || !campaign) return;
    await apiCall(`/campaigns/${campaign.id}/characters/${charId}/approve`, token, { method: "PATCH" });
    fetchCampaign();
  }

  if (status === "loading" || loading) {
    return (
      <div className="h-screen bg-bg-dark flex flex-col items-center justify-center gap-3.5">
        <div className="w-9 h-9 rounded-full border-2 border-border border-t-brand animate-spin-fast" />
        <span className="text-xs text-text-faint tracking-[0.1em]">Carregando campanha…</span>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="h-screen bg-bg-dark flex flex-col items-center justify-center gap-3">
        <span className="text-[13px] text-[#EF4444]">Campanha não encontrada.</span>
        <Link href="/campanha" className="text-xs text-brand underline">Voltar</Link>
      </div>
    );
  }

  const isMaster = campaign.master.id === userId;
  const myChar = campaign.characters.find(c => c.userId === userId && !c.isMob);

  const hue = campaign.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  const agents = campaign.characters.filter(c => !c.isMob);
  const mobs   = campaign.characters.filter(c => c.isMob);
  const shownChars = tab === "agentes" ? agents : mobs;

  return (
    <>
      <CampaignNavbar
        campaign={campaign}
        isMaster={isMaster}
        onInvite={() => setShowInvite(true)}
        onLeave={() => setShowLeave(true)}
      />

      {showInvite && <InviteModal code={campaign.inviteCode} onClose={() => setShowInvite(false)} />}
      {showLeave && myChar && (
        <LeaveModal
          characterId={myChar.id}
          token={token!}
          onClose={() => setShowLeave(false)}
          onDone={() => {
            if (userId) localStorage.removeItem(`assistente-fiel-character-${userId}`);
            router.push("/campanha");
          }}
        />
      )}

      <div className="min-h-screen bg-bg-main pt-[calc(68px+44px+32px)] pb-16">
        <div className="bg-grid fixed inset-0 opacity-[0.35] pointer-events-none" />

        <div className="relative max-w-[1100px] mx-auto px-6">

          {/* Campaign header */}
          <div className="flex gap-6 items-end mb-10 flex-wrap">
            <div
              className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] shrink-0 border border-border rounded flex items-center justify-center relative overflow-hidden"
              style={{ background: `radial-gradient(ellipse at 40% 35%, hsl(${hue},35%,15%) 0%, #0A0A0A 75%)` }}
            >
              <div className="absolute inset-0" style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)",
                backgroundSize: "20px 20px",
              }} />
              <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
                style={{ border: `1px solid hsl(${hue},40%,30%)`, boxShadow: `0 0 28px hsl(${hue},40%,18%)` }}
              >
                <Shield size={30} color={`hsl(${hue},55%,55%)`} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-2">
                {campaign.isActiveCombat && (
                  <span className="text-[9px] font-bold text-[#FCA5A5] tracking-[0.1em] bg-[#991B1B] border border-[#EF4444] px-[7px] py-0.5 rounded-sm">EM COMBATE</span>
                )}
                {isMaster && (
                  <span className="text-[9px] font-bold text-brand-muted tracking-[0.1em] bg-[rgba(124,58,237,0.15)] border border-brand px-[7px] py-0.5 rounded-sm">MESTRE</span>
                )}
              </div>
              <h1 className="font-cinzel text-2xl sm:text-[32px] font-bold text-[#F3F4F6] m-0 mb-2 tracking-[0.06em]">
                {campaign.name}
              </h1>
              <div className="flex gap-5">
                <div className="flex items-center gap-1.5">
                  <Users size={12} color="#52525B" />
                  <span className="text-xs text-text-faint">{agents.length} agente(s)</span>
                </div>
                {isMaster && (
                  <div className="flex items-center gap-1.5">
                    <Swords size={12} color="#52525B" />
                    <span className="text-xs text-text-faint">{mobs.length} mob(s)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border-subtle mb-7">
            {([
              { id: "agentes", label: `Agentes (${agents.length})` },
              ...(isMaster ? [{ id: "jogadores", label: `Mobs (${mobs.length})` }] : []),
            ] as { id: Tab; label: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-5 py-2.5 bg-transparent border-none -mb-px cursor-pointer text-[13px] font-semibold tracking-[0.06em] transition-colors"
                style={{
                  borderBottom: tab === t.id ? "2px solid #8B5CF6" : "2px solid transparent",
                  color: tab === t.id ? "#A78BFA" : "#52525B",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Characters grid */}
          {shownChars.length === 0 ? (
            <div className="text-center py-16 px-6 border border-dashed border-border-subtle rounded">
              <Users size={32} color="#1F1F1F" className="mb-3.5 mx-auto" />
              <p className="text-[13px] text-text-faint m-0">
                {tab === "agentes" ? "Nenhum agente na campanha." : "Nenhum mob criado."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shownChars.map(char => (
                <CharacterCard
                  key={char.id}
                  char={char}
                  isMaster={isMaster}
                  currentUserId={userId ?? ""}
                  token={token!}
                  onApprove={handleApprove}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
