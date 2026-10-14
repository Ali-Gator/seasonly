-- The crops bucket also holds each crop's outline, `<report id>.mask.png`, for the draping
-- preview's cut-out. Still private, still 512 KB, still no storage policy.
-- openspec/specs/draping-preview/spec.md

update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png'] where id = 'crops';
