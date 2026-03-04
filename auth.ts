import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL!;

async function getBackendToken(email: string, providerAccountId: string) {
  const password = `${providerAccountId}_fiel_rpg`;

  const loginRes = await fetch(`${BACKEND}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (loginRes.ok) {
    const data = await loginRes.json();
    return { token: data.access_token as string, userId: data.user.id as string };
  }

  if (loginRes.status === 401) {
    const regRes = await fetch(`${BACKEND}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role: "PLAYER" }),
    });
    if (!regRes.ok) return null;

    const loginRes2 = await fetch(`${BACKEND}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!loginRes2.ok) return null;

    const data = await loginRes2.json();
    return { token: data.access_token as string, userId: data.user.id as string };
  }

  return null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.provider === "google" && account.providerAccountId) {
        try {
          const result = await getBackendToken(user.email!, account.providerAccountId);
          if (result) {
            token.backendToken = result.token;
            token.backendUserId = result.userId;
          }
        } catch {
          // Backend unavailable — continue without backend token
        }
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).provider = token.provider;
        (session.user as any).backendToken = token.backendToken;
        (session.user as any).backendUserId = token.backendUserId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
