import "server-only";
import type { UIMessageChunk } from "ai";
import { CHAT_STREAM_VERSION, eventTypeForChunk, type ChatStreamEnvelope } from "@/features/ai/domain/chat-stream-protocol";

const encoder = new TextEncoder();

function frame(envelope: ChatStreamEnvelope) { return encoder.encode(`data: ${JSON.stringify(envelope)}\n\n`); }

export function createCustomSseStream(source: ReadableStream<UIMessageChunk>, generationId?: string) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const ping = setInterval(() => {
        if (!closed) controller.enqueue(frame({ v: CHAT_STREAM_VERSION, type: "stream.ping", id: crypto.randomUUID(), timestamp: new Date().toISOString(), generationId, payload: {} }));
      }, 15_000);
      void (async () => {
        const reader = source.getReader();
        try {
          controller.enqueue(frame({ v: CHAT_STREAM_VERSION, type: "stream.started", id: crypto.randomUUID(), timestamp: new Date().toISOString(), generationId, payload: {} }));
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(frame({ v: CHAT_STREAM_VERSION, type: eventTypeForChunk(value), id: crypto.randomUUID(), timestamp: new Date().toISOString(), generationId, payload: { chunk: value } }));
          }
          controller.enqueue(frame({ v: CHAT_STREAM_VERSION, type: "stream.completed", id: crypto.randomUUID(), timestamp: new Date().toISOString(), generationId, payload: {} }));
          closed = true;
          clearInterval(ping);
          controller.close();
        } catch (error) {
          closed = true;
          clearInterval(ping);
          controller.error(error);
        } finally { reader.releaseLock(); }
      })();
    },
    cancel() { /* 上游 tee 分支由独立消费者负责收尾持久化。 */ },
  });
}

export function customSseResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no", "x-chat-stream-version": "1" } });
}

