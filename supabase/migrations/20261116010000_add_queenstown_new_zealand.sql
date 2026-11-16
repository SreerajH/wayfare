-- Wayfare: first Oceania destination — Queenstown, New Zealand (idempotent, keyed on slugs).
-- ALREADY APPLIED to the hosted project on 2026-11-16 (via Supabase MCP); kept here so the repo matches the database.
-- Photos: CC0 (public domain) images by Bernard Spragg via Wikimedia Commons, loaded from upload.wikimedia.org.
-- To host them in the "images" bucket instead: save them under supabase/seed-images/, run
-- scripts/upload-seed-images.mjs, and update the URLs below.
do $$
declare
  remarkables constant text := 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Remarkable_Mountains_Queenstown_NZ_(24384753870).jpg/1280px-Remarkable_Mountains_Queenstown_NZ_(24384753870).jpg';
  milford_a constant text := 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Milford_Sound_New_Zealand._(16508409635).jpg/1280px-Milford_Sound_New_Zealand._(16508409635).jpg';
  milford_b constant text := 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Milford_Sound_NZ._(16944937040).jpg/1280px-Milford_Sound_NZ._(16944937040).jpg';
begin
  insert into public.destinations (slug, name, country, country_code, continent, description, rating, review_count, is_trending, hero_image_url)
  values ('queenstown', 'Queenstown', 'New Zealand', 'NZ', 'oceania',
          'New Zealand''s alpine playground on the shores of Lake Wakatipu: the jagged Remarkables, world-famous bungy and jet-boat rides, vineyards in Gibbston Valley and day trips into the fiords of Milford Sound.',
          4.9, 236, true, remarkables)
  on conflict (slug) do nothing;

  insert into public.experiences (destination_id, slug, title, subtitle, duration_days, duration_nights, price_per_person, rating, review_count, is_trending, cover_image_url)
  select d.id, v.slug, v.title, v.subtitle, v.days, v.nights, v.price, v.rating, v.reviews, v.trending, v.cover
  from (values
    ('queenstown-alpine-escape', 'Queenstown Alpine Escape', 'Guided tour', 4, 3, 1180.00, 4.9, 154, true, milford_a),
    ('milford-sound-cruise', 'Milford Sound Day Cruise', 'Day trip', 1, 0, 185.00, 4.8, 312, false, milford_b)
  ) as v(slug, title, subtitle, days, nights, price, rating, reviews, trending, cover)
  join public.destinations d on d.slug = 'queenstown'
  on conflict (slug) do nothing;

  insert into public.itinerary_days (experience_id, day_number, title, description, image_url)
  select e.id, v.day, v.title, v.description, v.image
  from (values
    (1, 'Arrival & Lakefront', 'Arrive in Queenstown, check in and ride the Skyline Gondola for sunset over Lake Wakatipu.', remarkables),
    (2, 'Milford Sound', 'Full-day coach and cruise through Fiordland National Park, past Mitre Peak and its waterfalls.', milford_a),
    (3, 'Adventure Day', 'Shotover jet-boat ride in the morning, then a Gibbston Valley winery lunch.', milford_b),
    (4, 'Departure', 'Breakfast by the lake, a last stroll through town and airport transfer.', remarkables)
  ) as v(day, title, description, image)
  join public.experiences e on e.slug = 'queenstown-alpine-escape'
  on conflict (experience_id, day_number) do nothing;

  insert into public.inclusions (experience_id, icon, title, detail, sort_order)
  select e.id, v.icon, v.title, v.detail, v.sort_order
  from (values
    ('building', 'Accommodation', 'Lakeview 4-star hotel, 3 nights', 1),
    ('bus', 'Local transportation', 'Airport transfers + Milford Sound coach', 2),
    ('people', 'Guided tours', 'Local guide on days 2 and 3', 3),
    ('coffee', 'Daily breakfast', 'Hotel breakfast every morning', 4)
  ) as v(icon, title, detail, sort_order)
  join public.experiences e on e.slug = 'queenstown-alpine-escape'
  where not exists (select 1 from public.inclusions i where i.experience_id = e.id);
end $$;
