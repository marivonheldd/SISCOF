"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { criarCategoria } from "@/actions/produtos";
import type { Resultado } from "@/actions/types";

export default function CategoriaForm() {
  const [estado, acao, pendente] = useActionState<Resultado, FormData>(criarCategoria, null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok) form.current?.reset();
  }, [estado]);

  return (
    <form ref={form} action={acao}>
      <label htmlFor="nova-categoria" className="label">
        Nova categoria
      </label>
      <div className="flex gap-2">
        <input id="nova-categoria" name="nome" className="input" placeholder="Ex.: Laticínios" required minLength={2} maxLength={60} />
        <button className="btn-secondary" disabled={pendente} aria-label="Adicionar categoria">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {estado && <p className={`mt-1.5 text-xs ${estado.ok ? "text-emerald-700" : "text-red-600"}`}>{estado.msg}</p>}
    </form>
  );
}
