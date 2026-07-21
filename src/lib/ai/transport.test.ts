import { describe, expect, it } from "vitest";
import type { UIMessageChunk } from "ai";
import { parseCustomSse } from "@/lib/ai/transport";

describe("custom SSE transport", () => {
  it("parses frames split across byte chunks and preserves UIMessageChunk", async () => {
    const chunk: UIMessageChunk = { type: "text-delta", id: "text-1", delta: "你好" };
    const frame = `data: ${JSON.stringify({ v: 1, type: "text.delta", id: "event-1", timestamp: "2026-07-21T00:00:00.000Z", payload: { chunk } })}\r\n\r\n`;
    const bytes = new TextEncoder().encode(frame);
    const source = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes.slice(0, 17)); controller.enqueue(bytes.slice(17, bytes.length - 2)); controller.enqueue(bytes.slice(bytes.length - 2)); controller.close(); } });
    const reader = parseCustomSse(source).getReader();
    expect((await reader.read()).value).toEqual(chunk);
    expect((await reader.read()).done).toBe(true);
  });
});

