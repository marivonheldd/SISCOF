"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { salvarProduto } from "@/actions/produtos";
import type { Resultado } from "@/actions/types";
import { UNIDADES } from "@/lib/format";
import { Alerta } from "@/components/ui";

type Produto = {
  id: string;
  codigo: string;
  nome: string;
  categoria_id: string;
  unidade: string;
  descricao: string | null;
  ativo: boolean;
};

export default function ProdutoForm({
  categorias,
  produto,
}: {
  categorias: { id: string; nome: string }[];
  produto?: Produto;
}) {
  const [estado, acao, pendente] = useActionState<Resultado, FormData>(salvarProduto, null);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!estado?.ok) return;
    if (produto) router.push("/produtos");
    else form.current?.reset();
  }, [estado, produto, router]);

  return (
    <form ref={form} action={acao} className="space-y-4">
      {produto && <input type="hidden" name="id" value={produto.id} />}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label htmlFor="codigo" className="label label-req">
            Código
          </label>
          <input id="codigo" name="codigo" defaultValue={produto?.codigo} className="input uppercase" required maxLength={30} />
        </div>
        <div className="col-span-2">
          <label htmlFor="nome" className="label label-req">
            Nome do produto
          </label>
          <input id="nome" name="nome" defaultValue={produto?.nome} className="input" required minLength={2} maxLength={120} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="categoria_id" className="label label-req">
            Categoria
          </label>
          <select id="categoria_id" name="categoria_id" defaultValue={produto?.categoria_id ?? ""} className="input" required>
            <option value="" disabled>
              Selecione
            </option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="unidade" className="label label-req">
            Unidade de medida
          </label>
          <select id="unidade" name="unidade" defaultValue={produto?.unidade ?? "kg"} className="input" required>
            {Object.entries(UNIDADES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="descricao" className="label">
          Descrição <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea id="descricao" name="descricao" defaultValue={produto?.descricao ?? ""} rows={2} maxLength={500} className="input" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="ativo" defaultChecked={produto?.ativo ?? true} className="h-4 w-4 rounded border-slate-300 text-marinho-700" />
        Produto ativo
      </label>

      {estado && <Alerta tom={estado.ok ? "verde" : "vermelho"}>{estado.msg}</Alerta>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={pendente}>
          <Save className="h-4 w-4" />
          {pendente ? "Salvando..." : produto ? "Salvar alterações" : "Cadastrar produto"}
        </button>
        {produto && (
          <Link href="/produtos" className="btn-secondary">
            Cancelar
          </Link>
        )}
      </div>
    </form>
  );
}
