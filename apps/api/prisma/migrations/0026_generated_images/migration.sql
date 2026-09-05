ALTER TABLE "Message" ADD COLUMN "artifacts" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Attachment" ADD COLUMN "generated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GenerationPolicy" ADD COLUMN "allowedFeatures" TEXT[] NOT NULL DEFAULT ARRAY['chat']::TEXT[];
