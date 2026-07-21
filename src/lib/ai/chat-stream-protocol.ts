import type { UIMessageChunk } from "ai";

export const CHAT_STREAM_VERSION = 1 as const;
export type ChatStreamEventType =
  | "stream.started" | "stream.progress" | "stream.ping" | "stream.completed"
  | "message.started" | "message.completed" | "message.failed"
  | "text.started" | "text.delta" | "text.completed"
  | "reasoning.started" | "reasoning.delta" | "reasoning.completed"
  | "tool.input.delta" | "tool.input.available" | "tool.started" | "tool.completed" | "tool.failed"
  | "source.available" | "stream.aborted";

export interface ChatStreamEnvelope {
  v: typeof CHAT_STREAM_VERSION;
  type: ChatStreamEventType;
  id: string;
  timestamp: string;
  messageId?: string;
  generationId?: string;
  payload: { chunk?: UIMessageChunk; [key: string]: unknown };
}

export function eventTypeForChunk(chunk: UIMessageChunk): ChatStreamEventType {
  const type = chunk.type;
  if (type === "start") return "message.started";
  if (type === "text-start") return "text.started";
  if (type === "text-delta") return "text.delta";
  if (type === "text-end") return "text.completed";
  if (type === "reasoning-start") return "reasoning.started";
  if (type === "reasoning-delta") return "reasoning.delta";
  if (type === "reasoning-end") return "reasoning.completed";
  if (type === "tool-input-delta") return "tool.input.delta";
  if (type === "tool-input-available") return "tool.input.available";
  if (type === "tool-output-available") return "tool.completed";
  if (type === "tool-output-error" || type === "tool-output-denied") return "tool.failed";
  if (type === "source-url" || type === "source-document") return "source.available";
  if (type === "finish") return "message.completed";
  if (type === "error") return "message.failed";
  if (type === "abort") return "stream.aborted";
  return "stream.progress";
}

export function isChatStreamEnvelope(value: unknown): value is ChatStreamEnvelope {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ChatStreamEnvelope>;
  return item.v === CHAT_STREAM_VERSION && typeof item.type === "string" && typeof item.id === "string" && typeof item.timestamp === "string" && !!item.payload && typeof item.payload === "object";
}

