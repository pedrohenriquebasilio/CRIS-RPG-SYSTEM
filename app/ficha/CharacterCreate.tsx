"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Shield, ChevronRight, Search, CheckCircle, Users } from "lucide-react";
import type { Character } from "./[id]/CharacterSheet";
import { apiCall } from "@/lib/api";

function storageKey(userId: string) {
  return `assistente-fiel-character-${userId}`;
}

type CampaignInfo = { id: string; name: string; master: { email: string }; playerCount: number; inviteCode: string };
type ExistingChar = { id: string; nome: string; nivel: number; specialization: { nome: string } | null; hpAtual: number; hpMax: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.16em", fontFamily: "Cinzel, serif" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, #2A2A2A, transparent)" }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CharacterCreate() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session?.user as any)?.backendToken as string | undefined;
  const userId = (session?.user as any)?.backendUserId as string | undefined;

  // ── Code verification phase ──
  const [inviteCode,   setInviteCode]   = useState("");
  const [verifying,    setVerifying]    = useState(false);
  const [codeError,    setCodeError]    = useState("");
  const [campaign,     setCampaign]     = useState<CampaignInfo | null>(null);
  const [existingChar, setExistingChar] = useState<ExistingChar | null | "none">(null); // null=not checked, "none"=no char

  // ── Character creation phase ──
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  // ── Step 1: verify invite code ──
  async function handleVerifyCode() {
    const code = inviteCode.trim();
    if (!code) { setCodeError("Informe o código da campanha."); return; }
    setCodeError("");
    setVerifying(true);
    setCampaign(null);
    setExistingChar(null);

    try {
      if (!token) throw new Error("Faça login para continuar.");

      // 1. Get campaign info
      const camp = await apiCall<CampaignInfo>(`/campaigns/invite/${code}`, token);
      setCampaign(camp);

      // 2. Check if player already has a character in this campaign
      const chars = await apiCall<{ id: string; nome: string; nivel: number; userId: string; specialization: { nome: string } | null; hpAtual: number; hpMax: number }[]>(
        `/characters/campaign/${camp.id}`, token
      );
      const mine = chars.find(c => c.userId === userId);
      if (mine) {
        setExistingChar(mine);
      } else {
        setExistingChar("none");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Código inválido ou campanha não encontrada.";
      setCodeError(msg.includes("404") || msg.includes("not found") ? "Código inválido. Verifique com o Mestre." : msg);
      setCampaign(null);
    } finally {
      setVerifying(false);
    }
  }

  // ── Step 2a: enter existing character ──
  async function handleEnterExisting() {
    if (!existingChar || existingChar === "none" || !campaign || !token) return;
    setSaving(true);

    try {
      // Load full character from API
      const full = await apiCall<any>(`/characters/${existingChar.id}`, token);
      const character: Character = {
        id:             full.id,
        nome:           full.nome,
        campaignId:     campaign.id,
        nivel:          full.nivel,
        xpAtual:        full.xpAtual,
        hpAtual:        full.hpAtual,
        hpMax:          full.hpMax,
        energiaAtual:   full.energiaAtual,
        energiaMax:     full.energiaMax,
        maestriaBonus:  full.maestriaBonus,
        isApproved:     full.isApproved,
        specialization: full.specialization ? { id: full.specialization.id, nome: full.specialization.nome, bonusAtributos: full.specialization.bonusAtributos, habilidadesTreinadas: full.specialization.habilidadesTreinadas } : null,
        origemRelacao:  full.origemRelacao ?? null,
        campaign:       { name: campaign.name },
        attributes:     full.attributes ? { FOR: full.attributes.FOR, AGI: full.attributes.AGI, VIG: full.attributes.VIG, INT: full.attributes.INT, PRE: full.attributes.PRE } : null,
        skills:         full.skills ?? [],
        techniques:     full.techniques ?? [],
        weapons:        full.weapons ?? [],
        aptitudes:      full.aptitudes ?? [],
      };
      if (userId) localStorage.setItem(storageKey(userId), JSON.stringify(character));
      router.push(`/ficha/${full.id}`);
    } catch {
      setError("Erro ao carregar a ficha. Tente novamente.");
      setSaving(false);
    }
  }

  // ── Step 2b: "Gerar Feiticeiro" — create bare character ──
  async function handleGerarFeiticeiro() {
    if (!campaign || !token) return;
    setError("");
    setSaving(true);

    try {
      const char = await apiCall<{ id: string; hpMax: number; energiaMax: number; hpAtual: number; energiaAtual: number }>(
        "/characters", token,
        {
          method: "POST",
          body: { campaignId: campaign.id, nome: "Novo Feiticeiro" },
        },
      );

      const character: Character = {
        id:             char.id,
        nome:           "Novo Feiticeiro",
        campaignId:     campaign.id,
        origemId:       null,
        nivel:          1,
        xpAtual:        0,
        hpAtual:        char.hpAtual,
        hpMax:          char.hpMax,
        energiaAtual:   char.energiaAtual,
        energiaMax:     char.energiaMax,
        maestriaBonus:  2,
        isApproved:     false,
        specialization: null,
        origemRelacao:  null,
        campaign:       { name: campaign.name },
        attributes:     { FOR: 0, AGI: 0, VIG: 0, INT: 0, PRE: 0 },
        skills:         [],
        techniques:     [],
        weapons:        [],
        aptitudes:      [],
      };

      if (userId) localStorage.setItem(storageKey(userId), JSON.stringify(character));
      router.push(`/ficha/${char.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao criar personagem.";
      setError(msg);
      setSaving(false);
    }
  }

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 2,
    color: "#E5E7EB", fontFamily: "Inter, sans-serif", fontSize: 14,
    padding: "10px 12px", width: "100%", outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s", boxSizing: "border-box",
  };
  const focusIn  = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(124,58,237,0.15)"; };
  const focusOut = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.boxShadow = "none"; };

  const showCreationForm = campaign !== null && existingChar === "none";
  const foundChar = campaign !== null && existingChar !== null && existingChar !== "none" ? existingChar : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0D0D0D", paddingTop: "calc(68px + 32px)", paddingBottom: 60, paddingLeft: 24, paddingRight: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, opacity: 0.4, pointerEvents: "none" }} className="bg-grid" />

      <div style={{ position: "relative", maxWidth: 740, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, border: "1px solid #7C3AED", marginBottom: 20, position: "relative" }}>
            {(["tl","tr","bl","br"] as const).map(p => (
              <div key={p} style={{ position: "absolute", top: p.startsWith("t") ? -4 : undefined, bottom: p.startsWith("b") ? -4 : undefined, left: p.endsWith("l") ? -4 : undefined, right: p.endsWith("r") ? -4 : undefined, width: 7, height: 7, background: "#7C3AED" }} />
            ))}
            <Shield size={20} color="#A855F7" />
          </div>
          <h1 className="font-cinzel" style={{ fontSize: 22, fontWeight: 700, color: "#FFF", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 8px" }}>
            Entrar na Campanha
          </h1>
          <p style={{ fontSize: 13, color: "#52525B", letterSpacing: "0.05em", margin: 0 }}>
            Insira o código fornecido pelo Mestre
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "#111111", border: "1px solid #1F1F1F", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #7C3AED, transparent)" }} />

          <div style={{ padding: "32px 36px", display: "flex", flexDirection: "column", gap: 28 }}>

            {/* ── Step 1: Code input ── */}
            <section>
              <SectionTitle>Código da Campanha</SectionTitle>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={inviteCode}
                  onChange={e => { setInviteCode(e.target.value); setCodeError(""); setCampaign(null); setExistingChar(null); }}
                  onKeyDown={e => e.key === "Enter" && handleVerifyCode()}
                  placeholder="Cole o código de convite aqui"
                  maxLength={36}
                  style={{ ...inputStyle, flex: 1, fontFamily: "Cinzel, serif", letterSpacing: "0.18em", fontSize: 15 }}
                  onFocus={focusIn} onBlur={focusOut}
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={verifying || !inviteCode.trim()}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "0 20px",
                    background: verifying ? "#1A1A1A" : "rgba(124,58,237,0.15)",
                    border: "1px solid #7C3AED", borderRadius: 2, cursor: verifying ? "not-allowed" : "pointer",
                    color: "#A855F7", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
                    whiteSpace: "nowrap", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { if (!verifying) e.currentTarget.style.background = "rgba(124,58,237,0.25)"; }}
                  onMouseLeave={e => { if (!verifying) e.currentTarget.style.background = "rgba(124,58,237,0.15)"; }}
                >
                  {verifying
                    ? <><div style={{ width: 14, height: 14, border: "2px solid #3F3F46", borderTop: "2px solid #7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Verificando</>
                    : <><Search size={14} /> Verificar</>
                  }
                </button>
              </div>
              {codeError && (
                <p style={{ fontSize: 12, color: "#EF4444", margin: "8px 0 0" }}>{codeError}</p>
              )}
            </section>

            {/* ── Campaign preview ── */}
            {campaign && (
              <div style={{ background: "#0A0A0A", border: "1px solid #22C55E33", borderLeft: "3px solid #22C55E", borderRadius: "0 2px 2px 0", padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <CheckCircle size={14} color="#22C55E" />
                  <span style={{ fontSize: 11, color: "#22C55E", fontWeight: 600, letterSpacing: "0.08em" }}>Campanha encontrada</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 20px" }}>
                  {[
                    { label: "Campanha",  value: campaign.name },
                    { label: "Mestre",    value: campaign.master.email.split("@")[0] },
                    { label: "Jogadores", value: String(campaign.playerCount), icon: <Users size={10} /> },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize: 9, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{f.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#E5E7EB", display: "flex", alignItems: "center", gap: 4 }}>{f.icon}{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Existing character found ── */}
            {foundChar && (
              <section>
                <SectionTitle>Sua Ficha na Campanha</SectionTitle>
                <div style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", borderLeft: "3px solid #7C3AED", borderRadius: "0 2px 2px 0", padding: "16px 18px", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#E5E7EB", marginBottom: 4 }}>{foundChar.nome}</div>
                      <div style={{ display: "flex", gap: 14 }}>
                        <span style={{ fontSize: 11, color: "#A855F7" }}>{foundChar.specialization?.nome ?? "—"}</span>
                        <span style={{ fontSize: 11, color: "#52525B" }}>Nível {foundChar.nivel}</span>
                        <span style={{ fontSize: 11, color: "#EF4444" }}>♥ {foundChar.hpAtual}/{foundChar.hpMax}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "#22C55E", border: "1px solid #14532D", padding: "3px 10px", borderRadius: 2 }}>
                      Já inscrito
                    </div>
                  </div>
                </div>

                {error && (
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 2, padding: "10px 14px", fontSize: 13, color: "#EF4444", marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleEnterExisting}
                  disabled={saving}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    width: "100%", padding: "14px", background: saving ? "#1A1A1A" : "#7C3AED",
                    border: "none", borderRadius: 2, cursor: saving ? "not-allowed" : "pointer",
                    color: "#FFF", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", fontFamily: "Cinzel, serif",
                    boxShadow: saving ? "none" : "0 0 24px rgba(124,58,237,0.35)",
                    transition: "background 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = "#6D28D9"; e.currentTarget.style.boxShadow = "0 0 40px rgba(124,58,237,0.5)"; } }}
                  onMouseLeave={e => { if (!saving) { e.currentTarget.style.background = "#7C3AED"; e.currentTarget.style.boxShadow = "0 0 24px rgba(124,58,237,0.35)"; } }}
                >
                  {saving ? "Carregando…" : <><ChevronRight size={16} /> Acessar Ficha</>}
                </button>
              </section>
            )}

            {/* ── No character yet: Gerar Feiticeiro ── */}
            {showCreationForm && (
              <section>
                <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
                  <p style={{ fontSize: 13, color: "#52525B", margin: "0 0 20px", lineHeight: 1.7 }}>
                    Nenhum personagem encontrado nesta campanha.<br />
                    Clique abaixo para criar sua ficha e escolher classe e origem dentro dela.
                  </p>

                  {error && (
                    <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 2, padding: "10px 14px", fontSize: 13, color: "#EF4444", marginBottom: 16, textAlign: "left" }}>
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleGerarFeiticeiro}
                    disabled={saving}
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 12,
                      padding: "16px 48px", background: saving ? "#1A1A1A" : "#7C3AED",
                      border: "none", borderRadius: 2, cursor: saving ? "not-allowed" : "pointer",
                      color: "#FFF", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em",
                      textTransform: "uppercase", fontFamily: "Cinzel, serif",
                      boxShadow: saving ? "none" : "0 0 32px rgba(124,58,237,0.45), 0 0 60px rgba(124,58,237,0.15)",
                      transition: "background 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = "#6D28D9"; e.currentTarget.style.boxShadow = "0 0 48px rgba(124,58,237,0.6), 0 0 80px rgba(124,58,237,0.2)"; } }}
                    onMouseLeave={e => { if (!saving) { e.currentTarget.style.background = "#7C3AED"; e.currentTarget.style.boxShadow = "0 0 32px rgba(124,58,237,0.45), 0 0 60px rgba(124,58,237,0.15)"; } }}
                  >
                    {saving
                      ? <><div style={{ width: 16, height: 16, border: "2px solid #3F3F46", borderTop: "2px solid #FFF", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Conjurando…</>
                      : <>✦ Gerar Feiticeiro</>
                    }
                  </button>
                </div>
              </section>
            )}

          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
