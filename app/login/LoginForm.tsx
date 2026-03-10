"use client";

import { signIn } from "next-auth/react";
import { Shield } from "lucide-react";

export function LoginForm() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-main relative overflow-hidden">
      {/* Grid background */}
      <div className="bg-grid absolute inset-0 opacity-60" />

      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 w-[600px] h-[600px] pointer-events-none"
        style={{
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, transparent 70%)",
        }}
      />

      {/* Corner decorations */}
      <div className="absolute top-20 left-10 opacity-20">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <path d="M0 60 L0 0 L60 0" stroke="#7C3AED" strokeWidth="1" fill="none" />
          <circle cx="0" cy="0" r="3" fill="#7C3AED" />
        </svg>
      </div>
      <div className="absolute bottom-20 right-10 opacity-20 rotate-180">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <path d="M0 60 L0 0 L60 0" stroke="#7C3AED" strokeWidth="1" fill="none" />
          <circle cx="0" cy="0" r="3" fill="#7C3AED" />
        </svg>
      </div>

      {/* Login card */}
      <div
        className="animate-fade-in-up relative w-[360px] max-w-[calc(100vw-32px)] px-10 py-12 bg-bg-surface border border-border rounded"
      >
        {/* Top border accent */}
        <div
          className="absolute top-0 left-[20%] right-[20%] h-px"
          style={{ background: "linear-gradient(90deg, transparent, #7C3AED, transparent)" }}
        />

        {/* Icon + Title */}
        <div className="flex flex-col items-center gap-5 mb-9">
          <div
            className="animate-pulse-glow relative w-14 h-14 border border-brand flex items-center justify-center"
          >
            {[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h], i) => (
              <div
                key={i}
                className="absolute w-[5px] h-[5px] bg-brand"
                style={{ [v]: "-3px", [h]: "-3px" }}
              />
            ))}
            <Shield size={22} color="#A78BFA" />
          </div>

          <div className="text-center">
            <h1 className="font-cinzel text-glow text-[22px] font-bold tracking-[0.15em] text-white m-0 uppercase">
              J.R.P
            </h1>
            <p className="text-[11px] text-text-faint tracking-[0.12em] uppercase mt-1.5">
              Sistema de RPG
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-7">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-text-faint tracking-[0.1em]">ACESSO</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google Sign In */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-transparent border border-border-strong rounded-sm cursor-pointer text-[#D4D4D8] text-[13px] font-medium tracking-[0.02em] transition-all hover:border-brand hover:bg-[rgba(124,58,237,0.06)]"
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
        <p className="mt-7 text-center text-[10px] text-text-ghost leading-[1.6]">
          Ao entrar, você concorda com os termos<br />de uso do sistema.
        </p>

        {/* Bottom border accent */}
        <div
          className="absolute bottom-0 left-[30%] right-[30%] h-px"
          style={{ background: "linear-gradient(90deg, transparent, #4B1E82, transparent)" }}
        />
      </div>
    </div>
  );
}
