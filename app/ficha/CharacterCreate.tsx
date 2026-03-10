"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Shield, ChevronRight, Search, CheckCircle, Users } from "lucide-react";
import type { Character } from "./[id]/CharacterSheet";
import { apiCall } from "@/lib/api";
import { mapCharacter } from "@/lib/mapCharacter";

function storageKey(userId: string) {
  return `jrp-character-${userId}`;
}

type CampaignInfo = { id: string; name: string; master: { email: string }; playerCount: number; inviteCode: string };
type ExistingChar = { id: string; nome: string; nivel: number; specialization: { nome: string } | null; hpAtual: number; hpMax: number };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.16em] font-cinzel">{children}</span>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, #2A2A2A, transparent)" }} />
    </div>
  );
}

export function CharacterCreate() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session?.user as any)?.backendToken as string | undefined;
  const userId = (session?.user as any)?.backendUserId as string | undefined;

  const [inviteCode,   setInviteCode]   = useState("");
  const [verifying,    setVerifying]    = useState(false);
  const [codeError,    setCodeError]    = useState("");
  const [campaign,     setCampaign]     = useState<CampaignInfo | null>(null);
  const [existingChar, setExistingChar] = useState<ExistingChar | null | "none">(null);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function handleVerifyCode() {
    const code = inviteCode.trim();
    if (!code) { setCodeError("Informe o código da campanha."); return; }
    setCodeError("");
    setVerifying(true);
    setCampaign(null);
    setExistingChar(null);

    try {
      if (!token) throw new Error("Faça login para continuar.");

      const camp = await apiCall<CampaignInfo>(`/campaigns/invite/${code}`, token);
      setCampaign(camp);

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

  async function handleEnterExisting() {
    if (!existingChar || existingChar === "none" || !campaign || !token) return;
    setSaving(true);

    try {
      const full = await apiCall<any>(`/characters/${existingChar.id}`, token);
      const character: Character = mapCharacter(full, { campaignId: campaign.id, campaign: { name: campaign.name } });
      if (userId) localStorage.setItem(storageKey(userId), JSON.stringify(character));
      router.push(`/ficha/${full.id}`);
    } catch {
      setError("Erro ao carregar a ficha. Tente novamente.");
      setSaving(false);
    }
  }

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

      const character: Character = mapCharacter(char, { nome: "Novo Feiticeiro", campaignId: campaign.id, campaign: { name: campaign.name } });

      if (userId) localStorage.setItem(storageKey(userId), JSON.stringify(character));
      router.push(`/ficha/${char.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao criar personagem.";
      setError(msg);
      setSaving(false);
    }
  }

  const showCreationForm = campaign !== null && existingChar === "none";
  const foundChar = campaign !== null && existingChar !== null && existingChar !== "none" ? existingChar : null;

  return (
    <div className="min-h-screen bg-bg-dark pt-[calc(68px+32px)] pb-16 px-6 font-sans">
      <div className="bg-grid fixed inset-0 opacity-40 pointer-events-none" />

      <div className="relative max-w-[740px] mx-auto">

        {/* Header */}
        <div className="mb-9 text-center">
          <div className="inline-flex items-center justify-center w-[52px] h-[52px] border border-brand mb-5 relative">
            {(["tl","tr","bl","br"] as const).map(p => (
              <div key={p} className="absolute w-[7px] h-[7px] bg-brand" style={{ top: p.startsWith("t") ? -4 : undefined, bottom: p.startsWith("b") ? -4 : undefined, left: p.endsWith("l") ? -4 : undefined, right: p.endsWith("r") ? -4 : undefined }} />
            ))}
            <Shield size={20} color="#A855F7" />
          </div>
          <h1 className="font-cinzel text-[22px] font-bold text-white tracking-[0.14em] uppercase m-0 mb-2">
            Entrar na Campanha
          </h1>
          <p className="text-[13px] text-text-faint tracking-[0.05em] m-0">
            Insira o código fornecido pelo Mestre
          </p>
        </div>

        {/* Card */}
        <div className="bg-bg-surface border border-border rounded overflow-hidden">
          <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, #7C3AED, transparent)" }} />

          <div className="p-8 sm:px-9 flex flex-col gap-7">

            {/* Step 1: Code input */}
            <section>
              <SectionTitle>Código da Campanha</SectionTitle>
              <div className="flex gap-2.5">
                <input
                  value={inviteCode}
                  onChange={e => { setInviteCode(e.target.value); setCodeError(""); setCampaign(null); setExistingChar(null); }}
                  onKeyDown={e => e.key === "Enter" && handleVerifyCode()}
                  placeholder="Cole o código de convite aqui"
                  maxLength={36}
                  className="ficha-input flex-1 font-cinzel tracking-[0.18em] text-[15px]"
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={verifying || !inviteCode.trim()}
                  className="flex items-center gap-2 px-5 border border-brand rounded-sm cursor-pointer text-brand-light text-xs font-bold tracking-[0.08em] whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:bg-[#1A1A1A]"
                  style={{ background: verifying ? "#1A1A1A" : "rgba(124,58,237,0.15)" }}
                  onMouseEnter={e => { if (!verifying) (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.25)"; }}
                  onMouseLeave={e => { if (!verifying) (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.15)"; }}
                >
                  {verifying
                    ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-border-strong border-t-brand animate-spin-fast" /> Verificando</>
                    : <><Search size={14} /> Verificar</>
                  }
                </button>
              </div>
              {codeError && (
                <p className="text-xs text-[#EF4444] mt-2 mb-0">{codeError}</p>
              )}
            </section>

            {/* Campaign preview */}
            {campaign && (
              <div className="bg-bg-input border border-[#22C55E33] border-l-[3px] border-l-[#22C55E] rounded-r-sm px-4 py-[14px]">
                <div className="flex items-center gap-2 mb-2.5">
                  <CheckCircle size={14} color="#22C55E" />
                  <span className="text-[11px] text-[#22C55E] font-semibold tracking-[0.08em]">Campanha encontrada</span>
                </div>
                <div className="grid grid-cols-3 gap-x-5 gap-y-1.5">
                  {[
                    { label: "Campanha",  value: campaign.name },
                    { label: "Mestre",    value: campaign.master.email.split("@")[0] },
                    { label: "Jogadores", value: String(campaign.playerCount), icon: <Users size={10} /> },
                  ].map(f => (
                    <div key={f.label}>
                      <div className="text-[9px] text-text-faint uppercase tracking-[0.1em] mb-0.5">{f.label}</div>
                      <div className="text-[13px] font-semibold text-text-base flex items-center gap-1">{f.icon}{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing character found */}
            {foundChar && (
              <section>
                <SectionTitle>Sua Ficha na Campanha</SectionTitle>
                <div className="bg-bg-input border border-border border-l-[3px] border-l-brand rounded-r-sm px-[18px] py-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[18px] font-bold text-text-base mb-1">{foundChar.nome}</div>
                      <div className="flex gap-3.5">
                        <span className="text-[11px] text-brand-light">{foundChar.specialization?.nome ?? "—"}</span>
                        <span className="text-[11px] text-text-faint">Nível {foundChar.nivel}</span>
                        <span className="text-[11px] text-[#EF4444]">♥ {foundChar.hpAtual}/{foundChar.hpMax}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#22C55E] border border-[#14532D] px-2.5 py-0.5 rounded-sm">
                      Já inscrito
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-sm px-3.5 py-2.5 text-[13px] text-[#EF4444] mb-4">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleEnterExisting}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 border-none rounded-sm cursor-pointer text-white text-[13px] font-bold tracking-[0.1em] uppercase font-cinzel transition-all disabled:cursor-not-allowed"
                  style={{
                    background: saving ? "#1A1A1A" : "#7C3AED",
                    boxShadow: saving ? "none" : "0 0 24px rgba(124,58,237,0.35)",
                  }}
                  onMouseEnter={e => { if (!saving) { (e.currentTarget as HTMLButtonElement).style.background = "#6D28D9"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 40px rgba(124,58,237,0.5)"; } }}
                  onMouseLeave={e => { if (!saving) { (e.currentTarget as HTMLButtonElement).style.background = "#7C3AED"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(124,58,237,0.35)"; } }}
                >
                  {saving ? "Carregando…" : <><ChevronRight size={16} /> Acessar Ficha</>}
                </button>
              </section>
            )}

            {/* No character yet: Gerar Feiticeiro */}
            {showCreationForm && (
              <section>
                <div className="text-center pt-3 pb-1">
                  <p className="text-[13px] text-text-faint m-0 mb-5 leading-[1.7]">
                    Nenhum personagem encontrado nesta campanha.<br />
                    Clique abaixo para criar sua ficha e escolher classe e origem dentro dela.
                  </p>

                  {error && (
                    <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-sm px-3.5 py-2.5 text-[13px] text-[#EF4444] mb-4 text-left">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleGerarFeiticeiro}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-3 px-12 py-4 border-none rounded-sm cursor-pointer text-white text-[14px] font-bold tracking-[0.12em] uppercase font-cinzel transition-all disabled:cursor-not-allowed w-full sm:w-auto"
                    style={{
                      background: saving ? "#1A1A1A" : "#7C3AED",
                      boxShadow: saving ? "none" : "0 0 32px rgba(124,58,237,0.45), 0 0 60px rgba(124,58,237,0.15)",
                    }}
                    onMouseEnter={e => { if (!saving) { (e.currentTarget as HTMLButtonElement).style.background = "#6D28D9"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 48px rgba(124,58,237,0.6), 0 0 80px rgba(124,58,237,0.2)"; } }}
                    onMouseLeave={e => { if (!saving) { (e.currentTarget as HTMLButtonElement).style.background = "#7C3AED"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 32px rgba(124,58,237,0.45), 0 0 60px rgba(124,58,237,0.15)"; } }}
                  >
                    {saving
                      ? <><div className="w-4 h-4 rounded-full border-2 border-border-strong border-t-white animate-spin-fast" /> Conjurando…</>
                      : <>✦ Gerar Feiticeiro</>
                    }
                  </button>
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
