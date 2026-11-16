-- Booking rules v2 + avatars storage
-- • Pricing lives in ONE place: public.quote_booking() — adults full price, children 50%, +5% taxes.
--   Used by the bookings trigger, the create-booking Edge Function and the app's Review screen.
-- • end_date is derived on the server: start_date + duration_days - 1 (1-day trips → end = start).
-- • Bookings are created only by the create-booking Edge Function (service role); clients can't insert.
-- • Users can cancel only upcoming bookings.
-- • Private "avatars" bucket; each user can only touch files under <their uid>/…

-- ── Pricing ──────────────────────────────────────────────────
create or replace function public.quote_booking(p_experience_id uuid, p_adults int, p_children int)
returns table (
  currency text,
  price_per_person numeric,
  adults_total numeric,
  children_total numeric,
  subtotal numeric,
  taxes numeric,
  total numeric,
  duration_days int
)
language sql
stable
set search_path = ''
as $$
  with p as (
    select e.currency,
           e.price_per_person as pp,
           e.duration_days,
           round(e.price_per_person * p_adults, 2) as a,
           round(e.price_per_person * 0.5 * p_children, 2) as c
    from public.experiences e
    where e.id = p_experience_id
      and p_adults between 1 and 10
      and p_children between 0 and 10
  )
  select currency, pp, a, c, a + c, round((a + c) * 0.05, 2), a + c + round((a + c) * 0.05, 2), duration_days
  from p;
$$;

grant execute on function public.quote_booking(uuid, int, int) to anon, authenticated;

-- ── Bookings: server-derived end date + price ────────────────
alter table public.bookings drop constraint bookings_dates_check;
alter table public.bookings add constraint bookings_dates_check check (end_date >= start_date);
alter table public.bookings add constraint bookings_party_size_check check (adults <= 10 and children <= 10);

create or replace function public.bookings_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  q record;
begin
  select * into q from public.quote_booking(new.experience_id, new.adults, new.children);
  if q.total is null then
    raise exception 'Invalid booking: unknown experience or party size' using errcode = '22023';
  end if;

  new.end_date    := new.start_date + (q.duration_days - 1);
  new.total_price := q.total;
  new.created_at  := now();

  loop
    new.booking_code := public.generate_booking_code();
    exit when not exists (select 1 from public.bookings b where b.booking_code = new.booking_code);
  end loop;

  return new;
end;
$$;

-- bookings are created by the create-booking Edge Function only
drop policy "Users can create bookings" on public.bookings;
revoke insert on public.bookings from authenticated;
alter table public.bookings alter column end_date set default current_date; -- overwritten by the trigger

-- cancel only bookings that haven't ended yet
drop policy "Users can cancel their open bookings" on public.bookings;
create policy "Users can cancel their upcoming bookings" on public.bookings
  for update to authenticated
  using ((select auth.uid()) = user_id and status in ('pending', 'confirmed') and end_date >= current_date)
  with check ((select auth.uid()) = user_id and status = 'cancelled');

-- ── Avatars bucket (private, per-user folder) ────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users read their own avatar files" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users upload to their own avatar folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users update their own avatar files" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own avatar files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
