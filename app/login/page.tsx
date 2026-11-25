import type { Metadata } from "next";
import { Snowflake, AlertTriangle } from "lucide-react";
import { diagnosticar } from "@/lib/diagnostico";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const problemas = await diagnosticar();
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
        {problemas.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
            <p className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Configuração incompleta
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              Depois de corrigir as variáveis na Vercel, faça um novo deploy (Deployments → ⋯ → Redeploy).
            </p>
          </div>
        )}
        <div className="card p-6">
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-marinho-200">Acesso restrito a pessoal autorizado.</p>
      </div>
    </main>
  );
}
