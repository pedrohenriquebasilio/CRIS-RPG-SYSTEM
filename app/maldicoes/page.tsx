"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api";
import { Skull, Users, ChevronRight, Heart, Zap } from "lucide-react";
import Link from "next/link";

interface Attrs { FOR: number; AGI: number; VIG: number; INT: number; PRE: number }

interface MobCharacter {
  id: string;
  nome: string;
  nivel: number;
  hpAtual: number;
  hpMax: number;
  energiaAtual: number;
  energiaMax: number;
  isMob: boolean;
  isApproved: boolean;
  specialization: { nome: string } | null;
  attributes: Attrs | null;
  campaign?: { id: string; name: string };
}

interface Campaign {
  id: string;
  name: string;
  characters: MobCharacter[];
}

function hpColor(cur: number, max: number) {
  const pct = max > 0 ? cur / max : 0;
  if (pct > 0.6) return "#EF4444";
  if (pct > 0.3) return "#F97316";
  return "#7F1D1D";
}

function MobCard({ mob, campaignName }: { mob: MobCharacter; campaignName: string }) {
  const hpPct = mob.hpMax > 0 ? (mob.hpAtual / mob.hpMax) * 100 : 0;
  const enPct = mob.energiaMax > 0 ? (mob.energiaAtual / mob.energiaMax) * 100 : 0;
  const attrs = mob.attributes;

  // Deterministic reddish hue from mob id
  const hue = mob.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 40; // 0-40 range = red-orange

  return (
    <div style={{
      background: "#0F0F0F",
      border: "1px solid #1F1F1F",
      borderRadius: 4,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      transition: "border-color 0.2s",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#EF4444")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1F1F1F")}
    >
      {/* Banner */}
      <div style={{
        width: "100%",
        aspectRatio: "16/7",
        background: `radial-gradient(ellipse at 40% 50%, hsl(${hue},55%,14%) 0%, #0A0A0A 70%)`,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }} />
        <div style={{
          width: 52, height: 52,
          border: `1px solid hsl(${hue},55%,30%)`,
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0.6,
          boxShadow: `0 0 20px hsl(${hue},55%,20%)`,
        }}>
          <Skull size={22} color={`hsl(${hue},65%,55%)`} />
        </div>
        {/* Campaign badge */}
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: "rgba(0,0,0,0.6)", border: "1px solid #27272A",
          padding: "2px 8px", borderRadius: 2,
          fontSize: 9, color: "#6B7280", letterSpacing: "0.08em",
        }}>
          {campaignName}
        </div>
        {/* Mob badge */}
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: "rgba(127,29,29,0.5)", border: "1px solid #991B1B",
          padding: "2px 8px", borderRadius: 2,
          fontSize: 9, fontWeight: 700, color: "#FCA5A5", letterSpacing: "0.1em",
        }}>
          MOB
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Name + class */}
        <div>
          <h2 className="font-cinzel" style={{ fontSize: 15, fontWeight: 700, color: "#F3F4F6", margin: "0 0 3px", letterSpacing: "0.05em" }}>
            {mob.nome}
          </h2>
          <div style={{ fontSize: 11, color: "#52525B" }}>
            {mob.specialization?.nome ?? "Sem classe"} · Nív. {mob.nivel}
          </div>
        </div>

        {/* Attrs */}
        {attrs && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4 }}>
            {(["AGI","FOR","INT","PRE","VIG"] as (keyof Attrs)[]).map(k => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 8, color: "#52525B", letterSpacing: "0.1em", marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF" }}>{attrs[k]}</div>
              </div>
            ))}
          </div>
        )}

        {/* Bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: "#52525B", display: "flex", alignItems: "center", gap: 4 }}><Heart size={8} /> VIDA</span>
              <span style={{ fontSize: 9, color: "#6B7280" }}>{mob.hpAtual}/{mob.hpMax}</span>
            </div>
            <div style={{ height: 6, background: "#1A1A1A", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${hpPct}%`, height: "100%", background: hpColor(mob.hpAtual, mob.hpMax) }} />
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: "#52525B", display: "flex", alignItems: "center", gap: 4 }}><Zap size={8} /> ENERGIA</span>
              <span style={{ fontSize: 9, color: "#6B7280" }}>{mob.energiaAtual}/{mob.energiaMax}</span>
            </div>
            <div style={{ height: 6, background: "#1A1A1A", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${enPct}%`, height: "100%", background: "#7C3AED" }} />
            </div>
          </div>
        </div>

        <Link
          href={`/ficha/${mob.id}`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 0",
            background: "transparent",
            border: "1px solid #27272A",
            borderRadius: 2,
            color: "#71717A",
            fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
            textDecoration: "none",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#EF4444"; (e.currentTarget as HTMLAnchorElement).style.color = "#FCA5A5"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#27272A"; (e.currentTarget as HTMLAnchorElement).style.color = "#71717A"; }}
        >
          Ver Ficha <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}

export default function MaldicoesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token  = (session?.user as any)?.backendToken as string | undefined;

  const [mobs, setMobs]       = useState<{ mob: MobCharacter; campaignName: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status !== "authenticated" || !token) return;

    apiCall<Campaign[]>("/campaigns", token)
      .then(campaigns => {
        const all: { mob: MobCharacter; campaignName: string }[] = [];
        for (const camp of campaigns) {
          for (const char of camp.characters ?? []) {
            if (char.isMob) all.push({ mob: char, campaignName: camp.name });
          }
        }
        setMobs(all);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, token, router]);

  if (status === "loading" || loading) {
    return (
      <div style={{ height: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <div style={{ width: 36, height: 36, border: "2px solid #1F1F1F", borderTop: "2px solid #EF4444", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 12, color: "#52525B", letterSpacing: "0.1em" }}>Carregando maldições…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", paddingTop: "calc(68px + 32px)", paddingBottom: 60 }}>
      <div className="bg-grid" style={{ position: "fixed", inset: 0, opacity: 0.3, pointerEvents: "none" }} />

      <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 10, color: "#52525B", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "Cinzel, serif" }}>
            Entidades & Criaturas
          </p>
          <h1 className="font-cinzel" style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "0.08em" }}>
            Maldições
          </h1>
        </div>

        {mobs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", border: "1px dashed #1F1F1F", borderRadius: 4 }}>
            <Skull size={36} color="#27272A" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 14, color: "#52525B", margin: "0 0 6px" }}>Nenhuma maldição encontrada.</p>
            <p style={{ fontSize: 12, color: "#3F3F46", margin: 0 }}>
              Mobs são criados pelo Mestre dentro de uma campanha.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {mobs.map(({ mob, campaignName }) => (
              <MobCard key={mob.id} mob={mob} campaignName={campaignName} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
