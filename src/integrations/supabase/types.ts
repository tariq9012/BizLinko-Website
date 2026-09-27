export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      application_status_history: {
        Row: {
          application_id: string;
          changed_by: string | null;
          created_at: string;
          id: string;
          new_status: Database["public"]["Enums"]["application_status"];
          previous_status: Database["public"]["Enums"]["application_status"] | null;
        };
        Insert: {
          application_id: string;
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          new_status: Database["public"]["Enums"]["application_status"];
          previous_status?: Database["public"]["Enums"]["application_status"] | null;
        };
        Update: {
          application_id?: string;
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          new_status?: Database["public"]["Enums"]["application_status"];
          previous_status?: Database["public"]["Enums"]["application_status"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "job_applications";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          cover_image_url: string | null;
          created_at: string;
          description: string | null;
          employee_count: string | null;
          founded_year: number | null;
          id: string;
          industry: string | null;
          linkedin_url: string | null;
          location: string | null;
          logo: string | null;
          name: string;
          owner_id: string | null;
          slug: string;
          status: Database["public"]["Enums"]["account_status"];
          updated_at: string;
          verified: boolean;
          website: string | null;
        };
        Insert: {
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          employee_count?: string | null;
          founded_year?: number | null;
          id?: string;
          industry?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          logo?: string | null;
          name: string;
          owner_id?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
          verified?: boolean;
          website?: string | null;
        };
        Update: {
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          employee_count?: string | null;
          founded_year?: number | null;
          id?: string;
          industry?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          logo?: string | null;
          name?: string;
          owner_id?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
          verified?: boolean;
          website?: string | null;
        };
        Relationships: [];
      };
      employer_profiles: {
        Row: {
          company_id: string | null;
          created_at: string;
          id: string;
          job_title: string | null;
          phone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          job_title?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          job_title?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "employer_profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      interview_events: {
        Row: {
          changed_by: string | null;
          created_at: string;
          event_type: string;
          id: string;
          interview_id: string;
          new_scheduled_at: string | null;
          notes: string | null;
          previous_scheduled_at: string | null;
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          interview_id: string;
          new_scheduled_at?: string | null;
          notes?: string | null;
          previous_scheduled_at?: string | null;
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          interview_id?: string;
          new_scheduled_at?: string | null;
          notes?: string | null;
          previous_scheduled_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "interview_events_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
        ];
      };
      interview_notes: {
        Row: {
          interview_id: string;
          notes: string;
          updated_at: string;
        };
        Insert: {
          interview_id: string;
          notes?: string;
          updated_at?: string;
        };
        Update: {
          interview_id?: string;
          notes?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_notes_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: true;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
        ];
      };
      interviews: {
        Row: {
          application_id: string;
          candidate_id: string;
          cancellation_reason: string | null;
          company_id: string;
          created_at: string;
          duration_minutes: number;
          id: string;
          interview_method: Database["public"]["Enums"]["interview_method"];
          job_id: string;
          location: string | null;
          meeting_url: string | null;
          scheduled_at: string;
          scheduled_by: string | null;
          status: Database["public"]["Enums"]["interview_status"];
          timezone: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          application_id: string;
          candidate_id?: string;
          cancellation_reason?: string | null;
          company_id?: string;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          interview_method: Database["public"]["Enums"]["interview_method"];
          job_id?: string;
          location?: string | null;
          meeting_url?: string | null;
          scheduled_at: string;
          scheduled_by?: string | null;
          status?: Database["public"]["Enums"]["interview_status"];
          timezone?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          application_id?: string;
          candidate_id?: string;
          cancellation_reason?: string | null;
          company_id?: string;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          interview_method?: Database["public"]["Enums"]["interview_method"];
          job_id?: string;
          location?: string | null;
          meeting_url?: string | null;
          scheduled_at?: string;
          scheduled_by?: string | null;
          status?: Database["public"]["Enums"]["interview_status"];
          timezone?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "job_applications";
            referencedColumns: ["id"];
          },
        ];
      };
      job_applications: {
        Row: {
          applicant_id: string;
          applied_at: string;
          cover_letter: string | null;
          created_at: string;
          id: string;
          job_id: string;
          resume_id: string;
          reviewed_at: string | null;
          status: Database["public"]["Enums"]["application_status"];
          updated_at: string;
          withdrawn_at: string | null;
        };
        Insert: {
          applicant_id: string;
          applied_at?: string;
          cover_letter?: string | null;
          created_at?: string;
          id?: string;
          job_id: string;
          resume_id: string;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          updated_at?: string;
          withdrawn_at?: string | null;
        };
        Update: {
          applicant_id?: string;
          applied_at?: string;
          cover_letter?: string | null;
          created_at?: string;
          id?: string;
          job_id?: string;
          resume_id?: string;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          updated_at?: string;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_applications_resume_id_fkey";
            columns: ["resume_id"];
            isOneToOne: false;
            referencedRelation: "resumes";
            referencedColumns: ["id"];
          },
        ];
      };
      job_categories: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          icon_key: string | null;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          icon_key?: string | null;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          icon_key?: string | null;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
          application_deadline: string | null;
          benefits: string[];
          category_id: string | null;
          city: string;
          closed_at: string | null;
          company_id: string;
          country: string;
          created_at: string;
          created_by: string | null;
          description: string;
          employment_type: Database["public"]["Enums"]["employment_type"];
          experience_level: Database["public"]["Enums"]["experience_level"];
          featured: boolean;
          hide_salary: boolean;
          id: string;
          moderation_status: Database["public"]["Enums"]["job_moderation_status"];
          published_at: string | null;
          qualifications: string[];
          requirements: string[];
          responsibilities: string[];
          salary_currency: string;
          salary_max: number | null;
          salary_min: number | null;
          salary_period: Database["public"]["Enums"]["salary_period"];
          skills: string[];
          slug: string;
          status: Database["public"]["Enums"]["job_status"];
          title: string;
          updated_at: string;
          workplace_type: Database["public"]["Enums"]["workplace_type"];
        };
        Insert: {
          application_deadline?: string | null;
          benefits?: string[];
          category_id?: string | null;
          city: string;
          closed_at?: string | null;
          company_id: string;
          country: string;
          created_at?: string;
          created_by?: string | null;
          description: string;
          employment_type: Database["public"]["Enums"]["employment_type"];
          experience_level: Database["public"]["Enums"]["experience_level"];
          featured?: boolean;
          hide_salary?: boolean;
          id?: string;
          moderation_status?: Database["public"]["Enums"]["job_moderation_status"];
          published_at?: string | null;
          qualifications?: string[];
          requirements?: string[];
          responsibilities?: string[];
          salary_currency?: string;
          salary_max?: number | null;
          salary_min?: number | null;
          salary_period?: Database["public"]["Enums"]["salary_period"];
          skills?: string[];
          slug: string;
          status?: Database["public"]["Enums"]["job_status"];
          title: string;
          updated_at?: string;
          workplace_type: Database["public"]["Enums"]["workplace_type"];
        };
        Update: {
          application_deadline?: string | null;
          benefits?: string[];
          category_id?: string | null;
          city?: string;
          closed_at?: string | null;
          company_id?: string;
          country?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          employment_type?: Database["public"]["Enums"]["employment_type"];
          experience_level?: Database["public"]["Enums"]["experience_level"];
          featured?: boolean;
          hide_salary?: boolean;
          id?: string;
          moderation_status?: Database["public"]["Enums"]["job_moderation_status"];
          published_at?: string | null;
          qualifications?: string[];
          requirements?: string[];
          responsibilities?: string[];
          salary_currency?: string;
          salary_max?: number | null;
          salary_min?: number | null;
          salary_period?: Database["public"]["Enums"]["salary_period"];
          skills?: string[];
          slug?: string;
          status?: Database["public"]["Enums"]["job_status"];
          title?: string;
          updated_at?: string;
          workplace_type?: Database["public"]["Enums"]["workplace_type"];
        };
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "job_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_education: {
        Row: {
          created_at: string;
          degree: string | null;
          description: string | null;
          end_date: string | null;
          field_of_study: string | null;
          grade: string | null;
          id: string;
          institution: string;
          start_date: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          degree?: string | null;
          description?: string | null;
          end_date?: string | null;
          field_of_study?: string | null;
          grade?: string | null;
          id?: string;
          institution: string;
          start_date?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          degree?: string | null;
          description?: string | null;
          end_date?: string | null;
          field_of_study?: string | null;
          grade?: string | null;
          id?: string;
          institution?: string;
          start_date?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profile_experience: {
        Row: {
          company_name: string;
          created_at: string;
          description: string | null;
          employment_type: Database["public"]["Enums"]["employment_type"] | null;
          end_date: string | null;
          id: string;
          is_current: boolean;
          job_title: string;
          location: string | null;
          start_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          company_name: string;
          created_at?: string;
          description?: string | null;
          employment_type?: Database["public"]["Enums"]["employment_type"] | null;
          end_date?: string | null;
          id?: string;
          is_current?: boolean;
          job_title: string;
          location?: string | null;
          start_date: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_name?: string;
          created_at?: string;
          description?: string | null;
          employment_type?: Database["public"]["Enums"]["employment_type"] | null;
          end_date?: string | null;
          id?: string;
          is_current?: boolean;
          job_title?: string;
          location?: string | null;
          start_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          bio: string | null;
          created_at: string;
          current_company: string | null;
          current_job_title: string | null;
          discoverable_to_employers: boolean;
          email: string | null;
          first_name: string | null;
          github_url: string | null;
          headline: string | null;
          id: string;
          last_name: string | null;
          linkedin_url: string | null;
          location: string | null;
          open_to_work: boolean;
          phone: string | null;
          portfolio_url: string | null;
          profile_image: string | null;
          skills: string[];
          status: Database["public"]["Enums"]["account_status"];
          updated_at: string;
          website: string | null;
          years_of_experience: number | null;
        };
        Insert: {
          bio?: string | null;
          created_at?: string;
          current_company?: string | null;
          current_job_title?: string | null;
          discoverable_to_employers?: boolean;
          email?: string | null;
          first_name?: string | null;
          github_url?: string | null;
          headline?: string | null;
          id: string;
          last_name?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          open_to_work?: boolean;
          phone?: string | null;
          portfolio_url?: string | null;
          profile_image?: string | null;
          skills?: string[];
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
          website?: string | null;
          years_of_experience?: number | null;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          current_company?: string | null;
          current_job_title?: string | null;
          discoverable_to_employers?: boolean;
          email?: string | null;
          first_name?: string | null;
          github_url?: string | null;
          headline?: string | null;
          id?: string;
          last_name?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          open_to_work?: boolean;
          phone?: string | null;
          portfolio_url?: string | null;
          profile_image?: string | null;
          skills?: string[];
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
          website?: string | null;
          years_of_experience?: number | null;
        };
        Relationships: [];
      };
      resumes: {
        Row: {
          created_at: string;
          file_name: string;
          file_path: string;
          file_size: number;
          id: string;
          is_primary: boolean;
          mime_type: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          file_path: string;
          file_size: number;
          id?: string;
          is_primary?: boolean;
          mime_type: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          id?: string;
          is_primary?: boolean;
          mime_type?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      saved_jobs: {
        Row: {
          created_at: string;
          job_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          job_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          job_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          application_updates: boolean;
          candidate_messages: boolean;
          created_at: string;
          interview_notifications: boolean;
          interview_updates: boolean;
          job_alerts: boolean;
          job_expiry_reminders: boolean;
          new_applications: boolean;
          profile_public: boolean;
          recruiter_messages: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          application_updates?: boolean;
          candidate_messages?: boolean;
          created_at?: string;
          interview_notifications?: boolean;
          interview_updates?: boolean;
          job_alerts?: boolean;
          job_expiry_reminders?: boolean;
          new_applications?: boolean;
          profile_public?: boolean;
          recruiter_messages?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          application_updates?: boolean;
          candidate_messages?: boolean;
          created_at?: string;
          interview_notifications?: boolean;
          interview_updates?: boolean;
          job_alerts?: boolean;
          job_expiry_reminders?: boolean;
          new_applications?: boolean;
          profile_public?: boolean;
          recruiter_messages?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      email_outbox: {
        Row: {
          attempts: number;
          created_at: string;
          dedupe_key: string;
          email_type: Database["public"]["Enums"]["email_type"];
          id: string;
          last_error: string | null;
          max_attempts: number;
          payload: Json;
          provider_message_id: string | null;
          scheduled_for: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["email_outbox_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          dedupe_key: string;
          email_type: Database["public"]["Enums"]["email_type"];
          id?: string;
          last_error?: string | null;
          max_attempts?: number;
          payload?: Json;
          provider_message_id?: string | null;
          scheduled_for?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["email_outbox_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          dedupe_key?: string;
          email_type?: Database["public"]["Enums"]["email_type"];
          id?: string;
          last_error?: string | null;
          max_attempts?: number;
          payload?: Json;
          provider_message_id?: string | null;
          scheduled_for?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["email_outbox_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      company_open_job_counts: {
        Row: {
          company_id: string;
          open_job_count: number;
        };
        Relationships: [];
      };
      job_application_counts: {
        Row: {
          job_id: string;
          total: number;
          submitted: number;
          reviewing: number;
          shortlisted: number;
          hired: number;
          rejected: number;
          interview: number;
          offer: number;
        };
        Relationships: [];
      };
      job_category_counts: {
        Row: {
          category_id: string;
          slug: string;
          published_count: number;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          application_id: string;
          created_at: string;
          id: string;
          last_message_at: string | null;
          updated_at: string;
        };
        Insert: {
          application_id: string;
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          updated_at?: string;
        };
        Update: {
          application_id?: string;
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: true;
            referencedRelation: "job_applications";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          joined_at: string;
          last_read_at: string | null;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          joined_at?: string;
          last_read_at?: string | null;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          sender_id?: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          action_url: string | null;
          body: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          read_at: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Insert: {
          action_url?: string | null;
          body?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          read_at?: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          action_url?: string | null;
          body?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          read_at?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          assigned_admin_id: string | null;
          created_at: string;
          description: string | null;
          entity_id: string;
          entity_type: Database["public"]["Enums"]["report_entity_type"];
          id: string;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_id: string;
          resolution_notes: string | null;
          resolved_at: string | null;
          status: Database["public"]["Enums"]["report_status"];
          updated_at: string;
        };
        Insert: {
          assigned_admin_id?: string | null;
          created_at?: string;
          description?: string | null;
          entity_id: string;
          entity_type: Database["public"]["Enums"]["report_entity_type"];
          id?: string;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_id?: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          updated_at?: string;
        };
        Update: {
          assigned_admin_id?: string | null;
          created_at?: string;
          description?: string | null;
          entity_id?: string;
          entity_type?: Database["public"]["Enums"]["report_entity_type"];
          id?: string;
          reason?: Database["public"]["Enums"]["report_reason"];
          reporter_id?: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          action: string;
          admin_id: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          metadata: Json | null;
          reason: string | null;
        };
        Insert: {
          action: string;
          admin_id: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          metadata?: Json | null;
          reason?: string | null;
        };
        Update: {
          action?: string;
          admin_id?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          metadata?: Json | null;
          reason?: string | null;
        };
        Relationships: [];
      };
      recent_job_searches: {
        Row: {
          created_at: string;
          filters: Json;
          id: string;
          query: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          filters?: Json;
          id?: string;
          query?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          filters?: Json;
          id?: string;
          query?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      saved_job_searches: {
        Row: {
          alert_frequency: string;
          created_at: string;
          email_alert_enabled: boolean;
          filters: Json;
          id: string;
          last_alerted_at: string | null;
          name: string;
          query: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          alert_frequency?: string;
          created_at?: string;
          email_alert_enabled?: boolean;
          filters?: Json;
          id?: string;
          last_alerted_at?: string | null;
          name: string;
          query?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          alert_frequency?: string;
          created_at?: string;
          email_alert_enabled?: boolean;
          filters?: Json;
          id?: string;
          last_alerted_at?: string | null;
          name?: string;
          query?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      saved_candidates: {
        Row: {
          candidate_user_id: string;
          created_at: string;
          employer_user_id: string;
          id: string;
        };
        Insert: {
          candidate_user_id: string;
          created_at?: string;
          employer_user_id?: string;
          id?: string;
        };
        Update: {
          candidate_user_id?: string;
          created_at?: string;
          employer_user_id?: string;
          id?: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      find_or_create_conversation: {
        Args: { p_application_id: string };
        Returns: string;
      };
      get_my_conversations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          conversation_id: string;
          application_id: string;
          job_id: string;
          job_title: string;
          company_id: string;
          company_name: string;
          company_logo: string | null;
          candidate_id: string;
          candidate_first_name: string | null;
          candidate_last_name: string | null;
          candidate_avatar: string | null;
          application_status: Database["public"]["Enums"]["application_status"];
          last_message_at: string | null;
          last_message_body: string | null;
          last_message_sender_id: string | null;
          last_message_deleted_at: string | null;
          unread_count: number;
        }[];
      };
      get_unread_message_count: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      admin_dashboard_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total_users: number;
          job_seekers: number;
          employers: number;
          total_companies: number;
          verified_companies: number;
          published_jobs: number;
          total_applications: number;
          applications_this_month: number;
          interviews_scheduled: number;
          offers: number;
          hires: number;
          open_reports: number;
          unresolved_reports: number;
        }[];
      };
      admin_daily_counts: {
        Args: { p_metric: string; p_days?: number };
        Returns: { day: string; count: number }[];
      };
      admin_list_users: {
        Args: {
          p_search?: string | null;
          p_role?: Database["public"]["Enums"]["app_role"] | null;
          p_status?: Database["public"]["Enums"]["account_status"] | null;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: {
          user_id: string;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          avatar: string | null;
          role: Database["public"]["Enums"]["app_role"];
          status: Database["public"]["Enums"]["account_status"];
          created_at: string;
          company_name: string | null;
          total_count: number;
        }[];
      };
      admin_get_user_detail: {
        Args: { p_user_id: string };
        Returns: {
          user_id: string;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          avatar: string | null;
          phone: string | null;
          location: string | null;
          bio: string | null;
          role: Database["public"]["Enums"]["app_role"];
          status: Database["public"]["Enums"]["account_status"];
          created_at: string;
          applications_count: number;
          saved_jobs_count: number;
          interviews_count: number;
          company_id: string | null;
          company_name: string | null;
          company_verified: boolean | null;
          company_status: Database["public"]["Enums"]["account_status"] | null;
          company_jobs_count: number;
          company_applications_count: number;
        }[];
      };
      admin_list_companies: {
        Args: {
          p_search?: string | null;
          p_verified?: boolean | null;
          p_status?: Database["public"]["Enums"]["account_status"] | null;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: {
          company_id: string;
          name: string;
          logo: string | null;
          industry: string | null;
          location: string | null;
          owner_id: string | null;
          owner_name: string | null;
          verified: boolean;
          status: Database["public"]["Enums"]["account_status"];
          created_at: string;
          jobs_count: number;
          published_jobs_count: number;
          total_count: number;
        }[];
      };
      admin_get_company_detail: {
        Args: { p_company_id: string };
        Returns: {
          company_id: string;
          name: string;
          logo: string | null;
          industry: string | null;
          location: string | null;
          website: string | null;
          founded_year: number | null;
          verified: boolean;
          status: Database["public"]["Enums"]["account_status"];
          created_at: string;
          owner_id: string | null;
          owner_name: string | null;
          owner_email: string | null;
          jobs_count: number;
          published_jobs_count: number;
          applications_count: number;
          open_reports_count: number;
        }[];
      };
      admin_list_jobs: {
        Args: {
          p_search?: string | null;
          p_company_id?: string | null;
          p_status?: Database["public"]["Enums"]["job_status"] | null;
          p_moderation_status?: Database["public"]["Enums"]["job_moderation_status"] | null;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: {
          job_id: string;
          title: string;
          company_id: string;
          company_name: string;
          status: Database["public"]["Enums"]["job_status"];
          moderation_status: Database["public"]["Enums"]["job_moderation_status"];
          created_at: string;
          published_at: string | null;
          applicant_count: number;
          report_count: number;
          total_count: number;
        }[];
      };
      admin_list_reports: {
        Args: {
          p_status?: Database["public"]["Enums"]["report_status"] | null;
          p_entity_type?: Database["public"]["Enums"]["report_entity_type"] | null;
          p_reason?: Database["public"]["Enums"]["report_reason"] | null;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: {
          report_id: string;
          reporter_id: string;
          reporter_name: string | null;
          entity_type: Database["public"]["Enums"]["report_entity_type"];
          entity_id: string;
          entity_label: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          description: string | null;
          status: Database["public"]["Enums"]["report_status"];
          assigned_admin_id: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          created_at: string;
          total_count: number;
        }[];
      };
      admin_get_report_detail: {
        Args: { p_report_id: string };
        Returns: {
          report_id: string;
          reporter_id: string;
          reporter_name: string | null;
          reporter_email: string | null;
          entity_type: Database["public"]["Enums"]["report_entity_type"];
          entity_id: string;
          entity_label: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          description: string | null;
          status: Database["public"]["Enums"]["report_status"];
          assigned_admin_id: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          created_at: string;
        }[];
      };
      admin_list_audit_logs: {
        Args: {
          p_admin_id?: string | null;
          p_action?: string | null;
          p_entity_type?: string | null;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: {
          log_id: string;
          admin_id: string | null;
          admin_name: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          reason: string | null;
          metadata: Json | null;
          created_at: string;
          total_count: number;
        }[];
      };
      admin_list_applications: {
        Args: {
          p_search?: string | null;
          p_status?: Database["public"]["Enums"]["application_status"] | null;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: {
          application_id: string;
          candidate_name: string | null;
          job_id: string;
          job_title: string;
          company_name: string;
          status: Database["public"]["Enums"]["application_status"];
          applied_at: string;
          total_count: number;
        }[];
      };
      admin_list_interviews: {
        Args: {
          p_status?: Database["public"]["Enums"]["interview_status"] | null;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: {
          interview_id: string;
          candidate_name: string | null;
          company_name: string;
          job_title: string;
          scheduled_at: string;
          method: Database["public"]["Enums"]["interview_method"];
          status: Database["public"]["Enums"]["interview_status"];
          total_count: number;
        }[];
      };
      admin_set_account_status: {
        Args: {
          p_user_id: string;
          p_status: Database["public"]["Enums"]["account_status"];
          p_reason: string;
        };
        Returns: undefined;
      };
      admin_set_company_verification: {
        Args: { p_company_id: string; p_verified: boolean; p_reason?: string | null };
        Returns: undefined;
      };
      admin_set_company_status: {
        Args: {
          p_company_id: string;
          p_status: Database["public"]["Enums"]["account_status"];
          p_reason: string;
        };
        Returns: undefined;
      };
      admin_set_job_moderation: {
        Args: {
          p_job_id: string;
          p_status: Database["public"]["Enums"]["job_moderation_status"];
          p_reason: string;
        };
        Returns: undefined;
      };
      admin_update_report_status: {
        Args: {
          p_report_id: string;
          p_status: Database["public"]["Enums"]["report_status"];
          p_resolution_notes?: string | null;
        };
        Returns: undefined;
      };
      search_job_ids: {
        Args: {
          p_keyword?: string | null;
          p_location?: string | null;
          p_category_id?: string | null;
          p_employment_types?: Database["public"]["Enums"]["employment_type"][] | null;
          p_workplace_types?: Database["public"]["Enums"]["workplace_type"][] | null;
          p_experience_levels?: Database["public"]["Enums"]["experience_level"][] | null;
          p_min_salary?: number | null;
          p_max_salary?: number | null;
          p_salary_period?: Database["public"]["Enums"]["salary_period"] | null;
          p_skills?: string[] | null;
          p_date_posted?: string | null;
          p_verified_only?: boolean;
          p_sort?: string;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: { job_id: string; rank: number; total_count: number }[];
      };
      get_search_suggestions: {
        Args: { p_query: string; p_limit?: number };
        Returns: { suggestion: string; kind: string }[];
      };
      claim_pending_emails: {
        Args: { p_limit?: number };
        Returns: Database["public"]["Tables"]["email_outbox"]["Row"][];
      };
      recommendation_profile_sufficient: {
        Args: { p_user_id?: string };
        Returns: boolean;
      };
      get_similar_jobs: {
        Args: { p_job_id: string; p_limit?: number };
        Returns: { job_id: string; score: number }[];
      };
      get_recommended_jobs: {
        Args: { p_page?: number; p_page_size?: number };
        Returns: {
          job_id: string;
          title: string;
          company_name: string;
          company_logo: string | null;
          city: string | null;
          country: string | null;
          workplace_type: Database["public"]["Enums"]["workplace_type"];
          employment_type: Database["public"]["Enums"]["employment_type"];
          salary_min: number | null;
          salary_max: number | null;
          salary_period: Database["public"]["Enums"]["salary_period"];
          published_at: string | null;
          score: number;
          matched_skills: string[];
          category_match: boolean;
          experience_match: string;
          location_match: boolean;
          already_saved: boolean;
          total_count: number;
        }[];
      };
      search_discoverable_candidates: {
        Args: {
          p_search?: string | null;
          p_skills?: string[] | null;
          p_min_years?: number | null;
          p_max_years?: number | null;
          p_location?: string | null;
          p_open_to_work?: boolean | null;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: {
          candidate_id: string;
          first_name: string | null;
          last_name: string | null;
          avatar: string | null;
          headline: string | null;
          current_job_title: string | null;
          years_of_experience: number | null;
          skills: string[];
          open_to_work: boolean;
          location: string | null;
          total_count: number;
        }[];
      };
      get_candidate_detail_for_employer: {
        Args: { p_candidate_id: string };
        Returns: {
          candidate_id: string;
          first_name: string | null;
          last_name: string | null;
          avatar: string | null;
          headline: string | null;
          current_job_title: string | null;
          bio: string | null;
          years_of_experience: number | null;
          skills: string[];
          open_to_work: boolean;
          location: string | null;
          github_url: string | null;
          portfolio_url: string | null;
          experience: Json | null;
          education: Json | null;
        }[];
      };
      get_saved_candidates: {
        Args: { p_page?: number; p_page_size?: number };
        Returns: {
          candidate_id: string;
          first_name: string | null;
          last_name: string | null;
          avatar: string | null;
          headline: string | null;
          years_of_experience: number | null;
          skills: string[];
          open_to_work: boolean;
          location: string | null;
          saved_at: string;
          total_count: number;
        }[];
      };
      get_matching_candidates_for_job: {
        Args: { p_job_id: string; p_page?: number; p_page_size?: number };
        Returns: {
          candidate_id: string;
          first_name: string | null;
          last_name: string | null;
          avatar: string | null;
          headline: string | null;
          years_of_experience: number | null;
          matched_skills: string[];
          skills: string[];
          experience_match: string;
          location_match: boolean;
          score: number;
          total_count: number;
        }[];
      };
    };
    Enums: {
      account_status: "active" | "suspended" | "pending" | "banned";
      app_role: "job_seeker" | "employer" | "admin";
      application_status:
        | "submitted"
        | "reviewing"
        | "shortlisted"
        | "interview"
        | "offer"
        | "rejected"
        | "hired"
        | "withdrawn";
      employment_type: "Full-time" | "Part-time" | "Contract" | "Internship";
      experience_level: "Entry" | "Mid" | "Senior" | "Lead";
      interview_method: "video" | "phone" | "onsite";
      interview_status: "scheduled" | "completed" | "cancelled";
      job_moderation_status: "clean" | "under_review" | "removed";
      job_status: "draft" | "published" | "closed" | "archived";
      notification_type:
        | "application_status_changed"
        | "new_application"
        | "interview_scheduled"
        | "interview_rescheduled"
        | "interview_cancelled"
        | "interview_completed"
        | "new_message";
      email_type:
        | "application_status_changed"
        | "new_application"
        | "interview_scheduled"
        | "interview_rescheduled"
        | "interview_cancelled"
        | "new_message"
        | "saved_search_alert"
        | "account_moderation";
      email_outbox_status: "pending" | "processing" | "sent" | "failed";
      report_entity_type: "job" | "company" | "user";
      report_reason:
        | "scam"
        | "misleading"
        | "discrimination"
        | "spam"
        | "inappropriate"
        | "duplicate"
        | "impersonation"
        | "harassment"
        | "other";
      report_status: "open" | "under_review" | "resolved" | "dismissed";
      salary_period: "year" | "month" | "hour";
      workplace_type: "Remote" | "Hybrid" | "On-site";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "pending", "banned"],
      app_role: ["job_seeker", "employer", "admin"],
      application_status: [
        "submitted",
        "reviewing",
        "shortlisted",
        "interview",
        "offer",
        "rejected",
        "hired",
        "withdrawn",
      ],
      employment_type: ["Full-time", "Part-time", "Contract", "Internship"],
      email_outbox_status: ["pending", "processing", "sent", "failed"],
      email_type: [
        "application_status_changed",
        "new_application",
        "interview_scheduled",
        "interview_rescheduled",
        "interview_cancelled",
        "new_message",
        "saved_search_alert",
        "account_moderation",
      ],
      experience_level: ["Entry", "Mid", "Senior", "Lead"],
      interview_method: ["video", "phone", "onsite"],
      interview_status: ["scheduled", "completed", "cancelled"],
      job_moderation_status: ["clean", "under_review", "removed"],
      job_status: ["draft", "published", "closed", "archived"],
      report_entity_type: ["job", "company", "user"],
      report_reason: [
        "scam",
        "misleading",
        "discrimination",
        "spam",
        "inappropriate",
        "duplicate",
        "impersonation",
        "harassment",
        "other",
      ],
      report_status: ["open", "under_review", "resolved", "dismissed"],
      salary_period: ["year", "month", "hour"],
      workplace_type: ["Remote", "Hybrid", "On-site"],
    },
  },
} as const;
