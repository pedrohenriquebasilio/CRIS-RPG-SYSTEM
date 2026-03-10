"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { CharacterSheet, Character } from "./CharacterSheet";
import { apiCall } from "@/lib/api";
import { mapCharacter } from "@/lib/mapCharacter";

function LoadingScreen() {
  return (
    <div style={{
      height: "100vh",
      background: "#0D0D0D",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 16,
    }}>
      <div style={{
        width: 40, height: 40,
        border: "2px solid #1F1F1F",
        borderTop: "2px solid #7C3AED",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <span style={{ fontSize: 12, color: "#52525B", letterSpacing: "0.1em" }}>Carregando ficha…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={{
      height: "100vh", background: "#0D0D0D",
      display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12,
    }}>
      <span style={{ fontSize: 13, color: "#EF4444" }}>{message}</span>
      <a href="/ficha" style={{ fontSize: 12, color: "#7C3AED", textDecoration: "underline" }}>Voltar</a>
    </div>
  );
}

export default function FichaPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();
  const [character, setCharacter] = useState<Character | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;

    const token = (session?.user as any)?.backendToken as string | undefined;
    if (!token) {
      setError("Sessão inválida. Faça login novamente.");
      return;
    }

    apiCall<any>(`/characters/${id}`, token)
      .then((full) => {
        const character: Character = mapCharacter(full);
        setCharacter(character);
      })
      .catch((e: Error) => {
        // 404 = ficha excluída ou inativa — limpa localStorage e redireciona
        if (e.message?.includes("404")) {
          const userId = (session?.user as any)?.backendUserId as string | undefined;
          if (userId) localStorage.removeItem(`jrp-character-${userId}`);
          window.location.replace("/ficha");
          return;
        }
        setError(e.message ?? "Erro ao carregar ficha.");
      });
  }, [id, session, status]);

  if (status === "loading" || (status === "authenticated" && !character && !error)) {
    return <LoadingScreen />;
  }
  if (status === "unauthenticated") {
    window.location.href = "/login";
    return <LoadingScreen />;
  }
  if (error) return <ErrorScreen message={error} />;
  if (!character) return <LoadingScreen />;

  return <CharacterSheet character={character} />;
}
