ALTER TABLE "matches" ADD COLUMN "white_time_ms" integer DEFAULT 300000 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "black_time_ms" integer DEFAULT 300000 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "turn_started_at" timestamp;