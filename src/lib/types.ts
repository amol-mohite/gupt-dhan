export type FieldType = 'text' | 'email' | 'password' | 'url' | 'number' | 'textarea' | 'secret';

export type EntityType = 'credential' | 'document' | 'note' | 'personal_info' | 'project';

export type DocumentCategory =
  | 'identity'
  | 'banking'
  | 'insurance'
  | 'property'
  | 'education'
  | 'work'
  | 'legal'
  | 'business'
  | 'personal'
  | 'other';

export type PersonalInfoCategory = 'identity' | 'bank' | 'other';

export type SecurityEventType =
  | 'login'
  | 'logout'
  | 'sensitive_unlocked'
  | 'sensitive_locked'
  | 'document_viewed'
  | 'credential_copied'
  | 'password_changed'
  | 'pin_changed'
  | 'record_deleted'
  | 'record_created'
  | 'record_updated';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  sensitive_pin_hash: string | null;
  auto_lock_seconds: number;
  theme: string;
  biometric_enabled: boolean;
  enc_salt: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  website_url: string | null;
  is_custom: boolean;
  created_at: string;
}

export interface Credential {
  id: string;
  user_id: string;
  project_id: string | null;
  service_id: string | null;
  title: string;
  notes: string | null;
  is_sensitive: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  service?: Service;
  project?: Project;
  fields?: CredentialField[];
}

export interface CredentialField {
  id: string;
  user_id: string;
  credential_id: string;
  field_name: string;
  field_value: string | null;
  field_type: FieldType;
  is_sensitive: boolean;
  sort_order: number;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  category: DocumentCategory;
  file_path: string | null;
  file_type: string | null;
  file_size: number | null;
  expiry_date: string | null;
  is_sensitive: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  project?: Project;
}

export interface Note {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  content: string | null;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
  project?: Project;
}

export interface PersonalInfo {
  id: string;
  user_id: string;
  category: PersonalInfoCategory;
  title: string;
  data: Record<string, string>;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface EntityTag {
  id: string;
  user_id: string;
  tag_id: string;
  entity_type: EntityType;
  entity_id: string;
  created_at: string;
  tag?: Tag;
}

export interface Favorite {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  created_at: string;
}

export interface SecurityLog {
  id: string;
  user_id: string;
  event_type: SecurityEventType;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  created_at: string;
}
