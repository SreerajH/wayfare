-- Wayfare: catalog seed (idempotent — keyed on slugs)
-- Image URLs point at the public "images" bucket: images/destinations/<slug>.jpg,
-- images/experiences/<slug>.jpg, images/itinerary/<experience-slug>-day-<n>.jpg

insert into public.destinations (slug, name, country, country_code, continent, description, rating, review_count, is_trending, hero_image_url)
select v.slug, v.name, v.country, v.cc, v.continent::public.continent, v.description, v.rating, v.reviews, v.trending,
       'https://ysixqkjofemggtnaexsk.supabase.co/storage/v1/object/public/images/destinations/' || v.slug || '.jpg'
from (values
  ('tokyo', 'Tokyo', 'Japan', 'JP', 'asia',
   'Tokyo is Japan''s vibrant capital, a massive, futuristic metropolis blending ancient traditions with neon-lit streets, world-class food and quiet temple gardens.',
   4.9, 267, true),
  ('kyoto', 'Kyoto', 'Japan', 'JP', 'asia',
   'Japan''s former imperial capital: wooden machiya streets, more than a thousand temples, moss gardens and the lantern-lit lanes of Gion.',
   4.8, 198, true),
  ('bali', 'Bali', 'Indonesia', 'ID', 'asia',
   'Emerald rice terraces, cliff-top temples and surf beaches, with Ubud''s craft villages at the island''s green heart.',
   4.7, 412, true),
  ('paris', 'Paris', 'France', 'FR', 'europe',
   'Grand boulevards, riverside bookstalls and corner bistros — the city of the Louvre, the Eiffel Tower and long café afternoons.',
   4.8, 531, true),
  ('cape-town', 'Cape Town', 'South Africa', 'ZA', 'africa',
   'A harbour city under Table Mountain, minutes from penguin beaches, the Cape Peninsula and the Winelands.',
   4.7, 189, false),
  ('new-york', 'New York', 'United States', 'US', 'north_america',
   'Skyline views, world-famous museums and a food scene from every corner of the globe, all a subway ride apart.',
   4.6, 644, false),
  ('rio-de-janeiro', 'Rio de Janeiro', 'Brazil', 'BR', 'south_america',
   'Beaches framed by granite peaks, samba in Lapa and the open arms of Christ the Redeemer above the bay.',
   4.6, 302, false)
) as v(slug, name, country, cc, continent, description, rating, reviews, trending)
on conflict (slug) do nothing;

insert into public.experiences (destination_id, slug, title, subtitle, duration_days, duration_nights, price_per_person, rating, review_count, is_trending, cover_image_url)
select d.id, v.slug, v.title, v.subtitle, v.days, v.nights, v.price, v.rating, v.reviews, v.trending,
       'https://ysixqkjofemggtnaexsk.supabase.co/storage/v1/object/public/images/experiences/' || v.slug || '.jpg'
from (values
  ('tokyo', 'tokyo-essentials', 'Tokyo Essentials', 'Guided tour', 4, 3, 999.00, 4.8, 169, true),
  ('tokyo', 'culture-and-cuisine', 'Culture & Cuisine', 'Food & culture tour', 4, 3, 890.00, 4.7, 128, true),
  ('kyoto', 'kyoto-temples-and-tea', 'Temples & Tea Ceremony', 'Guided tour', 3, 2, 640.00, 4.8, 142, true),
  ('kyoto', 'arashiyama-day-trip', 'Arashiyama Bamboo Grove', 'Day trip', 1, 0, 120.00, 4.7, 233, false),
  ('bali', 'ubud-rice-terraces', 'Ubud Rice Terraces & Temples', 'Guided tour', 3, 2, 420.00, 4.8, 207, true),
  ('bali', 'nusa-island-hopping', 'Nusa Islands Hopping', 'Boat trip', 2, 1, 310.00, 4.6, 176, false),
  ('paris', 'paris-classics', 'Paris Classics', 'Guided tour', 4, 3, 1150.00, 4.8, 318, true),
  ('paris', 'versailles-day-trip', 'Versailles Day Trip', 'Day trip', 1, 0, 135.00, 4.7, 402, false),
  ('cape-town', 'cape-peninsula-and-penguins', 'Cape Peninsula & Penguins', 'Guided tour', 2, 1, 380.00, 4.8, 154, false),
  ('cape-town', 'winelands-escape', 'Winelands Escape', 'Food & wine', 3, 2, 560.00, 4.7, 98, false),
  ('new-york', 'new-york-highlights', 'New York Highlights', 'Guided tour', 4, 3, 1290.00, 4.6, 287, true),
  ('new-york', 'brooklyn-food-walk', 'Brooklyn Food Walk', 'Food tour', 1, 0, 95.00, 4.8, 211, false),
  ('rio-de-janeiro', 'rio-icons', 'Christ the Redeemer & Sugarloaf', 'Guided tour', 2, 1, 340.00, 4.7, 196, false),
  ('rio-de-janeiro', 'samba-and-santa-teresa', 'Samba & Santa Teresa Nights', 'Night tour', 1, 0, 110.00, 4.6, 143, false)
) as v(dest, slug, title, subtitle, days, nights, price, rating, reviews, trending)
join public.destinations d on d.slug = v.dest
on conflict (slug) do nothing;

insert into public.itinerary_days (experience_id, day_number, title, description, image_url)
select e.id, v.day, v.title, v.description,
       'https://ysixqkjofemggtnaexsk.supabase.co/storage/v1/object/public/images/itinerary/tokyo-essentials-day-' || v.day || '.jpg'
from (values
  (1, 'Arrival & City Intro', 'Arrive in Tokyo, check in and take a relaxed evening walk through Shinjuku.'),
  (2, 'Historic Tokyo', 'Senso-ji temple, Nakamise street snacks and a river cruise to Hamarikyu Gardens.'),
  (3, 'Modern City Life', 'Shibuya crossing, Harajuku boutiques and sunset views from Tokyo Skytree.'),
  (4, 'Departure', 'Breakfast at the hotel, last-minute shopping in Ginza and airport transfer.')
) as v(day, title, description)
join public.experiences e on e.slug = 'tokyo-essentials'
on conflict (experience_id, day_number) do nothing;

insert into public.inclusions (experience_id, icon, title, detail, sort_order)
select e.id, v.icon, v.title, v.detail, v.sort_order
from (values
  ('building', 'Accommodation', '4-star hotel in Shinjuku, 3 nights', 1),
  ('bus', 'Local transportation', '72-hour metro pass + airport transfer', 2),
  ('people', 'Guided city tours', 'English-speaking guide on days 2 and 3', 3),
  ('coffee', 'Daily breakfast', 'Japanese & western buffet at the hotel', 4)
) as v(icon, title, detail, sort_order)
join public.experiences e on e.slug = 'tokyo-essentials'
where not exists (select 1 from public.inclusions i where i.experience_id = e.id);
