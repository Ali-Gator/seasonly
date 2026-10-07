-- The private bucket for face crops, one `<report id>.jpg` per photo report, for the draping
-- preview. No storage policy names it: RLS on storage.objects refuses anon and authenticated,
-- and only the server's secret key reads or writes it.
-- openspec/specs/draping-preview/spec.md

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crops', 'crops', false, 524288, array['image/jpeg']);
