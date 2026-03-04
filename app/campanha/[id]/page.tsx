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

// ─── Types ─────────────────────────────────────────────────────────────────────
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

// ─── Sub-navbar ────────────────────────────────────────────────────────────────
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
    <div style={{
      position: "fixed",
      top: 68,
      left: 0,
      right: 0,
      zIndex: 40,
      background: "rgba(10,10,10,0.95)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid #1A1A1A",
      height: 44,
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      padding: "0 24px",
      gap: 8,
    }}>
      {/* Active combat indicator */}
      {campaign.isActiveCombat && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          marginRight: "auto",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", boxShadow: "0 0 6px #EF4444", animation: "pulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 600, letterSpacing: "0.08em" }}>COMBATE ATIVO</span>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </div>
      )}

      {/* Convidar Jogadores */}
      <button
        onClick={onInvite}
        style={navBtnStyle}
        onMouseEnter={e => Object.assign((e.currentTarget as HTMLButtonElement).style, navBtnHover)}
        onMouseLeave={e => Object.assign((e.currentTarget as HTMLButtonElement).style, navBtnStyle)}
      >
        <UserPlus size={13} /> Convidar Jogadores
      </button>

      {/* Escudo do Mestre */}
      {isMaster && (
        <Link
          href={`/campanha/${campaign.id}/escudo`}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px",
            background: "rgba(124,58,237,0.15)",
            border: "1px solid #7C3AED",
            borderRadius: 2,
            color: "#A78BFA",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
            textDecoration: "none",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(124,58,237,0.28)"}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(124,58,237,0.15)"}
        >
          <Shield size={13} /> Escudo do Mestre
        </Link>
      )}

      {/* Sair da Campanha */}
      {!isMaster && (
        <button
          onClick={onLeave}
          style={{ ...navBtnStyle, borderColor: "#3F1515", color: "#EF4444" }}
          onMouseEnter={e => Object.assign((e.currentTarget as HTMLButtonElement).style, { ...navBtnStyle, borderColor: "#EF4444", color: "#FCA5A5", background: "rgba(239,68,68,0.08)" })}
          onMouseLeave={e => Object.assign((e.currentTarget as HTMLButtonElement).style, { ...navBtnStyle, borderColor: "#3F1515", color: "#EF4444" })}
        >
          <LogOut size={13} /> Sair da Campanha
        </button>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "5px 14px",
  background: "transparent",
  border: "1px solid #27272A",
  borderRadius: 2,
  cursor: "pointer",
  color: "#A1A1AA",
  fontSize: 11, fontWeight: 600, letterSpacing: "0.07em",
  transition: "border-color 0.15s, color 0.15s, background 0.15s",
  whiteSpace: "nowrap",
};

const navBtnHover: React.CSSProperties = {
  borderColor: "#7C3AED",
  color: "#A78BFA",
  background: "rgba(124,58,237,0.08)",
};

// ─── Invite Modal ──────────────────────────────────────────────────────────────
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
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#111111",
          border: "1px solid #27272A",
          borderRadius: 4,
          padding: "36px 40px",
          width: 380,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: "linear-gradient(90deg,transparent,#7C3AED,transparent)" }} />

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, border: "1px solid #7C3AED",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", boxShadow: "0 0 16px rgba(124,58,237,0.3)",
          }}>
            <UserPlus size={20} color="#A78BFA" />
          </div>
          <h2 className="font-cinzel" style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 6px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Convidar Jogadores
          </h2>
          <p style={{ fontSize: 12, color: "#52525B", margin: 0 }}>
            Compartilhe o código abaixo com seus jogadores
          </p>
        </div>

        {/* Code display */}
        <div style={{
          background: "#0A0A0A",
          border: "1px solid #27272A",
          borderRadius: 2,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}>
          <span className="font-cinzel" style={{
            fontSize: 20, fontWeight: 700, letterSpacing: "0.2em",
            color: "#A78BFA", textShadow: "0 0 20px rgba(167,139,250,0.4)",
          }}>
            {code}
          </span>
          <button
            onClick={copy}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px",
              background: copied ? "rgba(34,197,94,0.1)" : "rgba(124,58,237,0.1)",
              border: `1px solid ${copied ? "#22C55E" : "#7C3AED"}`,
              borderRadius: 2,
              cursor: "pointer",
              color: copied ? "#22C55E" : "#A78BFA",
              fontSize: 11, fontWeight: 700,
              transition: "all 0.2s",
            }}
          >
            {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
          </button>
        </div>

        <p style={{ fontSize: 10, color: "#3F3F46", textAlign: "center", margin: "0 0 20px" }}>
          O jogador acessa pelo menu <strong style={{ color: "#52525B" }}>Ficha → Entrar em Campanha</strong>
        </p>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "9px",
            background: "transparent", border: "1px solid #27272A",
            borderRadius: 2, cursor: "pointer",
            color: "#71717A", fontSize: 12,
          }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

