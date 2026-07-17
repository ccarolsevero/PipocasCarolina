-- Pipocas Carolinas — schema Supabase
create extension if not exists pgcrypto;

create table if not exists customers (
  id bigserial primary key,
  name text not null,
  email text not null unique,
  phone text not null,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id bigserial primary key,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  category text not null default 'Geral',
  unit text not null default 'unidade',
  tag text,
  image text not null default '',
  min_quantity int not null default 1 check (min_quantity >= 1),
  options jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  featured boolean not null default false,
  stock_qty int not null default 0,
  min_stock int not null default 5 check (min_stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products
  add column if not exists featured boolean not null default false;

create table if not exists orders (
  id bigserial primary key,
  code text not null unique,
  customer_id bigint not null references customers(id),
  status text not null default 'preparando' check (status in ('preparando', 'entregando', 'entregue', 'cancelado')),
  payment text not null default 'Pix',
  payment_status text not null default 'pendente' check (payment_status in ('pendente', 'pago', 'cancelado')),
  address jsonb not null default '{}'::jsonb,
  subtotal numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  product_id bigint references products(id) on delete set null,
  name text not null,
  price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  image text not null default ''
);

create table if not exists inventory_movements (
  id bigserial primary key,
  product_id bigint not null references products(id) on delete cascade,
  type text not null check (type in ('entrada', 'venda', 'ajuste', 'perda')),
  quantity int not null,
  note text,
  order_id bigint references orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id bigserial primary key,
  description text not null,
  amount numeric(10,2) not null check (amount >= 0),
  category text not null default 'Geral',
  spent_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists order_counters (
  id int primary key default 1 check (id = 1),
  next_order_id bigint not null default 1
);

insert into order_counters (id, next_order_id)
values (1, 1)
on conflict (id) do nothing;

create index if not exists idx_customers_email on customers (email);
create index if not exists idx_orders_customer on orders (customer_id);
create index if not exists idx_orders_status on orders (status);
create index if not exists idx_orders_created on orders (created_at desc);
create index if not exists idx_products_active on products (active);
create index if not exists idx_inventory_product on inventory_movements (product_id, created_at desc);
create index if not exists idx_expenses_spent on expenses (spent_at desc);

alter table customers enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table inventory_movements enable row level security;
alter table expenses enable row level security;
alter table order_counters enable row level security;

-- Público só lê produtos ativos (via anon). Escrita só via service_role no backend.
drop policy if exists products_public_read on products;
create policy products_public_read on products
  for select to anon, authenticated
  using (active = true);

create or replace function touch_product_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
before update on products
for each row execute function touch_product_updated_at();

create or replace function next_order_code()
returns text
language plpgsql
as $$
declare
  n bigint;
begin
  update order_counters
  set next_order_id = next_order_id + 1
  where id = 1
  returning next_order_id - 1 into n;
  return 'PC' || lpad(n::text, 4, '0');
end;
$$;

create or replace function create_order_with_stock(
  p_customer_id bigint,
  p_items jsonb,
  p_address jsonb,
  p_payment text,
  p_subtotal numeric,
  p_shipping numeric,
  p_total numeric
)
returns jsonb
language plpgsql
as $$
declare
  v_order orders%rowtype;
  v_item jsonb;
  v_product products%rowtype;
  v_qty int;
  v_product_id bigint;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Pedido inválido.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item->>'productId', '')::bigint;
    v_qty := coalesce((v_item->>'quantity')::int, 0);
    if v_product_id is null or v_qty < 1 then
      raise exception 'Itens do pedido inválidos.';
    end if;

    select * into v_product from products where id = v_product_id for update;
    if not found or not v_product.active then
      raise exception 'Produto indisponível: %', coalesce(v_item->>'name', v_product_id::text);
    end if;
    if v_product.stock_qty < v_qty then
      raise exception 'Estoque insuficiente para % (disponível: %).', v_product.name, v_product.stock_qty;
    end if;
  end loop;

  insert into orders (code, customer_id, status, payment, payment_status, address, subtotal, shipping, total)
  values (next_order_code(), p_customer_id, 'preparando', p_payment, 'pendente', p_address, p_subtotal, p_shipping, p_total)
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'productId')::bigint;
    v_qty := (v_item->>'quantity')::int;

    insert into order_items (order_id, product_id, name, price, quantity, image)
    values (
      v_order.id,
      v_product_id,
      v_item->>'name',
      (v_item->>'price')::numeric,
      v_qty,
      coalesce(v_item->>'image', '')
    );

    update products
    set stock_qty = stock_qty - v_qty
    where id = v_product_id;

    insert into inventory_movements (product_id, type, quantity, note, order_id)
    values (v_product_id, 'venda', -v_qty, 'Venda pedido ' || v_order.code, v_order.id);
  end loop;

  return to_jsonb(v_order);
end;
$$;
-- Admin users for the Pipocas Carolinas panel
create table if not exists admins (
  id bigserial primary key,
  email text not null unique,
  name text not null default 'Administrador',
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;

create index if not exists idx_admins_email on admins (email);
