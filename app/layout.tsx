import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "J.R.P — Sistema RPG",
  description: "Sistema de gerenciamento de campanhas de RPG.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <Providers session={session}>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
