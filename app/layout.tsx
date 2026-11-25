import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SISCOF", template: "%s · SISCOF" },
  description: "SISCOF – Sistema de Controle de Produtos Frigorificados",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#152a4b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
