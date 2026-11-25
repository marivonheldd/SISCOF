"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Warehouse,
  History,
  LogOut,
  Menu,
  X,
  Snowflake,
  UserCircle2,
  Users,
  KeyRound,
} from "lucide-react";
import { sair } from "@/actions/auth";
import { PERFIS, type Perfil } from "@/lib/perfis";

const itens: { href: string; label: string; icon: typeof Package; perfis?: Perfil[] }[] = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/entradas", label: "Entradas", icon: ArrowDownToLine },
  { href: "/saidas", label: "Saídas", icon: ArrowUpFromLine },
  { href: "/estoque", label: "Estoque e validade", icon: Warehouse },
  { href: "/movimentacoes", label: "Movimentações", icon: History },
  { href: "/usuarios", label: "Usuários", icon: Users, perfis: ["admin"] },
  { href: "/conta", label: "Minha senha", icon: KeyRound },
];

export default function Sidebar({ usuario, perfil }: { usuario: string; perfil: Perfil }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  useEffect(() => setAberto(false), [pathname]);

  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Barra superior (celular/tablet) */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-marinho-900 px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-2 font-bold">
          <Snowflake className="h-5 w-5" /> SISCOF
        </div>
        <button onClick={() => setAberto(true)} aria-label="Abrir menu" className="rounded p-1 hover:bg-white/10">
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {aberto && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setAberto(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-marinho-900 text-marinho-100 transition-transform lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold text-white">
              <Snowflake className="h-6 w-6" /> SISCOF
            </div>
            <p className="mt-0.5 text-[11px] leading-tight text-marinho-300">
              Controle de Produtos Frigorificados
            </p>
          </div>
          <button onClick={() => setAberto(false)} aria-label="Fechar menu" className="rounded p-1 hover:bg-white/10 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {itens.filter((i) => !i.perfis || i.perfis.includes(perfil)).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                ativo(href) ? "bg-white text-marinho-900 shadow" : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm">
            <UserCircle2 className="h-5 w-5 text-marinho-300" />
            <div className="min-w-0">
              <p className="truncate text-white">{usuario}</p>
              <p className="text-[11px] text-marinho-300">{PERFIS[perfil]}</p>
            </div>
          </div>
          <form action={sair}>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10 hover:text-white">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
