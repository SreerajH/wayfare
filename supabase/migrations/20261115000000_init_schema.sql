-- Wayfare: initial schema
-- Catalog (destinations, experiences, itinerary_days, inclusions) is public read-only.
-- User data (profiles, saved_items, bookings) is owner-only via RLS.

-- ─────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────
create type public.continent as enum ('asia', 'europe', 'africa', 'north_america', 'south_america', 'oceania');
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed');

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  avatar_url  text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table public.destinations (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  country         text not null,
  country_code    char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  description     text,
  hero_image_url  text,
  rating          numeric(2,1) check (rating between 0 and 5),
  review_count    int not null default 0 check (review_count >= 0),
  continent       public.continent not null,
  is_trending     boolean not null default false,
  created_at      timestamptz not null default now()
);

create table public.experiences (
  id                uuid primary key default gen_random_uuid(),
  destination_id    uuid not null references public.destinations (id) on delete cascade,
  slug              text not null unique,
  title             text not null,
  subtitle          text,
  duration_days     int not null check (duration_days > 0),
  duration_nights   int not null check (duration_nights >= 0),
  price_per_person  numeric(10,2) not null check (price_per_person >= 0),
  currency          text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  cover_image_url   text,
  rating            numeric(2,1) check (rating between 0 and 5),
  review_count      int not null default 0 check (review_count >= 0),
  is_trending       boolean not null default false,
  created_at        timestamptz not null default now()
);

create table public.itinerary_days (
  id             uuid primary key default gen_random_uuid(),
  experience_id  uuid not null references public.experiences (id) on delete cascade,
  day_number     int not null check (day_number > 0),
  title          text not null,
  description    text,
  image_url      text,
  unique (experience_id, day_number)
);

create table public.inclusions (
  id             uuid primary key default gen_random_uuid(),
  experience_id  uuid not null references public.experiences (id) on delete cascade,
  icon           text not null,
  title          text not null,
  detail         text,
  sort_order     int not null default 0
);

create table public.saved_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  destination_id  uuid references public.destinations (id) on delete cascade,
  experience_id   uuid references public.experiences (id) on delete cascade,
  created_at      timestamptz not null default now(),
  constraint saved_items_exactly_one_target check (num_nonnulls(destination_id, experience_id) = 1),
  constraint saved_items_user_destination_key unique (user_id, destination_id),
  constraint saved_items_user_experience_key unique (user_id, experience_id)
);

create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  experience_id  uuid not null references public.experiences (id) on delete restrict,
  start_date     date not null,
  end_date       date not null,
  adults         int not null default 1 check (adults >= 1),
  children       int not null default 0 check (children >= 0),
  total_price    numeric(10,2) not null check (total_price >= 0),
  status         public.booking_status not null default 'pending',
  booking_code   text not null unique,
  created_at     timestamptz not null default now(),
  constraint bookings_dates_check check (end_date > start_date)
);

-- ─────────────────────────────────────────────────────────────
-- Indexes (FKs not already covered by a leading unique-key column, + continent)
-- ─────────────────────────────────────────────────────────────
create index experiences_destination_id_idx  on public.experiences (destination_id);
create index inclusions_experience_id_idx    on public.inclusions (experience_id, sort_order);
create index saved_items_destination_id_idx  on public.saved_items (destination_id);
create index saved_items_experience_id_idx   on public.saved_items (experience_id);
create index bookings_user_id_idx            on public.bookings (user_id, created_at desc);
create index bookings_experience_id_idx      on public.bookings (experience_id);
create index destinations_continent_idx      on public.destinations (continent);
-- itinerary_days(experience_id) is covered by unique (experience_id, day_number)
-- saved_items(user_id) is covered by unique (user_id, destination_id)

-- ─────────────────────────────────────────────────────────────
-- Functions & triggers
-- ─────────────────────────────────────────────────────────────

-- 'WF-' + 6 chars from an unambiguous uppercase alphabet (no 0/O/1/I), crypto-random
create or replace function public.generate_booking_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(6);
  code text := 'WF-';
begin
  for i in 0..5 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end;
$$;

-- Server decides code, price and initial status — the client can't pick them
create or replace function public.bookings_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  unit_price numeric(10,2);
begin
  select e.price_per_person into unit_price
  from public.experiences e
  where e.id = new.experience_id;

  if unit_price is null then
    raise exception 'Unknown experience %', new.experience_id;
  end if;

  new.status       := 'pending';
  new.total_price  := unit_price * (new.adults + new.children);
  new.created_at   := now();

  loop
    new.booking_code := public.generate_booking_code();
    exit when not exists (select 1 from public.bookings b where b.booking_code = new.booking_code);
  end loop;

  return new;
end;
$$;

create trigger bookings_before_insert
  before insert on public.bookings
  for each row execute function public.bookings_before_insert();

-- Auto-create a profile for every new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- trigger functions are not meant to be called through the API
revoke execute on function public.handle_new_user()        from public, anon, authenticated;
revoke execute on function public.bookings_before_insert() from public, anon, authenticated;
revoke execute on function public.generate_booking_code()  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.destinations   enable row level security;
alter table public.experiences    enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.inclusions     enable row level security;
alter table public.saved_items    enable row level security;
alter table public.bookings       enable row level security;

-- Catalog: public read, no client writes (no write policies + privileges revoked)
create policy "Catalog is readable by everyone" on public.destinations   for select to anon, authenticated using (true);
create policy "Catalog is readable by everyone" on public.experiences    for select to anon, authenticated using (true);
create policy "Catalog is readable by everyone" on public.itinerary_days for select to anon, authenticated using (true);
create policy "Catalog is readable by everyone" on public.inclusions     for select to anon, authenticated using (true);

revoke insert, update, delete, truncate on public.destinations, public.experiences, public.itinerary_days, public.inclusions
  from anon, authenticated;

-- Profiles: own row only; created by the trigger, editable fields limited
create policy "Users can read their own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on public.profiles from anon;
revoke insert, update, delete, truncate on public.profiles from authenticated;
grant update (full_name, avatar_url, phone) on public.profiles to authenticated;

-- Saved items: own rows; select / insert / delete
create policy "Users can read their saved items" on public.saved_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can save items" on public.saved_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their saved items" on public.saved_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.saved_items from anon;
revoke update, truncate on public.saved_items from authenticated;

-- Bookings: own rows; select / insert; the only update allowed is → 'cancelled'
create policy "Users can read their bookings" on public.bookings
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create bookings" on public.bookings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can cancel their open bookings" on public.bookings
  for update to authenticated
  using ((select auth.uid()) = user_id and status in ('pending', 'confirmed'))
  with check ((select auth.uid()) = user_id and status = 'cancelled');

revoke all on public.bookings from anon;
revoke update, delete, truncate on public.bookings from authenticated;
grant update (status) on public.bookings to authenticated;  -- column-level: status is the only writable column
