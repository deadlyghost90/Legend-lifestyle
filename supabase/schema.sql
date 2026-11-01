-- Legend Lifestyle starter schema for Supabase/Postgres.
-- Review and run this in the intended Supabase project's SQL editor.
-- This file does not create a Supabase project or deploy credentials.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) between 1 and 90),
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (char_length(category) between 1 and 60),
  description text not null default '' check (char_length(description) <= 5000),
  price_pkr integer not null check (price_pkr between 1 and 100000000),
  compare_at_price_pkr integer null check (compare_at_price_pkr is null or compare_at_price_pkr between 1 and 100000000),
  stock integer not null default 0 check (stock between 0 and 10000000),
  status text not null default 'draft' check (status in ('active', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_created_idx on public.products (status, created_at desc);
create index if not exists products_category_idx on public.products (category);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

alter table public.products enable row level security;

-- Storefront visitors may read active products only. No public write policy exists.
drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products"
  on public.products for select
  using (status = 'active');

-- Intentionally no insert/update/delete policy for anon or authenticated clients.
-- The serverless API uses the service-role key only after verifying a Supabase user
-- and checking trusted app_metadata.role = 'admin'. Never expose that key in a browser.

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null,
  action text not null check (char_length(action) between 1 and 80),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
-- No client-facing policies: access is denied to anon/authenticated roles by default.
