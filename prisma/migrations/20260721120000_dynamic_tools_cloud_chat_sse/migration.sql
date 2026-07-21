CREATE TYPE "ToolInvocationContext" AS ENUM ('CHAT', 'TEST');

ALTER TABLE "ChatSession"
  ADD COLUMN "skillIds" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ChatMessage" ADD COLUMN "externalId" VARCHAR(255);
UPDATE "ChatMessage" SET "externalId" = "id"::text WHERE "externalId" IS NULL;
ALTER TABLE "ChatMessage" ALTER COLUMN "externalId" SET NOT NULL;
CREATE UNIQUE INDEX "ChatMessage_sessionId_externalId_key" ON "ChatMessage"("sessionId", "externalId");

ALTER TABLE "ToolVersion"
  ADD COLUMN "exampleInput" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "responsePath" VARCHAR(500);

ALTER TABLE "ToolInvocation"
  ALTER COLUMN "generationId" DROP NOT NULL,
  ADD COLUMN "actorId" UUID,
  ADD COLUMN "context" "ToolInvocationContext" NOT NULL DEFAULT 'CHAT',
  ADD COLUMN "sessionExternalId" VARCHAR(128);

CREATE INDEX "ToolInvocation_actorId_createdAt_idx" ON "ToolInvocation"("actorId", "createdAt" DESC);
CREATE INDEX "ToolInvocation_sessionExternalId_createdAt_idx" ON "ToolInvocation"("sessionExternalId", "createdAt" DESC);
