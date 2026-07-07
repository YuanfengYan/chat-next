-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED', 'PENDING');

-- CreateEnum
CREATE TYPE "ChatSessionStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('SYSTEM', 'USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ToolKind" AS ENUM ('HTTP');

-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "displayName" VARCHAR(100),
    "avatarUrl" VARCHAR(2048),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "AiProvider" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "baseUrl" VARCHAR(2048),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "providerModelId" VARCHAR(200) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "capabilities" JSONB NOT NULL DEFAULT '{}',
    "defaultParams" JSONB NOT NULL DEFAULT '{}',
    "contextWindow" INTEGER,
    "maxOutputTokens" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelPricing" (
    "id" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "perTokens" INTEGER NOT NULL DEFAULT 1000000,
    "inputTokenPrice" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "outputTokenPrice" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "cachedInputTokenPrice" DECIMAL(20,10),
    "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
    "effectiveTo" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "promptVersionId" UUID,
    "title" VARCHAR(200) NOT NULL DEFAULT '新对话',
    "status" "ChatSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "role" "MessageRole" NOT NULL,
    "parts" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Generation" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "promptVersionId" UUID,
    "responseMessageId" UUID,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "configSnapshot" JSONB NOT NULL DEFAULT '{}',
    "finishReason" VARCHAR(100),
    "providerRequestId" VARCHAR(255),
    "errorCode" VARCHAR(100),
    "errorMessage" VARCHAR(1000),
    "durationMs" INTEGER,
    "startedAt" TIMESTAMPTZ(3),
    "finishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "kind" "ToolKind" NOT NULL DEFAULT 'HTTP',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolVersion" (
    "id" UUID NOT NULL,
    "toolId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "method" "HttpMethod" NOT NULL,
    "endpointTemplate" VARCHAR(2048) NOT NULL,
    "requestTemplate" JSONB NOT NULL DEFAULT '{}',
    "inputSchema" JSONB NOT NULL,
    "outputSchema" JSONB,
    "timeoutMs" INTEGER NOT NULL DEFAULT 15000,
    "maxResponseBytes" INTEGER NOT NULL DEFAULT 1048576,
    "createdById" UUID,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelTool" (
    "modelId" UUID NOT NULL,
    "toolId" UUID NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "configOverride" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ModelTool_pkey" PRIMARY KEY ("modelId","toolId")
);

