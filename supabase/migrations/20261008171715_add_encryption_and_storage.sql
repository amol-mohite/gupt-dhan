/*
# Add encryption salt and storage bucket for documents

## Changes
1. Add `enc_salt` column to profiles — stores the base64-encoded salt used for
   PBKDF2 key derivation from the user's password. The encryption key is used to
   encrypt/decrypt sensitive field values client-side.
2. Create a private (non-public) storage bucket `vault-documents` for document uploads.
3. Add storage policies so authenticated users can CRUD only their own files
   (files are stored under a `user_id/` prefix path).

## Security
- enc_salt is not itself secret (salt's purpose is to prevent rainbow table attacks)
- Storage bucket is private — files require authenticated access
- Storage RLS: users can only manage files under their own user_id prefix
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS enc_salt text;

-- Create private storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-documents', 'vault-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can manage their own files (path starts with their user_id)
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vault-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own documents" ON storage.objects;
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vault-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vault-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vault-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'vault-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
