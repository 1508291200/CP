CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'editor', 'contributor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."cp_status" AS ENUM('active', 'archived', 'completed');--> statement-breakpoint
CREATE TYPE "public"."tab_type" AS ENUM('profile', 'timeline', 'milestone', 'custom');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'members', 'private');--> statement-breakpoint
CREATE TYPE "public"."date_precision" AS ENUM('year', 'month', 'day');--> statement-breakpoint
CREATE TYPE "public"."event_visibility" AS ENUM('public', 'members', 'specified', 'private');--> statement-breakpoint
CREATE TYPE "public"."importance" AS ENUM('critical', 'high', 'medium', 'normal', 'low');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('image', 'video', 'file');--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"role" "user_role" DEFAULT 'contributor' NOT NULL,
	"created_by" uuid,
	"used_by" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"display_name" varchar(100),
	"avatar_url" varchar(500),
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(20) DEFAULT '#7B5EA7' NOT NULL,
	"category" varchar(50),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cp_tabs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cp_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"tab_type" "tab_type" NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cp_tags" (
	"cp_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "cp_tags_cp_id_tag_id_pk" PRIMARY KEY("cp_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "cps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"subtitle" varchar(200),
	"description" text,
	"cover_url" varchar(500),
	"banner_url" varchar(500),
	"status" "cp_status" DEFAULT 'active' NOT NULL,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"theme_config" jsonb DEFAULT '{}'::jsonb,
	"custom_fields" jsonb DEFAULT '[]'::jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cp_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"avatar_url" varchar(500),
	"role_label" varchar(50),
	"birthday" date,
	"bio" text,
	"custom_fields" jsonb DEFAULT '[]'::jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"relation_type" varchar(50) DEFAULT 'related' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_tags" (
	"event_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "event_tags_event_id_tag_id_pk" PRIMARY KEY("event_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "event_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"edited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cp_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"summary" text,
	"content" jsonb DEFAULT '{}'::jsonb,
	"event_date" date,
	"date_precision" date_precision DEFAULT 'day' NOT NULL,
	"importance" "importance" DEFAULT 'normal' NOT NULL,
	"visibility" "event_visibility" DEFAULT 'members' NOT NULL,
	"is_milestone" boolean DEFAULT false NOT NULL,
	"source_ref" varchar(500),
	"emotion_icon" varchar(50),
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cp_id" uuid NOT NULL,
	"event_id" uuid,
	"title" varchar(500) NOT NULL,
	"description" text,
	"milestone_date" date,
	"icon" varchar(50) DEFAULT '⭐',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"media_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_name" varchar(255),
	"file_path" varchar(500) NOT NULL,
	"thumb_path" varchar(500),
	"file_type" "file_type" DEFAULT 'image' NOT NULL,
	"mime_type" varchar(100),
	"file_size" bigint,
	"width" integer,
	"height" integer,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" uuid,
	"detail" jsonb DEFAULT '{}'::jsonb,
	"ip" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_tabs" ADD CONSTRAINT "cp_tabs_cp_id_cps_id_fk" FOREIGN KEY ("cp_id") REFERENCES "public"."cps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_tags" ADD CONSTRAINT "cp_tags_cp_id_cps_id_fk" FOREIGN KEY ("cp_id") REFERENCES "public"."cps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_tags" ADD CONSTRAINT "cp_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cps" ADD CONSTRAINT "cps_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_cp_id_cps_id_fk" FOREIGN KEY ("cp_id") REFERENCES "public"."cps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_relations" ADD CONSTRAINT "event_relations_source_id_events_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_relations" ADD CONSTRAINT "event_relations_target_id_events_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_versions" ADD CONSTRAINT "event_versions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_versions" ADD CONSTRAINT "event_versions_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_cp_id_cps_id_fk" FOREIGN KEY ("cp_id") REFERENCES "public"."cps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_cp_id_cps_id_fk" FOREIGN KEY ("cp_id") REFERENCES "public"."cps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_media" ADD CONSTRAINT "event_media_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_media" ADD CONSTRAINT "event_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;