-- CreateTable
CREATE TABLE "PlatformCredential" (
    "id" UUID NOT NULL,
    "providerId" UUID,
    "key" VARCHAR(120) NOT NULL,
    "purpose" VARCHAR(120) NOT NULL,
    "encryptedPayload" BYTEA NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "rotatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PlatformCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolCredential" (
    "toolVersionId" UUID NOT NULL,
    "credentialId" UUID NOT NULL,
    "alias" VARCHAR(80) NOT NULL,

    CONSTRAINT "ToolCredential_pkey" PRIMARY KEY ("toolVersionId","credentialId")
);

-- CreateTable
CREATE TABLE "ToolInvocation" (
    "id" UUID NOT NULL,
    "generationId" UUID NOT NULL,
    "messageId" UUID,
    "toolVersionId" UUID NOT NULL,
    "callId" VARCHAR(255) NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "errorCode" VARCHAR(100),
    "errorMessage" VARCHAR(1000),
    "durationMs" INTEGER,
    "startedAt" TIMESTAMPTZ(3),
    "finishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolInvocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID,
    "generationId" UUID,
    "modelId" UUID NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedInputTokens" INTEGER NOT NULL DEFAULT 0,
    "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "inputTokenPrice" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "outputTokenPrice" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(120) NOT NULL,
    "resourceType" VARCHAR(100) NOT NULL,
    "resourceId" VARCHAR(255),
    "summary" JSONB,
    "ipAddress" INET,
    "userAgent" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AiProvider_key_key" ON "AiProvider"("key");

-- CreateIndex
CREATE INDEX "AiProvider_isEnabled_name_idx" ON "AiProvider"("isEnabled", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Model_key_key" ON "Model"("key");

-- CreateIndex
CREATE INDEX "Model_isEnabled_sortOrder_name_idx" ON "Model"("isEnabled", "sortOrder", "name");

-- CreateIndex
CREATE INDEX "Model_providerId_isEnabled_idx" ON "Model"("providerId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "Model_providerId_providerModelId_key" ON "Model"("providerId", "providerModelId");

-- CreateIndex
CREATE INDEX "ModelPricing_modelId_effectiveFrom_idx" ON "ModelPricing"("modelId", "effectiveFrom" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ModelPricing_modelId_effectiveFrom_key" ON "ModelPricing"("modelId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_key_key" ON "PromptTemplate"("key");

-- CreateIndex
CREATE INDEX "PromptVersion_templateId_status_version_idx" ON "PromptVersion"("templateId", "status", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_templateId_version_key" ON "PromptVersion"("templateId", "version");

-- CreateIndex
CREATE INDEX "ChatSession_userId_deletedAt_updatedAt_idx" ON "ChatSession"("userId", "deletedAt", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ChatSession_modelId_createdAt_idx" ON "ChatSession"("modelId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ChatSession_status_updatedAt_idx" ON "ChatSession"("status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_sessionId_sequence_key" ON "ChatMessage"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "Generation_sessionId_createdAt_idx" ON "Generation"("sessionId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Generation_modelId_status_createdAt_idx" ON "Generation"("modelId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Generation_providerRequestId_idx" ON "Generation"("providerRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_key_key" ON "Tool"("key");

-- CreateIndex
CREATE INDEX "Tool_isEnabled_name_idx" ON "Tool"("isEnabled", "name");

-- CreateIndex
CREATE INDEX "ToolVersion_toolId_status_version_idx" ON "ToolVersion"("toolId", "status", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ToolVersion_toolId_version_key" ON "ToolVersion"("toolId", "version");

-- CreateIndex
CREATE INDEX "ModelTool_toolId_isEnabled_idx" ON "ModelTool"("toolId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformCredential_key_key" ON "PlatformCredential"("key");

-- CreateIndex
CREATE INDEX "PlatformCredential_providerId_purpose_idx" ON "PlatformCredential"("providerId", "purpose");

-- CreateIndex
CREATE INDEX "ToolCredential_credentialId_idx" ON "ToolCredential"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "ToolCredential_toolVersionId_alias_key" ON "ToolCredential"("toolVersionId", "alias");

-- CreateIndex
CREATE INDEX "ToolInvocation_toolVersionId_status_createdAt_idx" ON "ToolInvocation"("toolVersionId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ToolInvocation_messageId_idx" ON "ToolInvocation"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "ToolInvocation_generationId_callId_key" ON "ToolInvocation"("generationId", "callId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_generationId_key" ON "UsageRecord"("generationId");

-- CreateIndex
CREATE INDEX "UsageRecord_userId_occurredAt_idx" ON "UsageRecord"("userId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "UsageRecord_modelId_occurredAt_idx" ON "UsageRecord"("modelId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "UsageRecord_sessionId_occurredAt_idx" ON "UsageRecord"("sessionId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_createdAt_idx" ON "AuditLog"("resourceType", "resourceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPricing" ADD CONSTRAINT "ModelPricing_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_responseMessageId_fkey" FOREIGN KEY ("responseMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolVersion" ADD CONSTRAINT "ToolVersion_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolVersion" ADD CONSTRAINT "ToolVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelTool" ADD CONSTRAINT "ModelTool_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelTool" ADD CONSTRAINT "ModelTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCredential" ADD CONSTRAINT "PlatformCredential_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolCredential" ADD CONSTRAINT "ToolCredential_toolVersionId_fkey" FOREIGN KEY ("toolVersionId") REFERENCES "ToolVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolCredential" ADD CONSTRAINT "ToolCredential_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "PlatformCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolInvocation" ADD CONSTRAINT "ToolInvocation_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolInvocation" ADD CONSTRAINT "ToolInvocation_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolInvocation" ADD CONSTRAINT "ToolInvocation_toolVersionId_fkey" FOREIGN KEY ("toolVersionId") REFERENCES "ToolVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
