-- Make server-filled booking columns optional in the generated Insert types.
-- The bookings_before_insert trigger still overwrites booking_code, total_price and status.
alter table public.bookings
  alter column booking_code set default '',
  alter column total_price  set default 0,
  alter column user_id      set default auth.uid();

alter table public.saved_items
  alter column user_id set default auth.uid();
