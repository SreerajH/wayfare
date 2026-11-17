-- Cover photos supplied by the client: Shibuya Crossing for Tokyo Essentials, DUMBO arches for Brooklyn Food Walk.
-- New file names so cached copies of the old covers aren't reused.
update public.experiences set cover_image_url = 'https://ysixqkjofemggtnaexsk.supabase.co/storage/v1/object/public/images/experiences/tokyo-essentials-shibuya.webp' where slug = 'tokyo-essentials';
update public.experiences set cover_image_url = 'https://ysixqkjofemggtnaexsk.supabase.co/storage/v1/object/public/images/experiences/brooklyn-food-walk-dumbo.webp' where slug = 'brooklyn-food-walk';
