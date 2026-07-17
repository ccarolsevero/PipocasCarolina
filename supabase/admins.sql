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
