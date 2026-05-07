-- Create storage bucket for Running Mechanics PDF documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('running-mechanics-docs', 'running-mechanics-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload PDFs to their own folder
CREATE POLICY "Users can upload running mechanics docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'running-mechanics-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to read (public bucket)
CREATE POLICY "Running mechanics docs are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'running-mechanics-docs');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own running mechanics docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'running-mechanics-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
