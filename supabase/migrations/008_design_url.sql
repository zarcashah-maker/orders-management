alter table public.orders
  add column if not exists design_url text;

create index if not exists orders_design_url_idx
  on public.orders(design_url)
  where design_url is not null and length(trim(design_url)) > 0;
