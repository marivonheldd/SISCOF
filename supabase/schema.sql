-- =====================================================================
-- SISCOF – Sistema de Controle de Produtos Frigorificados
-- Execute este arquivo inteiro no Supabase: SQL Editor > New query > Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
do $$ begin
  create type unidade_medida as enum ('kg', 'unidade', 'pacote', 'caixa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_refeicao as enum ('cafe_da_manha', 'almoco', 'jantar', 'outro');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Usuários e perfis de acesso
--   admin    = acesso total (inclui cadastro de pessoas e de produtos)
--   operador = registra entradas e saídas, consulta tudo
--   consulta = apenas visualiza
-- ---------------------------------------------------------------------
do $$ begin
  create type perfil_usuario as enum ('admin', 'operador', 'consulta');
exception when duplicate_object then null; end $$;

create table if not exists usuarios (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  login           text not null,
  senha_hash      text not null,
  perfil          perfil_usuario not null default 'operador',
  ativo           boolean not null default true,
  trocar_senha    boolean not null default true,
  sessao_versao   integer not null default 1,
  falhas_login    integer not null default 0,
  bloqueado_ate   timestamptz,
  ultimo_acesso   timestamptz,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint usuarios_nome_ck  check (length(trim(nome)) between 2 and 80),
  constraint usuarios_login_ck check (login ~ '^[a-z0-9._-]{3,30}$')
);
create unique index if not exists usuarios_login_uk on usuarios (login);

-- Nunca deixar o sistema sem pelo menos um administrador ativo
create or replace function proteger_ultimo_admin() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Usuários não podem ser excluídos; desative a conta.';
  end if;
  new.atualizado_em := now();
  if old.perfil = 'admin' and old.ativo
     and (new.perfil <> 'admin' or not new.ativo)
     and not exists (select 1 from usuarios where perfil = 'admin' and ativo and id <> old.id) then
    raise exception 'Deve existir pelo menos um administrador ativo.';
  end if;
  return new;
end $$;

drop trigger if exists usuarios_ultimo_admin on usuarios;
create trigger usuarios_ultimo_admin before update or delete on usuarios
  for each row execute function proteger_ultimo_admin();

-- ---------------------------------------------------------------------
-- Categorias
-- ---------------------------------------------------------------------
create table if not exists categorias (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  criado_em  timestamptz not null default now(),
  constraint categorias_nome_ck check (length(trim(nome)) between 2 and 60)
);
create unique index if not exists categorias_nome_uk on categorias (lower(trim(nome)));

insert into categorias (nome) values
  ('Carne bovina'), ('Carne suína'), ('Aves'), ('Peixes'),
  ('Embutidos'), ('Margarina'), ('Outros produtos frigorificados')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Produtos
-- ---------------------------------------------------------------------
create table if not exists produtos (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null,
  nome          text not null,
  categoria_id  uuid not null references categorias (id),
  unidade       unidade_medida not null,
  descricao     text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint produtos_codigo_ck check (length(trim(codigo)) between 1 and 30),
  constraint produtos_nome_ck   check (length(trim(nome)) between 2 and 120)
);
create unique index if not exists produtos_codigo_uk on produtos (upper(trim(codigo)));
create index if not exists produtos_nome_idx on produtos (nome);

-- ---------------------------------------------------------------------
-- Entradas (cada linha = um lote recebido, com saldo próprio)
-- ---------------------------------------------------------------------
create table if not exists entradas (
  id               uuid primary key default gen_random_uuid(),
  data_recebimento date not null,
  produto_id       uuid not null references produtos (id),
  quantidade       numeric(12,3) not null,
  saldo            numeric(12,3) not null,
  unidade          unidade_medida not null,
  lote             text not null,
  data_fabricacao  date,
  data_validade    date not null,
  numero_gf        text not null,
  observacoes      text,
  responsavel      text not null,
  usuario          text not null,
  criado_em        timestamptz not null default now(),
  constraint entradas_qtd_ck   check (quantidade > 0),
  constraint entradas_saldo_ck check (saldo >= 0 and saldo <= quantidade),
  constraint entradas_fab_ck   check (data_fabricacao is null or data_fabricacao <= data_validade),
  constraint entradas_lote_ck  check (length(trim(lote)) > 0),
  constraint entradas_gf_ck    check (length(trim(numero_gf)) > 0)
);
create index if not exists entradas_produto_idx on entradas (produto_id);
create index if not exists entradas_gf_idx      on entradas (numero_gf);
create index if not exists entradas_saldo_idx   on entradas (produto_id, data_recebimento, data_validade) where saldo > 0;

-- ---------------------------------------------------------------------
-- Saídas (sempre vinculadas a um lote / entrada)
-- ---------------------------------------------------------------------
create table if not exists saidas (
  id            uuid primary key default gen_random_uuid(),
  data_saida    date not null,
  entrada_id    uuid not null references entradas (id),
  produto_id    uuid not null references produtos (id),
  quantidade    numeric(12,3) not null,
  unidade       unidade_medida not null,
  destino       text not null,
  tipo_refeicao tipo_refeicao not null,
  responsavel   text not null,
  usuario       text not null,
  observacoes   text,
  criado_em     timestamptz not null default now(),
  constraint saidas_qtd_ck check (quantidade > 0)
);
create index if not exists saidas_entrada_idx on saidas (entrada_id);
create index if not exists saidas_produto_idx on saidas (produto_id);
create index if not exists saidas_data_idx    on saidas (data_saida);

-- Histórico imutável: entradas/saídas não podem ser apagadas, e nas saídas
-- nenhum campo pode ser alterado depois de gravado.
create or replace function bloquear_alteracao_historico() returns trigger
language plpgsql as $$
begin
  raise exception 'O histórico de movimentações não pode ser alterado ou excluído.';
end $$;

drop trigger if exists saidas_imutavel on saidas;
create trigger saidas_imutavel before update or delete on saidas
  for each row execute function bloquear_alteracao_historico();

drop trigger if exists entradas_sem_delete on entradas;
create trigger entradas_sem_delete before delete on entradas
  for each row execute function bloquear_alteracao_historico();

-- Em entradas, só o saldo pode mudar (e só pelas funções abaixo).
create or replace function proteger_entrada() returns trigger
language plpgsql as $$
begin
  if (new.data_recebimento, new.produto_id, new.quantidade, new.unidade, new.lote,
      new.data_fabricacao, new.data_validade, new.numero_gf, new.responsavel, new.usuario)
     is distinct from
     (old.data_recebimento, old.produto_id, old.quantidade, old.unidade, old.lote,
      old.data_fabricacao, old.data_validade, old.numero_gf, old.responsavel, old.usuario) then
    raise exception 'Os dados de uma entrada registrada não podem ser alterados.';
  end if;
  return new;
end $$;

drop trigger if exists entradas_protegida on entradas;
create trigger entradas_protegida before update on entradas
  for each row execute function proteger_entrada();

-- Unidade do produto não pode mudar se já houver movimentação
create or replace function proteger_unidade_produto() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  if new.unidade is distinct from old.unidade
     and exists (select 1 from entradas where produto_id = old.id) then
    raise exception 'A unidade de medida não pode ser alterada: o produto já possui movimentações.';
  end if;
  return new;
end $$;

drop trigger if exists produtos_unidade on produtos;
create trigger produtos_unidade before update on produtos
  for each row execute function proteger_unidade_produto();

-- ---------------------------------------------------------------------
-- Função: registrar entradas (vários produtos na mesma GF, transação única)
-- ---------------------------------------------------------------------
create or replace function registrar_entradas(
  p_data         date,
  p_numero_gf    text,
  p_responsavel  text,
  p_observacoes  text,
  p_usuario      text,
  p_itens        jsonb,
  p_hoje         date
) returns integer
language plpgsql as $$
declare
  it     jsonb;
  v_prod produtos%rowtype;
  v_qtd  numeric;
  v_fab  date;
  v_val  date;
  v_lote text;
  n      integer := 0;
begin
  if p_data is null then raise exception 'Informe a data do recebimento.'; end if;
  if p_data > p_hoje then raise exception 'A data do recebimento não pode ser futura.'; end if;
  if coalesce(trim(p_numero_gf), '') = '' then raise exception 'Informe o número da Guia de Fornecimento (GF).'; end if;
  if coalesce(trim(p_responsavel), '') = '' then raise exception 'Informe o responsável pelo recebimento.'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Inclua pelo menos um produto na entrada.';
  end if;

  for it in select * from jsonb_array_elements(p_itens) loop
    select * into v_prod from produtos where id = (it->>'produto_id')::uuid;
    if not found then raise exception 'Produto não encontrado.'; end if;
    if not v_prod.ativo then raise exception 'O produto "%" está inativo.', v_prod.nome; end if;

    v_qtd := (it->>'quantidade')::numeric;
    if v_qtd is null or v_qtd <= 0 then
      raise exception 'Quantidade inválida para "%".', v_prod.nome;
    end if;
    if v_prod.unidade <> 'kg' and v_qtd <> trunc(v_qtd) then
      raise exception 'O produto "%" é controlado por %: use quantidade inteira.', v_prod.nome, v_prod.unidade;
    end if;

    v_lote := trim(coalesce(it->>'lote', ''));
    if v_lote = '' then raise exception 'Informe o lote de "%".', v_prod.nome; end if;

    v_val := nullif(it->>'data_validade', '')::date;
    if v_val is null then raise exception 'Informe a validade de "%".', v_prod.nome; end if;
    if v_val < p_data then
      raise exception 'O lote % de "%" chegou vencido (validade anterior ao recebimento).', v_lote, v_prod.nome;
    end if;

    v_fab := nullif(it->>'data_fabricacao', '')::date;
    if v_fab is not null and v_fab > p_data then
      raise exception 'A fabricação de "%" não pode ser posterior ao recebimento.', v_prod.nome;
    end if;

    insert into entradas (data_recebimento, produto_id, quantidade, saldo, unidade, lote,
                          data_fabricacao, data_validade, numero_gf, observacoes, responsavel, usuario)
    values (p_data, v_prod.id, v_qtd, v_qtd, v_prod.unidade, v_lote,
            v_fab, v_val, trim(p_numero_gf), nullif(trim(coalesce(p_observacoes, '')), ''),
            trim(p_responsavel), p_usuario);
    n := n + 1;
  end loop;

  return n;
end $$;

-- ---------------------------------------------------------------------
-- Função: registrar saída (bloqueia o lote para evitar saldo negativo)
-- ---------------------------------------------------------------------
create or replace function registrar_saida(
  p_entrada_id    uuid,
  p_quantidade    numeric,
  p_data          date,
  p_destino       text,
  p_tipo_refeicao tipo_refeicao,
  p_responsavel   text,
  p_observacoes   text,
  p_usuario       text,
  p_hoje          date
) returns uuid
language plpgsql as $$
declare
  v_e  entradas%rowtype;
  v_id uuid;
begin
  if p_data is null then raise exception 'Informe a data da saída.'; end if;
  if p_data > p_hoje then raise exception 'A data da saída não pode ser futura.'; end if;
  if p_quantidade is null or p_quantidade <= 0 then raise exception 'Informe uma quantidade maior que zero.'; end if;
  if coalesce(trim(p_destino), '') = '' then raise exception 'Informe o destino ou finalidade.'; end if;
  if coalesce(trim(p_responsavel), '') = '' then raise exception 'Informe o responsável pela retirada.'; end if;

  select * into v_e from entradas where id = p_entrada_id for update;
  if not found then raise exception 'Lote não encontrado.'; end if;

  if v_e.unidade <> 'kg' and p_quantidade <> trunc(p_quantidade) then
    raise exception 'Este produto é controlado por %: use quantidade inteira.', v_e.unidade;
  end if;
  if p_data < v_e.data_recebimento then
    raise exception 'A data da saída não pode ser anterior ao recebimento do lote (%).',
      to_char(v_e.data_recebimento, 'DD/MM/YYYY');
  end if;
  if p_quantidade > v_e.saldo then
    raise exception 'Quantidade indisponível. Saldo do lote %: %.', v_e.lote, v_e.saldo;
  end if;

  update entradas set saldo = saldo - p_quantidade where id = v_e.id;

  insert into saidas (data_saida, entrada_id, produto_id, quantidade, unidade, destino,
                      tipo_refeicao, responsavel, usuario, observacoes)
  values (p_data, v_e.id, v_e.produto_id, p_quantidade, v_e.unidade, trim(p_destino),
          p_tipo_refeicao, trim(p_responsavel), p_usuario, nullif(trim(coalesce(p_observacoes, '')), ''))
  returning id into v_id;

  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Views para consultas e painel
-- ---------------------------------------------------------------------
create or replace view v_estoque_produto with (security_invoker = true) as
select p.id, p.codigo, p.nome, p.unidade, p.ativo, p.categoria_id,
       c.nome as categoria,
       coalesce(sum(e.saldo), 0)::numeric(12,3)            as saldo,
       count(e.id) filter (where e.saldo > 0)              as lotes_ativos,
       min(e.data_validade) filter (where e.saldo > 0)     as proxima_validade
from produtos p
join categorias c on c.id = p.categoria_id
left join entradas e on e.produto_id = p.id
group by p.id, c.nome;

create or replace view v_lotes with (security_invoker = true) as
select e.id, e.produto_id, p.codigo, p.nome as produto, c.nome as categoria,
       e.lote, e.numero_gf, e.data_recebimento, e.data_fabricacao, e.data_validade,
       e.quantidade, e.saldo, e.unidade, e.criado_em
from entradas e
join produtos p on p.id = e.produto_id
join categorias c on c.id = p.categoria_id;

create or replace view v_movimentacoes with (security_invoker = true) as
select e.id, 'entrada'::text as tipo, e.data_recebimento as data, e.criado_em,
       e.produto_id, p.codigo, p.nome as produto, e.lote, e.quantidade, e.unidade,
       e.numero_gf, null::text as destino, null::text as tipo_refeicao,
       e.responsavel, e.usuario, e.observacoes
from entradas e join produtos p on p.id = e.produto_id
union all
select s.id, 'saida'::text, s.data_saida, s.criado_em,
       s.produto_id, p.codigo, p.nome, e.lote, s.quantidade, s.unidade,
       e.numero_gf, s.destino, s.tipo_refeicao::text,
       s.responsavel, s.usuario, s.observacoes
from saidas s
join entradas e on e.id = s.entrada_id
join produtos p on p.id = s.produto_id;

create or replace view v_movimentos_mensais with (security_invoker = true) as
select date_trunc('month', data_recebimento)::date as mes, 'entrada'::text as tipo, unidade,
       sum(quantidade)::numeric(14,3) as total, count(*) as registros
from entradas group by 1, 3
union all
select date_trunc('month', data_saida)::date, 'saida'::text, unidade,
       sum(quantidade)::numeric(14,3), count(*)
from saidas group by 1, 3;

create or replace view v_consumo_categoria with (security_invoker = true) as
select date_trunc('month', s.data_saida)::date as mes, c.nome as categoria, s.unidade,
       sum(s.quantidade)::numeric(14,3) as total
from saidas s
join produtos p on p.id = s.produto_id
join categorias c on c.id = p.categoria_id
group by 1, 2, 3;

-- ---------------------------------------------------------------------
-- Segurança: RLS ligado e sem políticas => as chaves públicas (anon /
-- authenticated) não acessam nada. Só o servidor (service_role) acessa.
-- ---------------------------------------------------------------------
alter table categorias enable row level security;
alter table produtos   enable row level security;
alter table entradas   enable row level security;
alter table saidas     enable row level security;
alter table usuarios   enable row level security;

revoke all on categorias, produtos, entradas, saidas, usuarios from anon, authenticated;
revoke all on v_estoque_produto, v_lotes, v_movimentacoes, v_movimentos_mensais, v_consumo_categoria
  from anon, authenticated;
revoke execute on function registrar_entradas(date, text, text, text, text, jsonb, date) from public, anon, authenticated;
revoke execute on function registrar_saida(uuid, numeric, date, text, tipo_refeicao, text, text, text, date) from public, anon, authenticated;
grant execute on function registrar_entradas(date, text, text, text, text, jsonb, date) to service_role;
grant execute on function registrar_saida(uuid, numeric, date, text, tipo_refeicao, text, text, text, date) to service_role;
