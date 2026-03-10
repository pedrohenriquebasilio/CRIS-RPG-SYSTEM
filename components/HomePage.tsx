"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { Shield, Swords, BookOpen, Skull, Zap } from "lucide-react";

interface HomePageProps {
  session: Session | null;
}

const QUICK_LINKS = [
  {
    href: "/ficha",
    icon: BookOpen,
    label: "Ficha",
    desc: "Gerencie seus atributos, perícias e aptidões",
    color: "#7C3AED",
  },
  {
    href: "/campanha",
    icon: Shield,
    label: "Campanha",
    desc: "Entre em campanhas, crie combates, controle a mesa",
    color: "#6D28D9",
  },
  {
    href: "/maldicoes",
    icon: Skull,
    label: "Maldições",
    desc: "Condições e efeitos que afetam o combate",
    color: "#8B5CF6",
  },
  {
    href: "/habilidades",
    icon: Zap,
    label: "Habilidades",
    desc: "Técnicas, aptidões e especializações",
    color: "#A78BFA",
  },
  {
    href: "/armas",
    icon: Swords,
    label: "Armas",
    desc: "Inventário de armas com dados de dano e crítico",
    color: "#7C3AED",
  },
];

export function HomePage({ session }: HomePageProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0A0A0A",
        paddingTop: "68px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient grid */}
      <div
        className="bg-grid"
        style={{ position: "absolute", inset: 0, opacity: 0.5 }}
      />

      {/* Top radial glow */}
      <div
        style={{
          position: "absolute",
          top: "0",
          left: "50%",
          transform: "translateX(-50%)",
          width: "900px",
          height: "500px",
          background: "radial-gradient(ellipse at top, rgba(109, 40, 217, 0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Decorative vertical lines */}
      <div style={{ position: "absolute", left: "15%", top: 0, bottom: 0, width: "1px", background: "linear-gradient(to bottom, transparent, rgba(124, 58, 237, 0.08), transparent)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: "15%", top: 0, bottom: 0, width: "1px", background: "linear-gradient(to bottom, transparent, rgba(124, 58, 237, 0.08), transparent)", pointerEvents: "none" }} />

      {/* Hero Section */}
      <section
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "420px",
          padding: "60px 24px 40px",
          textAlign: "center",
        }}
      >
        {/* Rune circle */}
        <div
          className="animate-rune"
          style={{
            position: "absolute",
            width: "300px",
            height: "300px",
            border: "1px solid rgba(124, 58, 237, 0.07)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "220px",
            height: "220px",
            border: "1px solid rgba(124, 58, 237, 0.05)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        {/* Shield icon */}
        <div
          className="animate-fade-in delay-100 animate-pulse-glow"
          style={{
            width: "64px",
            height: "64px",
            border: "1px solid #7C3AED",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "28px",
            position: "relative",
          }}
        >
          {[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h], i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                [v]: "-4px",
                [h]: "-4px",
                width: "7px",
                height: "7px",
                backgroundColor: "#7C3AED",
              }}
            />
          ))}
          <Shield size={26} color="#A78BFA" />
        </div>

        {/* Title */}
        <h1
          className="font-cinzel text-glow animate-fade-in delay-200 rainbow-text"
          style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 900,
            letterSpacing: "0.15em",
            color: "transparent",
            textTransform: "uppercase",
            margin: "0 0 12px",
            lineHeight: 1.1,
          }}
        >
          J.R.P
        </h1>

        <p
          className="animate-fade-in delay-300"
          style={{
            fontSize: "12px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#52525B",
            margin: "0 0 32px",
          }}
        >
          Sistema de RPG — Feiticeiros e Maldições
        </p>

        {/* Status indicator */}
        <div
          className="animate-fade-in delay-400"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: session ? "#22C55E" : "#7C3AED",
              boxShadow: session ? "0 0 6px #22C55E" : "0 0 6px #7C3AED",
            }}
          />
          <span style={{ fontSize: "11px", color: "#71717A", letterSpacing: "0.08em" }}>
            {session ? `Conectado como ${session.user?.name?.split(" ")[0]}` : "Não autenticado"}
          </span>
        </div>

        {/* CTA */}
        {!session ? (
          <Link
            href="/login"
            className="animate-fade-in delay-500"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 28px",
              backgroundColor: "#7C3AED",
              color: "#fff",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              borderRadius: "2px",
              transition: "background-color 0.2s, box-shadow 0.2s",
              boxShadow: "0 0 20px rgba(124, 58, 237, 0.35)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#6D28D9";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 40px rgba(124, 58, 237, 0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#7C3AED";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 20px rgba(124, 58, 237, 0.35)";
            }}
          >
            <Shield size={13} />
            Entrar no Sistema
          </Link>
        ) : (
          <Link
            href="/campanha"
            className="animate-fade-in delay-500"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 28px",
              backgroundColor: "#7C3AED",
              color: "#fff",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              borderRadius: "2px",
              boxShadow: "0 0 20px rgba(124, 58, 237, 0.35)",
              transition: "background-color 0.2s, box-shadow 0.2s",
            }}
          >
            <Swords size={13} />
            Ver Campanhas
          </Link>
        )}
      </section>

      {/* Divider */}
      <div
        className="animate-fade-in delay-500"
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          marginBottom: "40px",
        }}
      >
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #27272A)" }} />
        <span style={{ fontSize: "10px", color: "#3F3F46", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Cinzel, serif" }}>Módulos</span>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #27272A)" }} />
      </div>

      {/* Module cards */}
      <section
        className="animate-fade-in delay-600"
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 24px 80px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1px",
          backgroundColor: "#1A1A1A",
          border: "1px solid #1A1A1A",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                padding: "24px 20px",
                backgroundColor: "#0A0A0A",
                textDecoration: "none",
                transition: "background-color 0.15s",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.backgroundColor = "#111111";
                const accent = el.querySelector(".card-accent") as HTMLElement;
                if (accent) accent.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.backgroundColor = "#0A0A0A";
                const accent = el.querySelector(".card-accent") as HTMLElement;
                if (accent) accent.style.opacity = "0";
              }}
            >
              {/* Left accent bar (hidden by default, shows on hover) */}
              <div
                className="card-accent"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "2px",
                  backgroundColor: item.color,
                  opacity: 0,
                  transition: "opacity 0.15s",
                  boxShadow: `0 0 8px ${item.color}`,
                }}
              />

              {/* Icon */}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  border: `1px solid ${item.color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "2px",
                }}
              >
                <Icon size={16} color={item.color} />
              </div>

              {/* Text */}
              <div>
                <p
                  className="font-cinzel"
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#FFFFFF",
                    margin: "0 0 6px",
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#71717A",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {item.desc}
                </p>
              </div>

              {/* Arrow */}
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  right: "16px",
                  fontSize: "16px",
                  color: "#27272A",
                }}
              >
                →
              </div>
            </Link>
          );
        })}
      </section>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #111111",
          padding: "20px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "10px", color: "#3F3F46", letterSpacing: "0.1em" }}>
          J.R.P — SISTEMA RPG © 2026
        </p>
      </div>
    </div>
  );
}
