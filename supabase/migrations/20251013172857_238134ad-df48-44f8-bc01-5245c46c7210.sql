-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  104857600, -- 100MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4']
);

-- Storage policies for media bucket
CREATE POLICY "Anyone can view media files"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own media files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own media files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);