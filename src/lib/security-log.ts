import { supabase } from './supabase';
import type { SecurityEventType } from './types';

export async function logSecurityEvent(
  userId: string,
  eventType: SecurityEventType,
  description?: string,
  entityType?: string,
  entityId?: string
) {
  try {
    await supabase.from('security_logs').insert({
      user_id: userId,
      event_type: eventType,
      description,
      entity_type: entityType,
      entity_id: entityId,
    });
  } catch (err) {
    console.error('Failed to log security event:', err);
  }
}
