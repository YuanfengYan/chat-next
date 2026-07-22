import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import { CHAT_STREAM_VERSION, isChatStreamEnvelope } from "@/features/ai/domain/chat-stream-protocol";

function parseCustomSse(body: ReadableStream<Uint8Array>): ReadableStream<UIMessageChunk> {
  return new ReadableStream<UIMessageChunk>({
    start(controller) {
      void (async () => {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            buffer = `${buffer}${decoder.decode(value, { stream: !done })}`.replace(/\r\n/g, "\n");
            let boundary = buffer.indexOf("\n\n");
            while (boundary >= 0) {
              const block = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              const data = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
              if (data) {
                const envelope: unknown = JSON.parse(data);
                if (!isChatStreamEnvelope(envelope)) throw new Error("CHAT_STREAM_FRAME_INVALID");
                if (envelope.payload.chunk) controller.enqueue(envelope.payload.chunk);
              }
              boundary = buffer.indexOf("\n\n");
            }
            if (done) break;
          }
          if (buffer.trim()) throw new Error("CHAT_STREAM_INCOMPLETE_FRAME");
          controller.close();
        } catch (error) { controller.error(error); }
        finally { reader.releaseLock(); }
      })();
    },
  });
}

class CustomSseChatTransport implements ChatTransport<UIMessage> {
  async sendMessages(options: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]) {
    const headers = new Headers(options.headers);
    headers.set("content-type", "application/json");
    const response = await fetch("/api/chat", {
      method: "POST", headers, signal: options.abortSignal,
      body: JSON.stringify({ id: options.chatId, messages: options.messages, trigger: options.trigger, messageId: options.messageId, ...options.body }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(error?.message ?? "聊天请求失败。");
    }
    if (response.headers.get("x-chat-stream-version") !== String(CHAT_STREAM_VERSION)) throw new Error("CHAT_STREAM_VERSION_UNSUPPORTED");
    if (!response.body) throw new Error("CHAT_STREAM_BODY_MISSING");
    return parseCustomSse(response.body);
  }
  async reconnectToStream() { return null; }
}

/** 使用版本化自定义 SSE，同时向 useChat 输出标准 UIMessageChunk。 */
export function createChatTransport(): ChatTransport<UIMessage> { return new CustomSseChatTransport(); }

export { parseCustomSse };
