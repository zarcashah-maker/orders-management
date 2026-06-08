alter table public.orders
  add column if not exists execution_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_execution_type_check'
  ) then
    alter table public.orders
      add constraint orders_execution_type_check
      check (execution_type is null or execution_type in ('printing', 'embroidery'));
  end if;
end $$;

create index if not exists orders_execution_type_idx on public.orders(execution_type);

do $$
begin
  if to_regclass('public.factory_invoices') is not null then
    alter table public.factory_invoices
      drop constraint if exists factory_invoices_status_check;

    alter table public.factory_invoices
      add constraint factory_invoices_status_check
      check (status in ('pending', 'approved', 'paid', 'cancelled'));
  end if;
end $$;
