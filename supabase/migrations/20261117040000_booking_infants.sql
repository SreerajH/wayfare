-- Infants (under 2) travel free: counted on the booking, not priced.
alter table public.bookings add column infants int not null default 0 check (infants between 0 and 4);
grant select (infants) on public.bookings to authenticated;
