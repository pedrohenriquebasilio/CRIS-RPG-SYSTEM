"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LogOut, User, Shield } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "FICHA", href: "/ficha" },
  { label: "CAMPANHA", href: "/campanha" },
  { label: "TÉCNICAS", href: "/tecnicas" },
  { label: "MALDIÇÕES", href: "/maldicoes" },
  { label: "HABILIDADES", href: "/habilidades" },
  { label: "ARMAS", href: "/armas" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: "rgba(10, 10, 10, 0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1f1f1f",
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, #7C3AED, #A78BFA, #7C3AED, transparent)",
        }}
      />

      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 24px",
          height: "68px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              border: "1px solid #7C3AED",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 10px rgba(124, 58, 237, 0.4)",
            }}
          >
            <Shield size={14} color="#A78BFA" />
          </div>
          <span
            className="font-cinzel"
            style={{
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#fff",
              textTransform: "uppercase",
            }}
          >
            Fiel
          </span>
        </Link>

        {/* Nav Links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "6px 20px",
                  fontSize: "24px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textDecoration: "none",
                  color: isActive ? "#A78BFA" : "#71717A",
                  borderBottom: isActive ? "2px solid #8B5CF6" : "2px solid transparent",
                  transition: "color 0.15s, border-color 0.15s",
                  height: "68px",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.color = "#D4D4D8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.color = "#71717A";
                  }
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User Area */}
        <div style={{ position: "relative" }}>
          {status === "loading" ? (
            <div
              style={{
                width: "80px",
                height: "28px",
                backgroundColor: "#18181B",
                borderRadius: "2px",
              }}
            />
          ) : session ? (
            <div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "none",
                  border: "1px solid #27272A",
                  padding: "5px 10px",
                  cursor: "pointer",
                  borderRadius: "2px",
                  color: "#A1A1AA",
                  fontSize: "12px",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#7C3AED";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#27272A";
                }}
              >
                {session.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt="avatar"
                    style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <User size={14} />
                )}
                <span style={{ maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session.user?.name?.split(" ")[0]}
                </span>
                <ChevronDown size={12} style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>

              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    backgroundColor: "#111111",
                    border: "1px solid #27272A",
                    borderRadius: "2px",
                    minWidth: "160px",
                    overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  }}
                >
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid #1F1F1F" }}>
                    <p style={{ fontSize: "11px", color: "#71717A", margin: 0 }}>Conectado como</p>
                    <p style={{ fontSize: "12px", color: "#fff", margin: "2px 0 0", fontWeight: 500 }}>
                      {session.user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 12px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#A1A1AA",
                      fontSize: "12px",
                      textAlign: "left",
                      transition: "color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#18181B";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#A1A1AA";
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                    }}
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
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textDecoration: "none",
                color: "#A78BFA",
                border: "1px solid #7C3AED",
                padding: "5px 14px",
                borderRadius: "2px",
                transition: "background 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(124, 58, 237, 0.15)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 15px rgba(124, 58, 237, 0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
              }}
            >
              ENTRAR
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
