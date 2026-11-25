# SISCOF – Sistema de Controle de Produtos Frigorificados

Sistema web para controlar recebimento, armazenamento, saídas, validade e estoque de carnes, embutidos,
margarina e demais produtos de uma câmara frigorífica.

**Tecnologias:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase (PostgreSQL) · Vercel

## Funcionalidades

| Módulo | O que faz |
|---|---|
| **Login e usuários** | Cada pessoa tem usuário e senha próprios e um perfil (ADM, Operador ou Consulta). O nome e o usuário de quem registrou ficam gravados em cada movimentação. |
| **Painel** | Produtos cadastrados, estoque total em kg, entradas e saídas do mês, lotes próximos do vencimento (≤ 7 dias), vencidos, produtos zerados, alertas de validade, últimas movimentações e gráficos (entradas × saídas mensais, consumo por categoria, estoque por produto). Atualiza sozinho a cada minuto. |
| **Produtos** | Cadastro, pesquisa, edição, ativação/inativação. Categorias iniciais + criação de novas. Unidades: kg, unidade, pacote, caixa. |
| **Entradas** | Vários produtos na mesma Guia de Fornecimento (GF), cada um gerando um registro individual com lote, quantidade, fabricação e validade. Sem campo de fornecedor. |
| **Saídas** | Seleção do produto → lista dos lotes com saldo, ordenados por **PEPS** (o mais antigo vem marcado e pré-selecionado). O usuário pode escolher outro lote, com aviso. Destino, tipo de refeição, responsável e observações. |
| **Estoque e validade** | Saldo por produto e por lote, abas de vencendo, vencidos e zerados. |
| **Movimentações** | Histórico completo de entradas e saídas, com filtros por tipo, período e texto (produto, código, lote, GF) e paginação. |

### Regras de consistência (garantidas no banco de dados)

- Quantidade sempre maior que zero; produtos em unidade/pacote/caixa aceitam só números inteiros.
- Saída nunca maior que o saldo do lote (o lote é bloqueado durante a operação, então duas saídas ao mesmo tempo não deixam o saldo negativo).
- Datas futuras, validade anterior ao recebimento, fabricação depois da validade e saída anterior ao recebimento do lote são recusadas.
- O histórico é **imutável**: entradas e saídas não podem ser editadas nem apagadas.
- A unidade de um produto não pode mudar depois que ele tem movimentações.
- Código de produto e nome de categoria são únicos.

## Usuários e perfis

| Perfil | Pode fazer |
|---|---|
| **Administrador (ADM)** | Tudo: cadastra pessoas, define perfis, redefine senhas, cadastra produtos e categorias, registra entradas e saídas. |
| **Operador** | Registra entradas e saídas; consulta painel, produtos, estoque e movimentações. |
| **Consulta** | Só visualiza (painel, produtos, estoque, movimentações). |

### Primeiro acesso (conta ADM)

Depois do deploy, abra o sistema e entre com:

- **Usuário:** `admin` (ou o valor de `ADMIN_LOGIN`)
- **Senha:** o valor de `APP_PASSWORD`

Isso cria a conta ADM, e só funciona enquanto não existir nenhum administrador. A partir daí a senha fica
criptografada no banco e pode ser trocada em **Minha senha**. A variável `APP_PASSWORD` deixa de ser usada.

### Cadastrar pessoas

1. Entre como ADM e abra **Usuários** no menu.
2. Preencha nome, usuário (ex.: `maria.silva`) e perfil. Digite ou gere (ícone de dado) uma senha provisória.
3. Passe o usuário e a senha provisória para a pessoa. No primeiro acesso ela é obrigada a criar a própria senha.

**Esqueceu a senha ou foi bloqueada?** Após 5 tentativas erradas a conta fica bloqueada por 15 minutos.
O ADM pode abrir a pessoa em **Usuários**, clicar em editar e usar **Redefinir senha**, que também desbloqueia.

**Saiu da equipe?** Edite a pessoa e desmarque **Conta ativa**. O acesso é cortado na hora e o histórico continua
mostrando o que ela registrou. Contas não são excluídas.

O sistema impede que fique sem nenhum ADM ativo, e o ADM não consegue desativar a própria conta.

## Segurança

- O navegador **nunca** fala direto com o Supabase. Todo acesso passa pelo servidor Next.js usando a chave `service_role`, que fica só nas variáveis de ambiente.
- No banco, o RLS está ligado e as permissões das chaves públicas (`anon`/`authenticated`) foram removidas: mesmo que alguém descubra a URL do Supabase, não consegue ler nem gravar nada.
- Senhas guardadas só como hash scrypt com sal aleatório; ninguém, nem o ADM, consegue ver a senha de outra pessoa.
- Todas as páginas e ações verificam a sessão e o perfil no servidor (esconder um botão não basta: a ação também recusa).
- Bloqueio de 15 min após 5 tentativas erradas. Trocar senha ou desativar a conta encerra as sessões abertas.
- Cabeçalhos de segurança (anti-iframe, nosniff etc.) e `noindex` para buscadores.

## Instalação passo a passo

### 1. Supabase

1. Crie um projeto em <https://supabase.com>.
2. Abra **SQL Editor → New query**, cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Pode rodar de novo se precisar; o script não duplica nada.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **service_role** (secreta).

### 2. Rodar no computador (opcional)

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev                  # http://localhost:3000
```

### 3. GitHub

```bash
git init
git add .
git commit -m "SISCOF - versão inicial"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/siscof.git
git push -u origin main
```

O `.gitignore` já impede que o `.env.local` (com a senha e as chaves) vá para o GitHub.

### 4. Vercel

1. Em <https://vercel.com/new>, importe o repositório do GitHub (o framework Next.js é detectado sozinho).
2. Em **Environment Variables**, cadastre:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | chave service_role |
| `ADMIN_LOGIN` | `admin` (usuário da conta ADM no primeiro acesso) |
| `APP_PASSWORD` | senha do primeiro acesso do ADM |
| `SESSION_SECRET` | texto aleatório com 32+ caracteres (`openssl rand -base64 48`) |
| `APP_TIMEZONE` | `America/Cuiaba` (ou o seu fuso) |

3. Clique em **Deploy**.

**Trocar a senha do ADM:** menu **Minha senha**, dentro do sistema.
**Desconectar todo mundo de uma vez:** troque o `SESSION_SECRET` na Vercel e faça Redeploy.

## Ajustes rápidos

- Dias para o alerta de "próximo do vencimento": `DIAS_ALERTA_VENCIMENTO` em `lib/format.ts` (padrão: 7).
- Sugestões de destino na saída: `DESTINOS` em `app/(app)/saidas/SaidaForm.tsx`.
- Cores: paleta `marinho` em `tailwind.config.ts`.

## Estrutura

```
app/
  login/                 tela de acesso
  (app)/usuarios/        cadastro de pessoas (ADM)
  (app)/conta/           troca da própria senha
  (app)/                 área protegida (menu lateral)
    page.tsx             painel
    produtos/ entradas/ saidas/ estoque/ movimentacoes/
actions/                 ações do servidor (gravações e validações)
components/              menu, gráficos, componentes de interface
lib/                     sessão, banco, formatação de datas e quantidades
middleware.ts            proteção das rotas
supabase/schema.sql      tabelas, regras, funções e views
```
