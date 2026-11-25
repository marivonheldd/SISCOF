import type { Metadata } from "next";
import Link from "next/link";
import { Package, Search, Tags, Pencil, Power } from "lucide-react";
import { db } from "@/lib/db";
import { fmtQtd, UNIDADES, type Unidade } from "@/lib/format";
import { Badge, Card, PageHeader, TabelaWrap, Vazio } from "@/components/ui";
import { alternarStatusProduto } from "@/actions/produtos";
import { exigirSessao } from "@/lib/auth";
import { pode } from "@/lib/perfis";
import ProdutoForm from "./ProdutoForm";
import CategoriaForm from "./CategoriaForm";

export const metadata: Metadata = { title: "Produtos" };

type Linha = {
  id: string;
  codigo: string;
  nome: string;
  unidade: Unidade;
  ativo: boolean;
  categoria: string;
  categoria_id: string;
  saldo: number;
};

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; categoria?: string; editar?: string }>;
}) {
  const sessao = await exigirSessao();
  const admin = pode.gerenciarProdutos(sessao.perfil);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const d = db();

  let consulta = d
    .from("v_estoque_produto")
    .select("id, codigo, nome, unidade, ativo, categoria, categoria_id, saldo")
    .order("nome");
  if (q) {
    const s = q.replace(/[%,()*\\]/g, " ").trim();
    consulta = consulta.or(`nome.ilike.%${s}%,codigo.ilike.%${s}%`);
  }
  if (sp.status === "ativo") consulta = consulta.eq("ativo", true);
  if (sp.status === "inativo") consulta = consulta.eq("ativo", false);
  const UUID = /^[0-9a-f-]{36}$/i;
  if (sp.categoria && UUID.test(sp.categoria)) consulta = consulta.eq("categoria_id", sp.categoria);

  const [{ data: categorias }, { data: produtos, error }, editando] = await Promise.all([
    d.from("categorias").select("id, nome").order("nome"),
    consulta,
    sp.editar && UUID.test(sp.editar)
      ? d.from("produtos").select("id, codigo, nome, categoria_id, unidade, descricao, ativo").eq("id", sp.editar).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const lista = (produtos ?? []) as Linha[];
  const cats = categorias ?? [];

  return (
    <>
      <PageHeader titulo="Produtos" descricao="Cadastro, consulta e edição dos produtos controlados na câmara frigorífica." />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-1">
          {admin ? (
            <Card titulo={editando.data ? "Editar produto" : "Novo produto"} icone={Package}>
              <ProdutoForm key={editando.data?.id ?? "novo"} categorias={cats} produto={editando.data ?? undefined} />
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-slate-600">Somente o administrador (ADM) cadastra e edita produtos e categorias.</p>
            </Card>
          )}
          <Card titulo="Categorias" icone={Tags}>
            {admin && <CategoriaForm />}
            <ul className="mt-4 flex flex-wrap gap-2">
              {cats.map((c) => (
                <li key={c.id}>
                  <Badge tom="azul">{c.nome}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card titulo={`Produtos cadastrados (${lista.length})`} className="xl:col-span-2" semPadding>
          <form className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input name="q" defaultValue={q} placeholder="Pesquisar por nome ou código" className="input pl-9" />
            </div>
            <select name="categoria" defaultValue={sp.categoria ?? ""} className="input">
              <option value="">Todas as categorias</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={sp.status ?? ""} className="input">
              <option value="">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
            <button className="btn-secondary">Filtrar</button>
          </form>

          {error ? (
            <Vazio>Erro ao carregar produtos: {error.message}</Vazio>
          ) : lista.length === 0 ? (
            <Vazio>Nenhum produto encontrado.</Vazio>
          ) : (
            <TabelaWrap>
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Produto</th>
                    <th>Categoria</th>
                    <th>Unidade</th>
                    <th className="text-right">Estoque</th>
                    <th>Status</th>
                    {admin && <th className="text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono text-xs">{p.codigo}</td>
                      <td className="font-medium">{p.nome}</td>
                      <td>{p.categoria}</td>
                      <td>{UNIDADES[p.unidade]}</td>
                      <td className={`text-right tabular-nums ${Number(p.saldo) === 0 ? "text-red-600" : ""}`}>
                        {fmtQtd(p.saldo, p.unidade)}
                      </td>
                      <td>{p.ativo ? <Badge tom="verde">Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                      {admin && <td>
                        <div className="flex justify-end gap-1">
                          <Link href={`/produtos?editar=${p.id}`} className="btn-secondary btn-sm" title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <form action={alternarStatusProduto.bind(null, p.id, !p.ativo)}>
                            <button className="btn-secondary btn-sm" title={p.ativo ? "Inativar" : "Ativar"}>
                              <Power className={`h-3.5 w-3.5 ${p.ativo ? "text-red-600" : "text-emerald-600"}`} />
                            </button>
                          </form>
                        </div>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabelaWrap>
          )}
        </Card>
      </div>
    </>
  );
}
