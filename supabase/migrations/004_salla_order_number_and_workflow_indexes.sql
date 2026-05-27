alter table public.orders
  add column if not exists salla_order_number text;

create index if not exists orders_salla_order_number_idx
  on public.orders(salla_order_number)
  where salla_order_number is not null and length(trim(salla_order_number)) > 0;
