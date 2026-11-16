-- Public bucket for catalog photos. Public = anyone can read by URL.
-- No storage.objects policies are added, so clients can't upload/overwrite;
-- upload via the dashboard or a service-role script.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
