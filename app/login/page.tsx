import type { Metadata } from "next";
import { Snowflake } from "lucide-react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-marinho-950 via-marinho-900 to-marinho-700 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <Snowflake className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">SISCOF</h1>
          <p className="mt-1 text-sm text-marinho-200">Sistema de Controle de Produtos Frigorificados</p>
        </div>
        <div className="card p-6">
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-marinho-200">Acesso restrito a pessoal autorizado.</p>
      </div>
    </main>
  );
}
