alter table public.orders
  add column if not exists is_urgent boolean not null default false;

create index if not exists orders_is_urgent_idx
  on public.orders(is_urgent)
  where is_urgent = true;

create sequence if not exists public.order_number_t_seq;

select setval(
  'public.order_number_t_seq',
  greatest(
    coalesce((
      select max((regexp_match(order_number, '^T-([0-9]+)$'))[1]::integer)
      from public.orders
      where order_number ~ '^T-[0-9]+$'
    ), 0),
    1
  ),
  coalesce((
    select max((regexp_match(order_number, '^T-([0-9]+)$'))[1]::integer)
    from public.orders
    where order_number ~ '^T-[0-9]+$'
  ), 0) > 0
);

create or replace function public.generate_internal_order_number()
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
    next_number := nextval('public.order_number_t_seq');
    candidate := 'T-' || lpad(next_number::text, 3, '0');

    if not exists (
      select 1
      from public.orders
      where order_number = candidate
    ) then
      return candidate;
    end if;
  end loop;
end;
$$;

grant usage on schema public to authenticated;
revoke execute on function public.generate_internal_order_number() from public;
grant execute on function public.generate_internal_order_number() to authenticated;

update public.factories
set name = case
  when name = 'ماجد باتيس' then 'ماجد'
  when name = 'نايف ديزاين' then 'نايف ديزاين - Visualz'
  else name
end
where name in ('ماجد باتيس', 'نايف ديزاين');

with renamed_factories as (
  select id, name
  from public.factories
  where name in ('ماجد', 'نايف ديزاين - Visualz')
)
update public.app_users
set name = renamed_factories.name
from renamed_factories
where app_users.factory_id = renamed_factories.id
  and app_users.role = 'Factory'
  and app_users.name in ('ماجد باتيس', 'نايف ديزاين');
