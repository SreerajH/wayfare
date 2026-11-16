-- Point the catalog at the real photos in the "images" bucket (WebP, uploaded from supabase/seed-images/).
-- Destinations and experiences without a photo yet keep their old URL and show the branded fallback.
do $$
declare base constant text := 'https://ysixqkjofemggtnaexsk.supabase.co/storage/v1/object/public/images/';
begin
  update public.destinations
     set hero_image_url = base || 'destinations/' || slug || '.webp'
   where slug in ('tokyo', 'kyoto', 'bali', 'paris', 'cape-town', 'new-york', 'rio-de-janeiro');

  update public.experiences
     set cover_image_url = base || 'experiences/' || slug || '.webp'
   where slug in ('tokyo-essentials', 'culture-and-cuisine');

  update public.itinerary_days d
     set image_url = base || 'itinerary/tokyo-essentials-day-' || d.day_number || '.webp'
    from public.experiences e
   where e.id = d.experience_id and e.slug = 'tokyo-essentials';
end $$;
