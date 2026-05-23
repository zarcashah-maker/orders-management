alter table public.orders
  add column if not exists due_date date,
  add column if not exists general_notes text,
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists created_by text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists archived boolean not null default false;

update public.orders
set
  created_at = coalesce(created_at, order_date::timestamptz, now()),
  updated_at = coalesce(updated_at, order_date::timestamptz, created_at, now())
where created_at is null
  or updated_at is null;

create table if not exists public.order_images (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  url text not null,
  caption text,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'order_images'
      and column_name = 'order_id'
      and data_type <> 'text'
  ) then
    alter table public.order_images drop constraint if exists order_images_order_id_fkey;
    alter table public.order_images alter column order_id type text using order_id::text;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.order_images'::regclass
      and conname = 'order_images_order_id_fkey'
  ) then
    alter table public.order_images
      add constraint order_images_order_id_fkey
      foreign key (order_id) references public.orders(id) on delete cascade;
  end if;
end $$;

create index if not exists order_images_order_id_idx on public.order_images(order_id);
create index if not exists attachments_order_id_idx on public.attachments(order_id);
create index if not exists order_comments_order_id_idx on public.order_comments(order_id);
create index if not exists order_status_history_order_id_idx on public.order_status_history(order_id);
create index if not exists orders_assigned_factory_id_idx on public.orders(assigned_factory_id);
create index if not exists orders_product_type_idx on public.orders(product_type);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_general_notes_idx
  on public.orders(general_notes)
  where general_notes is not null and length(trim(general_notes)) > 0;

insert into storage.buckets (id, name, public)
values ('order-attachments', 'order-attachments', true)
on conflict (id) do update set public = excluded.public;
