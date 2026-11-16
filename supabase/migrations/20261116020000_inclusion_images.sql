-- Photos for "What's included" rows. Nullable: rows without one keep the icon-only layout.
alter table public.inclusions add column if not exists image_url text;

-- inclusions uses column-level grants, so expose the new column explicitly (read-only).
grant select (image_url) on public.inclusions to anon, authenticated;

-- Tokyo Essentials photos (exported from Figma "Wayfare / Popular experiences 2").
-- Files live in supabase/seed-images/inclusions/ and are uploaded with scripts/upload-seed-images.mjs.
update public.inclusions i
set image_url = 'https://ysixqkjofemggtnaexsk.supabase.co/storage/v1/object/public/images/inclusions/tokyo-essentials-' || v.slug || '.webp'
from public.experiences e,
  (values (1, 'accommodation'), (2, 'transport'), (3, 'tours'), (4, 'breakfast')) as v(sort_order, slug)
where e.id = i.experience_id
  and e.slug = 'tokyo-essentials'
  and i.sort_order = v.sort_order;
