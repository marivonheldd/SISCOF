import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { PERFIS, DESCRICAO_PERFIL } from "@/lib/perfis";
import { Card, PageHeader } from "@/components/ui";
import TrocarSenhaForm from "./TrocarSenhaForm";

export const metadata: Metadata = { title: "Minha senha" };

export default async function ContaPage() {
  const s = await exigirSessao();
  return (
    <div className="max-w-md">
      <PageHeader titulo="Minha senha" descricao={`${s.nome} · usuário ${s.login} · ${PERFIS[s.perfil]}`} />
      <p className="mb-4 text-sm text-slate-500">{DESCRICAO_PERFIL[s.perfil]}</p>
      <Card titulo="Alterar senha" icone={KeyRound}>
        <TrocarSenhaForm />
      </Card>
    </div>
  );
}
