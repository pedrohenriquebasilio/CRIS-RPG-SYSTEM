"use client";

import { signIn } from "next-auth/react";
import { Shield } from "lucide-react";

export function LoginForm() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0A0A0A",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grid background */}
      <div
        className="bg-grid"
        style={{ position: "absolute", inset: 0, opacity: 0.6 }}
      />

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Corner decorations */}
      <div style={{ position: "absolute", top: "80px", left: "40px", opacity: 0.2 }}>
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <path d="M0 60 L0 0 L60 0" stroke="#7C3AED" strokeWidth="1" fill="none" />
          <circle cx="0" cy="0" r="3" fill="#7C3AED" />
        </svg>
      </div>
      <div style={{ position: "absolute", bottom: "80px", right: "40px", opacity: 0.2, transform: "rotate(180deg)" }}>
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <path d="M0 60 L0 0 L60 0" stroke="#7C3AED" strokeWidth="1" fill="none" />
          <circle cx="0" cy="0" r="3" fill="#7C3AED" />
        </svg>
      </div>

      {/* Login card */}
      <div
        className="animate-fade-in-up"
        style={{
          position: "relative",
          width: "360px",
          padding: "48px 40px",
          backgroundColor: "#111111",
          border: "1px solid #1F1F1F",
          borderRadius: "4px",
        }}
      >
        {/* Top border accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "20%",
            right: "20%",
            height: "1px",
            background: "linear-gradient(90deg, transparent, #7C3AED, transparent)",
          }}
        />

        {/* Icon */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", marginBottom: "36px" }}>
          <div
            className="animate-pulse-glow"
            style={{
              width: "56px",
              height: "56px",
              border: "1px solid #7C3AED",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Corner marks */}
            {[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h], i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  [v]: "-3px",
                  [h]: "-3px",
                  width: "5px",
                  height: "5px",
                  backgroundColor: "#7C3AED",
                }}
              />
            ))}
            <Shield size={22} color="#A78BFA" />
          </div>

          <div style={{ textAlign: "center" }}>
            <h1
              className="font-cinzel text-glow"
              style={{
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "#fff",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              Assistente Fiel
            </h1>
            <p
              style={{
                fontSize: "11px",
                color: "#52525B",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginTop: "6px",
              }}
            >
              Sistema de RPG
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#1F1F1F" }} />
          <span style={{ fontSize: "10px", color: "#52525B", letterSpacing: "0.1em" }}>ACESSO</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#1F1F1F" }} />
        </div>

        {/* Google Sign In */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "12px 20px",
            backgroundColor: "transparent",
            border: "1px solid #27272A",
            borderRadius: "2px",
            cursor: "pointer",
            color: "#D4D4D8",
            fontSize: "13px",
            fontWeight: 500,
            letterSpacing: "0.02em",
            transition: "border-color 0.2s, background-color 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.borderColor = "#7C3AED";
            btn.style.backgroundColor = "rgba(124, 58, 237, 0.06)";
            btn.style.boxShadow = "0 0 20px rgba(124, 58, 237, 0.15)";
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.borderColor = "#27272A";
            btn.style.backgroundColor = "transparent";
            btn.style.boxShadow = "none";
          }}
        >
          {/* Google icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Entrar com Google
        </button>

        {/* Bottom note */}
        <p
          style={{
            marginTop: "28px",
            textAlign: "center",
            fontSize: "10px",
            color: "#3F3F46",
            lineHeight: 1.6,
          }}
        >
          Ao entrar, você concorda com os termos<br />de uso do sistema.
        </p>

        {/* Bottom border accent */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "30%",
            right: "30%",
            height: "1px",
            background: "linear-gradient(90deg, transparent, #4B1E82, transparent)",
          }}
        />
      </div>
    </div>
  );
}
