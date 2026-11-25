"use client";

import { useActionState } from "react";
import { LogIn, AlertCircle } from "lucide-react";
import { entrar, type EstadoLogin } from "@/actions/auth";

export default function LoginForm() {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(entrar, null);

  return (
    <form action={acao} className="space-y-4">
      <div>
        <label htmlFor="login" className="label label-req">
          Usuário
        </label>
        <input
          id="login"
          name="login"
          className="input lowercase"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={30}
        />
      </div>
      <div>
        <label htmlFor="senha" className="label label-req">
          Senha
        </label>
        <input id="senha" name="senha" type="password" className="input" autoComplete="current-password" required />
      </div>
      {estado?.erro && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {estado.erro}
        </div>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pendente}>
        <LogIn className="h-4 w-4" />
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
