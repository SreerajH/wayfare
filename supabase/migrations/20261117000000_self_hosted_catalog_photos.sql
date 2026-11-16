-- Point every catalog photo at the self-hosted WebP in the public "images" bucket.
-- Replaces 12 experience covers whose .jpg files were never uploaded, and Queenstown's
-- Wikimedia hotlinks (rate-limited). Sources and licenses: supabase/seed-images/CREDITS.md.
do $$
declare base text := 'https://ysixqkjofemggtnaexsk.supabase.co/storage/v1/object/public/images/';
begin
  update public.destinations set hero_image_url = base || 'destinations/queenstown.webp' where slug = 'queenstown';

  update public.experiences set cover_image_url = base || 'experiences/' || slug || '.webp'
  where slug in (
    'kyoto-temples-and-tea', 'arashiyama-day-trip', 'ubud-rice-terraces', 'nusa-island-hopping', 'paris-classics',
    'versailles-day-trip', 'cape-peninsula-and-penguins', 'winelands-escape', 'new-york-highlights', 'brooklyn-food-walk',
    'rio-icons', 'samba-and-santa-teresa', 'milford-sound-cruise', 'queenstown-alpine-escape'
  );

  update public.itinerary_days d set image_url = base || 'itinerary/queenstown-alpine-escape-day-' || d.day_number || '.webp'
  from public.experiences e
  where e.id = d.experience_id and e.slug = 'queenstown-alpine-escape';

  update public.inclusions i set image_url = base || 'inclusions/queenstown-alpine-escape-' || v.slug || '.webp'
  from public.experiences e,
    (values ('Accommodation', 'accommodation'), ('Local transportation', 'transport'),
            ('Guided tours', 'tours'), ('Daily breakfast', 'breakfast')) as v(title, slug)
  where e.id = i.experience_id and e.slug = 'queenstown-alpine-escape' and i.title = v.title;
end $$;
