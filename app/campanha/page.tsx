"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api";
import { Shield, Users, ChevronRight, Plus, X, Swords } from "lucide-react";
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

function CampaignCard({ campaign, token, userId }: { campaign: Campaign; token: string; userId: string }) {
  const isMaster = campaign.master.id === userId;

  // Deterministic gradient from campaign id
  const hue = campaign.id
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div style={{
      background: "#111111",
      border: "1px solid #1F1F1F",
      borderRadius: 4,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      transition: "border-color 0.2s",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#7C3AED")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1F1F1F")}
    >
      {/* Campaign image placeholder */}
      <div style={{
        width: "100%",
        aspectRatio: "16/9",
        background: `radial-gradient(ellipse at 30% 40%, hsl(${hue},40%,18%) 0%, #0A0A0A 70%)`,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />
        {/* Center rune */}
        <div style={{
          width: 64, height: 64,
          border: `1px solid hsl(${hue},50%,35%)`,
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0.5,
          boxShadow: `0 0 24px hsl(${hue},50%,25%)`,
        }}>
          <Shield size={24} color={`hsl(${hue},60%,55%)`} />
        </div>
        {/* Active combat badge */}
        {campaign.isActiveCombat && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            background: "#991B1B", border: "1px solid #EF4444",
            padding: "2px 8px", borderRadius: 2,
            fontSize: 9, fontWeight: 700, color: "#FCA5A5", letterSpacing: "0.1em",
          }}>
            EM COMBATE
          </div>
        )}
        {/* Master badge */}
        {isMaster && (
          <div style={{
            position: "absolute", top: 10, left: 10,
            background: "rgba(124,58,237,0.25)", border: "1px solid #7C3AED",
            padding: "2px 8px", borderRadius: 2,
            fontSize: 9, fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em",
          }}>
            MESTRE
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <h2 className="font-cinzel" style={{
            fontSize: 17, fontWeight: 700, color: "#F3F4F6",
            margin: "0 0 4px", letterSpacing: "0.05em",
          }}>
            {campaign.name}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={11} color="#52525B" />
            <span style={{ fontSize: 11, color: "#52525B" }}>
              {campaign._count?.characters ?? 0} agente(s) · Mestre: {campaign.master.email.split("@")[0]}
            </span>
          </div>
        </div>

        <Link
          href={`/campanha/${campaign.id}`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "9px 0",
            background: "#7C3AED",
            color: "#fff",
            textDecoration: "none",
            fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            borderRadius: 2,
            fontFamily: "Cinzel, serif",
            boxShadow: "0 0 16px rgba(124,58,237,0.3)",
            transition: "background 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "#6D28D9";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 28px rgba(124,58,237,0.5)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "#7C3AED";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 16px rgba(124,58,237,0.3)";
          }}
        >
          Acessar <ChevronRight size={14} />
        </Link>
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
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div style={{
        background: "#111111",
        border: "1px solid #27272A",
        borderRadius: 6,
        padding: "32px 28px",
        width: "100%", maxWidth: 420,
        position: "relative",
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Swords size={18} color="#7C3AED" />
            <h2 className="font-cinzel" style={{ fontSize: 16, fontWeight: 700, color: "#F3F4F6", margin: 0, letterSpacing: "0.08em" }}>
              Nova Campanha
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#52525B", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, color: "#71717A", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8, fontFamily: "Cinzel, serif" }}>
              Nome da Campanha
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: A Maldição de Ferro..."
              maxLength={80}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#0A0A0A", border: "1px solid #27272A",
                borderRadius: 3, padding: "10px 12px",
                color: "#F3F4F6", fontSize: 14,
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = "#7C3AED")}
              onBlur={e => (e.target.style.borderColor = "#27272A")}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: "#F87171", margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "10px 0",
              background: saving || !name.trim() ? "#3B0764" : "#7C3AED",
              border: "none", borderRadius: 3,
              color: saving || !name.trim() ? "#6D28D9" : "#fff",
              fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
              fontFamily: "Cinzel, serif",
              cursor: saving || !name.trim() ? "not-allowed" : "pointer",
              transition: "background 0.15s",
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
      <div style={{ height: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <div style={{ width: 36, height: 36, border: "2px solid #1F1F1F", borderTop: "2px solid #7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 12, color: "#52525B", letterSpacing: "0.1em" }}>Carregando campanhas…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", paddingTop: "calc(68px + 32px)", paddingBottom: 60 }}>
      <div className="bg-grid" style={{ position: "fixed", inset: 0, opacity: 0.4, pointerEvents: "none" }} />

      {showCreate && token && (
        <CreateCampaignModal
          token={token}
          onClose={() => setShowCreate(false)}
          onCreated={c => { setCampaigns(prev => [...prev, c]); setShowCreate(false); }}
        />
      )}

      <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
          <div>
            <p style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "Cinzel, serif" }}>
              Suas mesas
            </p>
            <h1 className="font-cinzel" style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "0.08em" }}>
              Campanhas
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 16px",
                background: "#7C3AED",
                border: "none",
                borderRadius: 2,
                color: "#fff",
                fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                fontFamily: "Cinzel, serif",
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(124,58,237,0.3)",
                transition: "background 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#6D28D9"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(124,58,237,0.5)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#7C3AED"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(124,58,237,0.3)"; }}
            >
              <Plus size={13} /> Criar Campanha
            </button>
            <Link
              href="/ficha"
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid #27272A",
                borderRadius: 2,
                color: "#A1A1AA",
                fontSize: 12, fontWeight: 600, letterSpacing: "0.06em",
                textDecoration: "none",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#7C3AED"; (e.currentTarget as HTMLAnchorElement).style.color = "#A78BFA"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#27272A"; (e.currentTarget as HTMLAnchorElement).style.color = "#A1A1AA"; }}
            >
              <Plus size={13} /> Entrar em campanha
            </Link>
          </div>
        </div>

        {/* Grid */}
        {campaigns.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "80px 24px",
            border: "1px dashed #1F1F1F", borderRadius: 4,
          }}>
            <Shield size={36} color="#27272A" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 14, color: "#52525B", margin: "0 0 6px" }}>Nenhuma campanha encontrada.</p>
            <p style={{ fontSize: 12, color: "#3F3F46", margin: 0 }}>
              Peça um código ao Mestre e acesse pelo menu <strong style={{ color: "#71717A" }}>Ficha</strong>.
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}>
            {campaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} token={token!} userId={userId ?? ""} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
