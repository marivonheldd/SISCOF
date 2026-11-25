"use client";

import { AlertTriangle, RotateCw } from "lucide-react";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-6 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
      <h1 className="mt-3 text-lg font-semibold text-marinho-900">Não foi possível carregar esta página</h1>
      <p className="mt-2 text-sm text-slate-600">
        Verifique a conexão com a internet. Se o problema continuar, confira se as variáveis SUPABASE_URL e
        SUPABASE_SERVICE_ROLE_KEY estão configuradas e se o arquivo <code>supabase/schema.sql</code> foi executado.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Código: {error.digest}</p>}
      <button onClick={reset} className="btn-primary mt-5">
        <RotateCw className="h-4 w-4" /> Tentar novamente
      </button>
    </div>
  );
}
