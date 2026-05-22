alter table public.orders
  drop constraint if exists orders_product_type_check;

alter table public.orders
  add constraint orders_product_type_check check (
    product_type is null or product_type in (
      'graduation_cap',
      'graduation_sash',
      'graduation_gown',
      'graduation_jacket',
      'hoodie',
      'tshirt',
      'other'
    )
  );
