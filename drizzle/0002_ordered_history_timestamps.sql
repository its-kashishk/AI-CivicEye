ALTER TABLE "audit_log" ALTER COLUMN "created_at" SET DEFAULT clock_timestamp();--> statement-breakpoint
ALTER TABLE "complaint_status_history" ALTER COLUMN "created_at" SET DEFAULT clock_timestamp();