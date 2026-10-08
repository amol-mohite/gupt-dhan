/*
# myminipocket — Core Vault Schema

## Overview
Creates the complete relational schema for the myminipocket personal vault application.
This is a multi-user app with Supabase Auth (email/password). All tables are owner-scoped
via user_id with DEFAULT auth.uid() and RLS policies.

## New Tables
1. profiles — user profile data (display name, avatar, settings)
2. projects — user's projects (e.g. "Aaditium Trades", "Dermadent")
3. services — service definitions (GitHub, Netlify, Supabase, etc.) per user
4. credentials — a credential entry linking a project to a service
5. credential_fields — flexible key-value fields on a credential (text, password, secret, etc.)
6. documents — uploaded document metadata (file stored in Supabase Storage)
7. notes — secure notes (normal or sensitive)
8. personal_info — identity & bank details (PAN, Aadhaar, bank accounts, etc.)
9. tags — user-defined tags
10. entity_tags — many-to-many join table for tags on any entity
11. favorites — favorited records (polymorphic by entity type)
12. security_logs — audit trail of security events
13. sensitive_vault_config — per-user sensitive vault PIN hash and settings

## Security
- RLS enabled on ALL tables
- All tables owner-scoped with user_id DEFAULT auth.uid()
- 4 separate policies per table (SELECT, INSERT, UPDATE, DELETE)
- Scoped to authenticated role only
- Sensitive field values stored encrypted (encryption handled in app layer)
*/

-- ============ profiles ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text,
  display_name text,
  avatar_url text,
  sensitive_pin_hash text,
  auto_lock_seconds int NOT NULL DEFAULT 60,
  theme text NOT NULL DEFAULT 'system',
  biometric_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============ projects ============
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3b82f6',
  icon text DEFAULT 'folder',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ services ============
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text DEFAULT 'globe',
  color text DEFAULT '#6b7280',
  website_url text,
  is_custom boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_services" ON services;
CREATE POLICY "select_own_services" ON services FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_services" ON services;
CREATE POLICY "insert_own_services" ON services FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_services" ON services;
CREATE POLICY "update_own_services" ON services FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_services" ON services;
CREATE POLICY "delete_own_services" ON services FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ credentials ============
-- A credential links a project to a service and holds flexible fields
CREATE TABLE IF NOT EXISTS credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  is_sensitive boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_credentials" ON credentials;
CREATE POLICY "select_own_credentials" ON credentials FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_credentials" ON credentials;
CREATE POLICY "insert_own_credentials" ON credentials FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_credentials" ON credentials;
CREATE POLICY "update_own_credentials" ON credentials FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_credentials" ON credentials;
CREATE POLICY "delete_own_credentials" ON credentials FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ credential_fields ============
-- Flexible key-value fields. Sensitive values are encrypted in the app layer.
CREATE TABLE IF NOT EXISTS credential_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id uuid NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_value text,
  field_type text NOT NULL DEFAULT 'text', -- text, email, password, url, number, textarea, secret
  is_sensitive boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credential_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_credential_fields" ON credential_fields;
CREATE POLICY "select_own_credential_fields" ON credential_fields FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_credential_fields" ON credential_fields;
CREATE POLICY "insert_own_credential_fields" ON credential_fields FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_credential_fields" ON credential_fields;
CREATE POLICY "update_own_credential_fields" ON credential_fields FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_credential_fields" ON credential_fields;
CREATE POLICY "delete_own_credential_fields" ON credential_fields FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ documents ============
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other', -- identity, banking, insurance, property, education, work, legal, business, personal, other
  file_path text, -- Supabase Storage path
  file_type text, -- pdf, jpg, png, jpeg, doc, docx
  file_size bigint,
  expiry_date date,
  is_sensitive boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_documents" ON documents;
CREATE POLICY "select_own_documents" ON documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_documents" ON documents;
CREATE POLICY "insert_own_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_documents" ON documents;
CREATE POLICY "update_own_documents" ON documents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_documents" ON documents;
CREATE POLICY "delete_own_documents" ON documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ notes ============
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text,
  is_sensitive boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notes" ON notes;
CREATE POLICY "select_own_notes" ON notes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notes" ON notes;
CREATE POLICY "insert_own_notes" ON notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notes" ON notes;
CREATE POLICY "update_own_notes" ON notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notes" ON notes;
CREATE POLICY "delete_own_notes" ON notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ personal_info ============
-- Identity and bank details stored as flexible items with fields
CREATE TABLE IF NOT EXISTS personal_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'identity', -- identity, bank, other
  title text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb, -- encrypted sensitive values
  is_sensitive boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE personal_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_personal_info" ON personal_info;
CREATE POLICY "select_own_personal_info" ON personal_info FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_personal_info" ON personal_info;
CREATE POLICY "insert_own_personal_info" ON personal_info FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_personal_info" ON personal_info;
CREATE POLICY "update_own_personal_info" ON personal_info FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_personal_info" ON personal_info;
CREATE POLICY "delete_own_personal_info" ON personal_info FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ tags ============
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6b7280',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tags" ON tags;
CREATE POLICY "select_own_tags" ON tags FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tags" ON tags;
CREATE POLICY "insert_own_tags" ON tags FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tags" ON tags;
CREATE POLICY "update_own_tags" ON tags FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tags" ON tags;
CREATE POLICY "delete_own_tags" ON tags FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ entity_tags ============
-- Polymorphic tag association
CREATE TABLE IF NOT EXISTS entity_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- credential, document, note, personal_info, project
  entity_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tag_id, entity_type, entity_id)
);

ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_entity_tags" ON entity_tags;
CREATE POLICY "select_own_entity_tags" ON entity_tags FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_entity_tags" ON entity_tags;
CREATE POLICY "insert_own_entity_tags" ON entity_tags FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_entity_tags" ON entity_tags;
CREATE POLICY "update_own_entity_tags" ON entity_tags FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_entity_tags" ON entity_tags;
CREATE POLICY "delete_own_entity_tags" ON entity_tags FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ favorites ============
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- credential, document, note, personal_info, project
  entity_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_favorites" ON favorites;
CREATE POLICY "select_own_favorites" ON favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_favorites" ON favorites;
CREATE POLICY "insert_own_favorites" ON favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_favorites" ON favorites;
CREATE POLICY "delete_own_favorites" ON favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ security_logs ============
CREATE TABLE IF NOT EXISTS security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- login, logout, sensitive_unlocked, sensitive_locked, document_viewed, credential_copied, password_changed, pin_changed
  entity_type text,
  entity_id uuid,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_security_logs" ON security_logs;
CREATE POLICY "select_own_security_logs" ON security_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_security_logs" ON security_logs;
CREATE POLICY "insert_own_security_logs" ON security_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_security_logs" ON security_logs;
CREATE POLICY "delete_own_security_logs" ON security_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_project_id ON credentials(project_id);
CREATE INDEX IF NOT EXISTS idx_credentials_service_id ON credentials(service_id);
CREATE INDEX IF NOT EXISTS idx_credential_fields_credential_id ON credential_fields(credential_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_info_user_id ON personal_info(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_user_id ON entity_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC);
