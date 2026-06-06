create sequence if not exists public.factory_invoice_number_seq;

create table if not exists public.factory_invoices (
  id text primary key,
  invoice_number text not null unique,
  factory_id text not null references public.factories(id),
  total_amount numeric(12,2) not null default 0,
  order_count integer not null default 0,
  status text not null default 'approved' check (status in ('pending', 'approved', 'paid')),
  receipt_url text,
  receipt_file_name text,
  receipt_storage_path text,
  paid_at timestamptz,
  created_by text references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists factory_cost numeric(12,2),
  add column if not exists factory_cost_note text,
  add column if not exists factory_cost_status text not null default 'pending' check (factory_cost_status in ('pending', 'approved', 'paid')),
  add column if not exists factory_invoice_id text references public.factory_invoices(id) on delete set null;

create index if not exists factory_invoices_factory_id_idx on public.factory_invoices(factory_id);
create index if not exists factory_invoices_status_idx on public.factory_invoices(status);
create index if not exists factory_invoices_created_at_idx on public.factory_invoices(created_at);
create index if not exists orders_factory_invoice_id_idx on public.orders(factory_invoice_id);
create index if not exists orders_factory_cost_status_idx on public.orders(factory_cost_status);
create index if not exists orders_factory_cost_pending_idx
  on public.orders(assigned_factory_id, factory_cost_status)
  where factory_cost is not null;

create or replace function public.generate_factory_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
  candidate text;
begin
  loop
    next_number := nextval('public.factory_invoice_number_seq');
    candidate := 'FI-' || lpad(next_number::text, 4, '0');

    if not exists (
      select 1
      from public.factory_invoices
      where invoice_number = candidate
    ) then
      return candidate;
    end if;
  end loop;
end;
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.factory_invoices to authenticated;
revoke execute on function public.generate_factory_invoice_number() from public;
grant execute on function public.generate_factory_invoice_number() to authenticated;

alter table public.factory_invoices enable row level security;

drop policy if exists "factory invoices admin manage" on public.factory_invoices;
create policy "factory invoices admin manage"
on public.factory_invoices
for all
to authenticated
using (
  exists (
    select 1
    from public.app_users
    where app_users.auth_user_id = auth.uid()
      and app_users.role = 'Admin'
  )
)
with check (
  exists (
    select 1
    from public.app_users
    where app_users.auth_user_id = auth.uid()
      and app_users.role = 'Admin'
  )
);

drop policy if exists "factory invoices factory read own" on public.factory_invoices;
create policy "factory invoices factory read own"
on public.factory_invoices
for select
to authenticated
using (
  exists (
    select 1
    from public.app_users
    where app_users.auth_user_id = auth.uid()
      and app_users.role = 'Factory'
      and app_users.factory_id = factory_invoices.factory_id
  )
);
