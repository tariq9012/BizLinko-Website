import type { Database, Tables } from "@/integrations/supabase/types";

export type MessageRow = Tables<"messages">;
export type ApplicationStatus = Database["public"]["Enums"]["application_status"];

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

export function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
  };
}

/** One row of get_my_conversations() — already joined/aggregated server
 * side (job, company, candidate, last message preview, unread count) so
 * the conversation list never has to fetch messages itself. */
export interface ConversationSummary {
  conversationId: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  companyId: string;
  companyName: string;
  companyLogo: string | null;
  candidateId: string;
  candidateName: string;
  candidateAvatar: string | null;
  applicationStatus: ApplicationStatus;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  lastMessageDeleted: boolean;
  unreadCount: number;
}

type ConversationSummaryRow =
  Database["public"]["Functions"]["get_my_conversations"]["Returns"][number];

export function mapConversationSummary(row: ConversationSummaryRow): ConversationSummary {
  const first = row.candidate_first_name ?? "";
  const last = row.candidate_last_name ?? "";
  return {
    conversationId: row.conversation_id,
    applicationId: row.application_id,
    jobId: row.job_id,
    jobTitle: row.job_title,
    companyId: row.company_id,
    companyName: row.company_name,
    companyLogo: row.company_logo,
    candidateId: row.candidate_id,
    candidateName: `${first} ${last}`.trim() || "Candidate",
    candidateAvatar: row.candidate_avatar,
    applicationStatus: row.application_status,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_body,
    lastMessageSenderId: row.last_message_sender_id,
    lastMessageDeleted: !!row.last_message_deleted_at,
    unreadCount: Number(row.unread_count ?? 0),
  };
}

/** Terminal statuses where the DB stops accepting new messages — mirrors
 * conversation_is_messageable() in the migration. */
const NOT_MESSAGEABLE: ApplicationStatus[] = ["rejected", "withdrawn"];

export function isConversationMessageable(status: ApplicationStatus): boolean {
  return !NOT_MESSAGEABLE.includes(status);
}

export const MESSAGE_MAX_LENGTH = 5000;
