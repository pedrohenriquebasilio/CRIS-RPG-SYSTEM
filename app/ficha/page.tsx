"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CharacterCreate } from "./CharacterCreate";

function storageKey(userId: string) {
  return `jrp-character-${userId}`;
}

export default function FichaIndexPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    const userId = (session?.user as any)?.backendUserId as string | undefined;
    if (!userId) {
      // Session authenticated but no backend user yet — show creation
      setReady(true);
      return;
    }

    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      try {
        const c = JSON.parse(raw);
        if (c?.id) {
          router.replace(`/ficha/${c.id}`);
          return;
        }
      } catch {
        // malformed, show creation form
      }
    }

    setReady(true);
  }, [status, session, router]);

  if (!ready) {
    return (
      <div style={{
        height: "100vh", background: "#0D0D0D",
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
      }}>
        <div style={{ width: 36, height: 36, border: "2px solid #1F1F1F", borderTop: "2px solid #7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 12, color: "#52525B", letterSpacing: "0.1em" }}>Verificando ficha…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <CharacterCreate />;
}
