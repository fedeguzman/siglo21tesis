-- Supabase only: private writes, public food photographs. Never upload sensitive documents.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lot-photos','lot-photos',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "owners_upload_lot_photos" on storage.objects for insert to authenticated
with check (bucket_id='lot-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
