"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LogOut, User, Shield, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "FICHA", href: "/ficha" },
  { label: "CAMPANHA", href: "/campanha" },
  { label: "GAME", href: "/game" },
  { label: "TÉCNICAS", href: "/tecnicas" },
  { label: "MALDIÇÕES", href: "/maldicoes" },
  { label: "HABILIDADES", href: "/habilidades" },
  { label: "ARMAS", href: "/armas" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[rgba(10,10,10,0.92)] backdrop-blur-[12px] border-b border-border">
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, #7C3AED, #A78BFA, #7C3AED, transparent)" }}
      />

      <div className="max-w-[1280px] mx-auto px-6 h-[68px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="no-underline flex items-center gap-[10px]">
          <div
            className="w-7 h-7 border border-brand flex items-center justify-center"
            style={{ boxShadow: "0 0 10px rgba(124, 58, 237, 0.4)" }}
          >
            <Shield size={14} color="#A78BFA" />
          </div>
          <span className="font-cinzel text-[13px] font-bold tracking-[0.12em] uppercase rainbow-text">
            J.R.P
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center h-[68px] px-5 text-[11px] font-semibold tracking-[0.12em] no-underline transition-colors border-b-2 ${
                  isActive
                    ? "text-brand-muted border-[#8B5CF6]"
                    : "text-text-mid border-transparent hover:text-[#D4D4D8]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right: User area + mobile hamburger */}
        <div className="flex items-center gap-3">
          {/* User Area */}
          <div className="relative">
            {status === "loading" ? (
              <div className="w-20 h-7 bg-bg-card rounded-sm" />
            ) : session ? (
              <div>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 bg-transparent border border-border-strong px-[10px] py-[5px] cursor-pointer rounded-sm text-text-secondary text-xs transition-colors hover:border-brand"
                >
                  {session.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt="avatar"
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <User size={14} />
                  )}
                  <span className="max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">
                    {session.user?.name?.split(" ")[0]}
                  </span>
                  <ChevronDown
                    size={12}
                    style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                  />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] bg-bg-surface border border-border-strong rounded-sm min-w-[160px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                    <div className="px-3 py-[10px] border-b border-border">
                      <p className="text-[11px] text-text-mid m-0">Conectado como</p>
                      <p className="text-xs text-white m-0 mt-0.5 font-medium">
                        {session.user?.email}
                      </p>
                    </div>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full flex items-center gap-2 px-3 py-[10px] bg-transparent border-none cursor-pointer text-text-secondary text-xs text-left transition-colors hover:text-white hover:bg-bg-card"
                    >
                      <LogOut size={12} />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="text-[11px] font-semibold tracking-[0.08em] no-underline text-brand-muted border border-brand px-[14px] py-[5px] rounded-sm transition-colors hover:bg-[rgba(124,58,237,0.15)]"
              >
                ENTRAR
              </Link>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 text-text-secondary border border-border-strong rounded-sm"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-[rgba(10,10,10,0.97)]">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-6 py-4 text-[11px] font-semibold tracking-[0.12em] no-underline border-l-2 transition-colors ${
                  isActive
                    ? "text-brand-muted border-brand bg-[rgba(124,58,237,0.08)]"
                    : "text-text-mid border-transparent hover:text-[#D4D4D8] hover:border-border-strong"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
