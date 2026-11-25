import Sidebar from "@/components/Sidebar";
import { exigirSessao } from "@/lib/auth";
import { Card } from "@/components/ui";
import TrocarSenhaForm from "./conta/TrocarSenhaForm";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();
  return (
    <div className="min-h-screen">
      <Sidebar usuario={sessao.nome} perfil={sessao.perfil} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {sessao.trocar_senha ? (
            <div className="mx-auto max-w-md">
              <h1 className="mb-2 text-2xl font-bold text-marinho-900">Crie sua senha</h1>
              <p className="mb-6 text-sm text-slate-500">
                Olá, {sessao.nome}. Você entrou com uma senha provisória. Para continuar, defina uma senha pessoal.
              </p>
              <Card>
                <TrocarSenhaForm rotuloAtual="Senha provisória" />
              </Card>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
