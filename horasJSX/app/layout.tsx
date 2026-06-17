import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/hooks/use-auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control de Horas",
  description: "SaaS multi-tenant para control de horas trabajadas.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
