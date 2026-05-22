alter table public.orders
  add column if not exists customer_phone text,
  add column if not exists product_type text check (
    product_type is null or product_type in (
      'graduation_cap',
      'graduation_sash',
      'graduation_gown',
      'graduation_jacket',
      'hoodie',
      'tshirt',
      'other'
    )
  ),
  add column if not exists details jsonb not null default '{}'::jsonb;

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_type text,
  storage_path text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

insert into public.factories (name, slug, description, is_active)
values
  ('Majed Batis', 'majed-batis', 'Embroidery workshop', true),
  ('Print 5', 'print-5', 'Embroidery workshop', true),
  ('Naif Design', 'naif-design', 'Embroidery workshop', true),
  ('Radwan', 'radwan', 'Embroidery workshop', true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active;
