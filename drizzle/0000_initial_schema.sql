CREATE TYPE "public"."analysis_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('POTHOLE_ROAD_DAMAGE', 'GARBAGE', 'DRAINAGE_WATERLOGGING', 'STREETLIGHT_FAILURE', 'FALLEN_TREE', 'WATER_LEAKAGE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('SUBMITTED', 'ANALYZED', 'ROUTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'REJECTED', 'DUPLICATE_MERGED');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('IMAGE', 'AUDIO');--> statement-breakpoint
CREATE TYPE "public"."priority_level" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CITIZEN', 'OPERATOR', 'DEPT_OFFICER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "ai_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"status" "analysis_status" DEFAULT 'PENDING' NOT NULL,
	"provider" text,
	"category" "category",
	"category_confidence" real,
	"severity" "severity",
	"severity_confidence" real,
	"needs_review" boolean DEFAULT false NOT NULL,
	"cv_result" jsonb,
	"nlp_result" jsonb,
	"duplicate_result" jsonb,
	"explanation" jsonb,
	"model_versions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_analysis_category_conf_range" CHECK ("ai_analysis"."category_confidence" is null or "ai_analysis"."category_confidence" between 0 and 1),
	CONSTRAINT "ai_analysis_severity_conf_range" CHECK ("ai_analysis"."severity_confidence" is null or "ai_analysis"."severity_confidence" between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor_id" uuid,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "citizen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"phone" text,
	"email" text,
	"password_hash" text,
	"role" "user_role" DEFAULT 'CITIZEN' NOT NULL,
	"department_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "citizen_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "complaint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"citizen_id" uuid NOT NULL,
	"location_id" uuid,
	"text" text,
	"category_hint" "category",
	"category" "category",
	"severity" "severity",
	"urgency" "severity",
	"status" "complaint_status" DEFAULT 'SUBMITTED' NOT NULL,
	"department_id" uuid,
	"cluster_id" uuid,
	"resolution_note" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaint_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid,
	"uploaded_by" uuid NOT NULL,
	"type" "media_type" NOT NULL,
	"storage_key" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_media_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "complaint_media_size_positive" CHECK ("complaint_media"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "complaint_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"from_status" "complaint_status",
	"to_status" "complaint_status" NOT NULL,
	"note" text,
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"default_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "department_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "duplicate_cluster" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "category" NOT NULL,
	"representative_complaint_id" uuid,
	"centroid" jsonb,
	"size" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "duplicate_cluster_size_positive" CHECK ("duplicate_cluster"."size" >= 1)
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"address" text,
	"ward" text,
	"geohash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "location_lat_range" CHECK ("location"."lat" between -90 and 90),
	CONSTRAINT "location_lng_range" CHECK ("location"."lng" between -180 and 180)
);
--> statement-breakpoint
CREATE TABLE "priority_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"level" "priority_level" NOT NULL,
	"signals" jsonb,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weights_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "priority_assessment_score_range" CHECK ("priority_assessment"."score" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_complaint_id_complaint_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citizen" ADD CONSTRAINT "citizen_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint" ADD CONSTRAINT "complaint_citizen_id_citizen_id_fk" FOREIGN KEY ("citizen_id") REFERENCES "public"."citizen"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint" ADD CONSTRAINT "complaint_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint" ADD CONSTRAINT "complaint_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint" ADD CONSTRAINT "complaint_cluster_id_duplicate_cluster_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."duplicate_cluster"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint" ADD CONSTRAINT "complaint_resolved_by_citizen_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."citizen"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_media" ADD CONSTRAINT "complaint_media_complaint_id_complaint_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_media" ADD CONSTRAINT "complaint_media_uploaded_by_citizen_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."citizen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_status_history" ADD CONSTRAINT "complaint_status_history_complaint_id_complaint_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_status_history" ADD CONSTRAINT "complaint_status_history_changed_by_citizen_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."citizen"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_cluster" ADD CONSTRAINT "duplicate_cluster_representative_complaint_id_complaint_id_fk" FOREIGN KEY ("representative_complaint_id") REFERENCES "public"."complaint"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priority_assessment" ADD CONSTRAINT "priority_assessment_complaint_id_complaint_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_analysis_complaint_uq" ON "ai_analysis" USING btree ("complaint_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "citizen_department_idx" ON "citizen" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "complaint_status_idx" ON "complaint" USING btree ("status");--> statement-breakpoint
CREATE INDEX "complaint_category_idx" ON "complaint" USING btree ("category");--> statement-breakpoint
CREATE INDEX "complaint_department_idx" ON "complaint" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "complaint_cluster_idx" ON "complaint" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "complaint_created_at_idx" ON "complaint" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "complaint_citizen_idx" ON "complaint" USING btree ("citizen_id");--> statement-breakpoint
CREATE INDEX "complaint_media_complaint_idx" ON "complaint_media" USING btree ("complaint_id");--> statement-breakpoint
CREATE INDEX "complaint_status_history_complaint_idx" ON "complaint_status_history" USING btree ("complaint_id","created_at");--> statement-breakpoint
CREATE INDEX "location_geohash_idx" ON "location" USING btree ("geohash");--> statement-breakpoint
CREATE UNIQUE INDEX "priority_assessment_complaint_uq" ON "priority_assessment" USING btree ("complaint_id");--> statement-breakpoint
CREATE INDEX "priority_assessment_score_idx" ON "priority_assessment" USING btree ("score");