// ─── Leave Confirm Modal ────────────────────────────────────────────────────────
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
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#111111", border: "1px solid #27272A", borderRadius: 4, padding: "32px 36px", width: 360 }}
      >
        <h2 className="font-cinzel" style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 10px", letterSpacing: "0.1em" }}>
          Sair da Campanha
        </h2>
        <p style={{ fontSize: 13, color: "#71717A", margin: "0 0 24px", lineHeight: 1.6 }}>
          Isso irá desativar seu personagem nesta campanha. Esta ação pode ser desfeita pelo Mestre.
        </p>
        {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "0 0 12px" }}>{error}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleLeave}
            disabled={loading}
            style={{
              flex: 1, padding: "9px", background: "#991B1B",
              border: "1px solid #EF4444", borderRadius: 2,
              cursor: loading ? "not-allowed" : "pointer",
              color: "#FFF", fontSize: 12, fontWeight: 700,
            }}
          >
            {loading ? "Saindo…" : "Confirmar Saída"}
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "9px", background: "transparent", border: "1px solid #27272A", borderRadius: 2, cursor: "pointer", color: "#71717A", fontSize: 12 }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Character Card ─────────────────────────────────────────────────────────────
function CharacterCard({ char, isMaster, currentUserId, token, onApprove }: {
  char: Character;
  isMaster: boolean;
  currentUserId: string;
  token: string;
  onApprove: (id: string) => void;
}) {
  const isOwn = char.userId === currentUserId;
  const date = new Date(char.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  // Avatar placeholder colors
  const hue = char.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  return (
    <div style={{
      background: "#0F0F0F",
      border: "1px solid #1F1F1F",
      borderRadius: 4,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      transition: "border-color 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1F1F1F")}
    >
      {/* Card top: avatar + info */}
      <div style={{ display: "flex", gap: 0, flex: 1 }}>
        {/* Avatar */}
        <div style={{
          width: 90, flexShrink: 0,
          background: `linear-gradient(160deg, hsl(${hue},25%,12%) 0%, #0A0A0A 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
          minHeight: 110,
        }}>
          <div style={{
            width: 44, height: 44,
            border: `1px solid hsl(${hue},40%,28%)`,
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 0.8,
          }}>
            <Shield size={18} color={`hsl(${hue},55%,55%)`} />
          </div>
          {/* Mob badge */}
          {char.isMob && (
            <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, textAlign: "center", fontSize: 8, color: "#6B7280", letterSpacing: "0.1em" }}>
              MOB
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, padding: "14px 14px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#F3F4F6", letterSpacing: "0.01em" }}>
                {char.nome}
              </div>
              <div style={{ fontSize: 12, color: "#8B5CF6", fontWeight: 500, marginTop: 1 }}>
                {char.specialization?.nome ?? <span style={{ color: "#52525B" }}>Sem classe</span>}
              </div>
            </div>
            {(isMaster || isOwn) && (
              <button
                style={{ background: "none", border: "none", cursor: "pointer", color: "#3F3F46", padding: 2, borderRadius: 2 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#71717A")}
                onMouseLeave={e => (e.currentTarget.style.color = "#3F3F46")}
              >
                <Settings size={14} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Calendar size={10} color="#3F3F46" />
            <span style={{ fontSize: 10, color: "#52525B" }}>Registrado em {date}</span>
          </div>

          {/* Approval badge */}
          {!char.isApproved && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 10, color: "#F59E0B", border: "1px solid #78350F", padding: "1px 6px", borderRadius: 2 }}>
                Aguardando aprovação
              </span>
              {isMaster && (
                <button
                  onClick={() => onApprove(char.id)}
                  style={{
                    fontSize: 10, color: "#22C55E", border: "1px solid #14532D",
                    padding: "1px 6px", borderRadius: 2, background: "none", cursor: "pointer",
                  }}
                >
                  Aprovar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer: Acessar Ficha */}
      {(isOwn || isMaster) && (
        <div style={{ borderTop: "1px solid #1A1A1A", padding: "8px 12px", display: "flex", justifyContent: "flex-end" }}>
          <Link
            href={`/ficha/${char.id}`}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 14px",
              background: "#7C3AED",
              color: "#fff",
              textDecoration: "none",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              borderRadius: 2,
              fontFamily: "Cinzel, serif",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "#6D28D9"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "#7C3AED"}
          >
            Acessar Ficha <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
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
      <div style={{ height: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <div style={{ width: 36, height: 36, border: "2px solid #1F1F1F", borderTop: "2px solid #7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 12, color: "#52525B", letterSpacing: "0.1em" }}>Carregando campanha…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={{ height: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 13, color: "#EF4444" }}>Campanha não encontrada.</span>
        <Link href="/campanha" style={{ fontSize: 12, color: "#7C3AED", textDecoration: "underline" }}>Voltar</Link>
      </div>
    );
  }

  const isMaster = campaign.master.id === userId;
  const myChar = campaign.characters.find(c => c.userId === userId && !c.isMob);

  // Gradient hue for header
  const hue = campaign.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  // Tabs
  const agents = campaign.characters.filter(c => !c.isMob);
  const mobs   = campaign.characters.filter(c => c.isMob);
  const shownChars = tab === "agentes" ? agents : mobs;

  return (
    <>
      {/* Sub-navbar */}
      <CampaignNavbar
        campaign={campaign}
        isMaster={isMaster}
        onInvite={() => setShowInvite(true)}
        onLeave={() => setShowLeave(true)}
      />

      {/* Modals */}
      {showInvite && <InviteModal code={campaign.inviteCode} onClose={() => setShowInvite(false)} />}
      {showLeave && myChar && (
        <LeaveModal
          characterId={myChar.id}
          token={token!}
          onClose={() => setShowLeave(false)}
          onDone={() => {
            // Clear user-scoped localStorage entry
            if (userId) localStorage.removeItem(`assistente-fiel-character-${userId}`);
            router.push("/campanha");
          }}
        />
      )}

      <div style={{ minHeight: "100vh", background: "#0A0A0A", paddingTop: "calc(68px + 44px + 32px)", paddingBottom: 60 }}>
        <div className="bg-grid" style={{ position: "fixed", inset: 0, opacity: 0.35, pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>

          {/* Campaign header */}
          <div style={{ display: "flex", gap: 24, alignItems: "flex-end", marginBottom: 40 }}>

            {/* Image box */}
            <div style={{
              width: 200, height: 200, flexShrink: 0,
              background: `radial-gradient(ellipse at 40% 35%, hsl(${hue},35%,15%) 0%, #0A0A0A 75%)`,
              border: "1px solid #1F1F1F",
              borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)",
                backgroundSize: "20px 20px",
              }} />
              <div style={{
                width: 72, height: 72,
                border: `1px solid hsl(${hue},40%,30%)`,
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 28px hsl(${hue},40%,18%)`,
              }}>
                <Shield size={30} color={`hsl(${hue},55%,55%)`} />
              </div>
            </div>

            {/* Title + info */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                {campaign.isActiveCombat && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: "#FCA5A5", letterSpacing: "0.1em",
                    background: "#991B1B", border: "1px solid #EF4444",
                    padding: "2px 7px", borderRadius: 2,
                  }}>EM COMBATE</span>
                )}
                {isMaster && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em",
                    background: "rgba(124,58,237,0.15)", border: "1px solid #7C3AED",
                    padding: "2px 7px", borderRadius: 2,
                  }}>MESTRE</span>
                )}
              </div>
              <h1 className="font-cinzel" style={{ fontSize: 32, fontWeight: 700, color: "#F3F4F6", margin: "0 0 8px", letterSpacing: "0.06em" }}>
                {campaign.name}
              </h1>
              <div style={{ display: "flex", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Users size={12} color="#52525B" />
                  <span style={{ fontSize: 12, color: "#52525B" }}>
                    {agents.length} agente(s)
                  </span>
                </div>
                {isMaster && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Swords size={12} color="#52525B" />
                    <span style={{ fontSize: 12, color: "#52525B" }}>{mobs.length} mob(s)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex",
            borderBottom: "1px solid #1A1A1A",
            marginBottom: 28,
            gap: 0,
          }}>
            {([
              { id: "agentes", label: `Agentes (${agents.length})` },
              ...(isMaster ? [{ id: "jogadores", label: `Mobs (${mobs.length})` }] : []),
            ] as { id: Tab; label: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "10px 20px",
                  background: "none",
                  border: "none",
                  borderBottom: tab === t.id ? "2px solid #8B5CF6" : "2px solid transparent",
                  cursor: "pointer",
                  color: tab === t.id ? "#A78BFA" : "#52525B",
                  fontSize: 13, fontWeight: 600, letterSpacing: "0.06em",
                  transition: "color 0.15s",
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Characters grid */}
          {shownChars.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px 24px",
              border: "1px dashed #1A1A1A", borderRadius: 4,
            }}>
              <Users size={32} color="#1F1F1F" style={{ marginBottom: 14 }} />
              <p style={{ fontSize: 13, color: "#52525B", margin: 0 }}>
                {tab === "agentes" ? "Nenhum agente na campanha." : "Nenhum mob criado."}
              </p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}>
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
