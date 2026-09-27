import type { Database, Tables } from "@/integrations/supabase/types";

export type NotificationRow = Tables<"notifications">;
export type NotificationType = Database["public"]["Enums"]["notification_type"];

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actionUrl: row.action_url,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
