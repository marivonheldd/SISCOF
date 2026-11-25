"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { trocarMinhaSenha } from "@/actions/usuarios";
import type { Resultado } from "@/actions/types";
import { Alerta } from "@/components/ui";

export default function TrocarSenhaForm({ rotuloAtual = "Senha atual" }: { rotuloAtual?: string }) {
  const [estado, acao, pendente] = useActionState<Resultado, FormData>(trocarMinhaSenha, null);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (estado?.ok) {
      form.current?.reset();
      router.refresh();
    }
  }, [estado, router]);

  return (
    <form ref={form} action={acao} className="space-y-4">
      <div>
        <label htmlFor="atual" className="label label-req">
          {rotuloAtual}
        </label>
        <input id="atual" name="atual" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div>
        <label htmlFor="nova" className="label label-req">
          Nova senha
        </label>
        <input id="nova" name="nova" type="password" className="input" autoComplete="new-password" required minLength={8} maxLength={72} />
        <p className="mt-1 text-xs text-slate-500">Mínimo de 8 caracteres, com letras e números.</p>
      </div>
      <div>
        <label htmlFor="confirma" className="label label-req">
          Confirme a nova senha
        </label>
        <input id="confirma" name="confirma" type="password" className="input" autoComplete="new-password" required />
      </div>
      {estado && <Alerta tom={estado.ok ? "verde" : "vermelho"}>{estado.msg}</Alerta>}
      <button className="btn-primary w-full" disabled={pendente}>
        <KeyRound className="h-4 w-4" />
        {pendente ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
