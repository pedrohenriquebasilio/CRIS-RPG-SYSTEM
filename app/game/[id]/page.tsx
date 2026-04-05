"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GameMap } from "./GameMap";

export default function GameMapPage() {
  const { id: campaignId } = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const router = useRouter();
  const backendToken = (session?.user as any)?.backendToken as string | undefined;
  const userId = (session?.user as any)?.backendUserId as string | undefined;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && backendToken) setReady(true);
  }, [status, backendToken, router]);

  if (!ready || !backendToken || !userId || !campaignId) {
    return (
      <div className="h-screen pt-[68px] bg-bg-dark flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <GameMap campaignId={campaignId} backendToken={backendToken} userId={userId} />;
}
