"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dices, Save, UserPlus } from "lucide-react";
import { atualizarUsuario, criarUsuario, redefinirSenha } from "@/actions/usuarios";
import type { Resultado } from "@/actions/types";
import { PERFIS, type Perfil } from "@/lib/perfis";
import { Alerta } from "@/components/ui";

/** Senha provisória fácil de ditar: 4 letras + 4 números, sem caracteres ambíguos. */
function gerarProvisoria() {
  const L = "abcdefghjkmnpqrstuvwxyz", D = "23456789";
  const r = new Uint32Array(8);
  crypto.getRandomValues(r);
  return Array.from(r, (n, i) => (i < 4 ? L[n % L.length] : D[n % D.length])).join("");
}

function CampoSenhaProvisoria() {
  const [senha, setSenha] = useState("");
  return (
    <div>
      <label htmlFor="senha" className="label label-req">
        Senha provisória
      </label>
      <div className="flex gap-2">
        <input
          id="senha"
          name="senha"
          className="input font-mono"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={8}
          maxLength={72}
          autoComplete="off"
        />
        <button type="button" className="btn-secondary" onClick={() => setSenha(gerarProvisoria())} title="Gerar senha">
          <Dices className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">Passe para a pessoa; ela cria a própria senha no primeiro acesso.</p>
    </div>
  );
}

function SelectPerfil({ valor }: { valor?: Perfil }) {
  return (
    <div>
      <label htmlFor="perfil" className="label label-req">
        Perfil de acesso
      </label>
      <select id="perfil" name="perfil" defaultValue={valor ?? "operador"} className="input" required>
        {Object.entries(PERFIS).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NovoUsuarioForm() {
  const [estado, acao, pendente] = useActionState<Resultado, FormData>(criarUsuario, null);
  const form = useRef<HTMLFormElement>(null);
  const [chave, setChave] = useState(0);
  useEffect(() => {
    if (estado?.ok) {
      form.current?.reset();
      setChave((c) => c + 1);
    }
  }, [estado]);

  return (
    <form ref={form} action={acao} className="space-y-4">
      <div>
        <label htmlFor="nome" className="label label-req">
          Nome completo
        </label>
        <input id="nome" name="nome" className="input" required minLength={2} maxLength={80} />
      </div>
      <div>
        <label htmlFor="login" className="label label-req">
          Usuário (para entrar)
        </label>
        <input
          id="login"
          name="login"
          className="input font-mono lowercase"
          placeholder="ex.: maria.silva"
          required
          pattern="[a-zA-Z0-9._\-]{3,30}"
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>
      <SelectPerfil />
      <CampoSenhaProvisoria key={chave} />
      {estado && <Alerta tom={estado.ok ? "verde" : "vermelho"}>{estado.msg}</Alerta>}
      <button className="btn-primary w-full" disabled={pendente}>
        <UserPlus className="h-4 w-4" />
        {pendente ? "Cadastrando..." : "Cadastrar pessoa"}
      </button>
    </form>
  );
}

type Usuario = { id: string; nome: string; login: string; perfil: Perfil; ativo: boolean };

export function EditarUsuarioForm({ usuario, ehVoce }: { usuario: Usuario; ehVoce: boolean }) {
  const [estado, acao, pendente] = useActionState<Resultado, FormData>(atualizarUsuario, null);
  const router = useRouter();
  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={usuario.id} />
      <p className="text-sm text-slate-500">
        Usuário: <span className="font-mono font-semibold text-slate-700">{usuario.login}</span>
      </p>
      <div>
        <label htmlFor="enome" className="label label-req">
          Nome completo
        </label>
        <input id="enome" name="nome" defaultValue={usuario.nome} className="input" required minLength={2} maxLength={80} />
      </div>
      <SelectPerfil valor={usuario.perfil} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={usuario.ativo}
          disabled={ehVoce}
          className="h-4 w-4 rounded border-slate-300"
        />
        Conta ativa (desmarque para impedir o acesso)
      </label>
      {ehVoce && <input type="hidden" name="ativo" value="on" />}
      {estado && <Alerta tom={estado.ok ? "verde" : "vermelho"}>{estado.msg}</Alerta>}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={pendente}>
          <Save className="h-4 w-4" />
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <Link href="/usuarios" className="btn-secondary">
          Voltar
        </Link>
      </div>
    </form>
  );
}

export function RedefinirSenhaForm({ id }: { id: string }) {
  const [estado, acao, pendente] = useActionState<Resultado, FormData>(redefinirSenha, null);
  const router = useRouter();
  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-slate-500">
        Use quando a pessoa esquecer a senha ou a conta estiver bloqueada. As sessões abertas dela são encerradas.
      </p>
      <CampoSenhaProvisoria />
      {estado && <Alerta tom={estado.ok ? "verde" : "vermelho"}>{estado.msg}</Alerta>}
      <button className="btn-secondary w-full" disabled={pendente}>
        {pendente ? "Salvando..." : "Definir senha provisória"}
      </button>
    </form>
  );
}
