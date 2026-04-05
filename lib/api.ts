import { signOut } from "next-auth/react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function apiCall<T = unknown>(
  path: string,
  token: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    await signOut({ callbackUrl: "/login" });
    throw new Error("Sessão expirada. Redirecionando para login...");
  }

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`API ${options.method ?? "GET"} ${path} → ${res.status}: ${err}`);
  }

  return res.json() as Promise<T>;
}
