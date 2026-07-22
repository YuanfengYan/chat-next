import { z } from "zod";

export const requestTemplateSchema = z.object({
  pathParams: z.record(z.string(), z.unknown()).default({}),
  query: z.record(z.string(), z.unknown()).default({}),
  headers: z.record(z.string(), z.unknown()).default({}),
  body: z.unknown().optional(),
});

export type HttpToolRequestTemplate = z.infer<typeof requestTemplateSchema>;

export const toolVersionInputSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  endpointTemplate: z.string().url().max(2048),
  requestTemplate: requestTemplateSchema,
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()).nullable().optional(),
  exampleInput: z.unknown(),
  responsePath: z.string().max(500).nullable().optional(),
  timeoutMs: z.number().int().min(100).max(90_000),
  maxResponseBytes: z.number().int().min(1_024).max(5 * 1024 * 1024),
});

export interface RuntimeToolCredential {
  alias: string;
  value: string;
}

export interface RuntimeHttpToolConfig extends z.infer<typeof toolVersionInputSchema> {
  toolId: string;
  toolVersionId: string;
  key: string;
  name: string;
  description: string;
  version: number;
  credentials: RuntimeToolCredential[];
}

export interface ToolExecutionContext {
  context: "CHAT" | "TEST";
  callId: string;
  generationId?: string;
  actorId?: string;
  sessionExternalId?: string;
  abortSignal?: AbortSignal;
}

