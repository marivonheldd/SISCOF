import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, ShieldCheck, UserPlus, Users } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDataHora } from "@/lib/format";
import { DESCRICAO_PERFIL, PERFIS, type Perfil } from "@/lib/perfis";
import { Badge, Card, PageHeader, TabelaWrap, Vazio } from "@/components/ui";
import { NovoUsuarioForm, EditarUsuarioForm, RedefinirSenhaForm } from "./Forms";

export const metadata: Metadata = { title: "Usuários" };

type U = {
  id: string;
  nome: string;
  login: string;
  perfil: Perfil;
  ativo: boolean;
  trocar_senha: boolean;
  bloqueado_ate: string | null;
  ultimo_acesso: string | null;
};

const TOM: Record<Perfil, "azul" | "verde" | "cinza"> = { admin: "azul", operador: "verde", consulta: "cinza" };

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const eu = await exigirSessao("admin");
  const sp = await searchParams;
  const { data, error } = await db()
    .from("usuarios")
    .select("id, nome, login, perfil, ativo, trocar_senha, bloqueado_ate, ultimo_acesso")
    .order("ativo", { ascending: false })
    .order("nome");
  const lista = (data ?? []) as U[];
  const editando = lista.find((u) => u.id === sp.editar);
  const agora = Date.now();

  return (
    <>
      <PageHeader titulo="Usuários" descricao="Cadastro das pessoas que acessam o SISCOF e do que cada uma pode fazer." />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          {editando ? (
            <>
              <Card titulo={`Editar: ${editando.nome}`} icone={Pencil}>
                <EditarUsuarioForm key={editando.id} usuario={editando} ehVoce={editando.id === eu.id} />
              </Card>
              <Card titulo="Redefinir senha" icone={ShieldCheck}>
                <RedefinirSenhaForm key={editando.id} id={editando.id} />
              </Card>
            </>
          ) : (
            <Card titulo="Cadastrar pessoa" icone={UserPlus}>
              <NovoUsuarioForm />
            </Card>
          )}
          <Card titulo="Perfis de acesso" icone={ShieldCheck}>
            <dl className="space-y-3 text-sm">
              {(Object.keys(PERFIS) as Perfil[]).map((p) => (
                <div key={p}>
                  <dt>
                    <Badge tom={TOM[p]}>{PERFIS[p]}</Badge>
                  </dt>
                  <dd className="mt-1 text-slate-600">{DESCRICAO_PERFIL[p]}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <Card titulo={`Pessoas cadastradas (${lista.length})`} icone={Users} className="xl:col-span-2" semPadding>
          {error ? (
            <Vazio>Erro ao carregar: {error.message}</Vazio>
          ) : (
            <TabelaWrap>
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Usuário</th>
                    <th>Perfil</th>
                    <th>Situação</th>
                    <th>Último acesso</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((u) => {
                    const bloqueado = u.bloqueado_ate && new Date(u.bloqueado_ate).getTime() > agora;
                    return (
                      <tr key={u.id} className={u.ativo ? "" : "opacity-60"}>
                        <td className="font-medium">
                          {u.nome}
                          {u.id === eu.id && <span className="ml-1 text-xs text-slate-400">(você)</span>}
                        </td>
                        <td className="font-mono text-xs">{u.login}</td>
                        <td>
                          <Badge tom={TOM[u.perfil]}>{PERFIS[u.perfil]}</Badge>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {u.ativo ? <Badge tom="verde">Ativo</Badge> : <Badge>Desativado</Badge>}
                            {bloqueado && <Badge tom="vermelho">Bloqueado</Badge>}
                            {u.ativo && u.trocar_senha && <Badge tom="amarelo">Senha provisória</Badge>}
                          </div>
                        </td>
                        <td className="text-xs text-slate-500">{u.ultimo_acesso ? fmtDataHora(u.ultimo_acesso) : "Nunca"}</td>
                        <td className="text-right">
                          <Link href={`/usuarios?editar=${u.id}`} className="btn-secondary btn-sm" title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TabelaWrap>
          )}
        </Card>
      </div>
    </>
  );
}
