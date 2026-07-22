import { handleChatRequest } from "@/features/chat/server/handlers/handle-chat-request.server";

export const maxDuration = 90;

/** HTTP 入口仅负责把请求交给聊天领域处理。 */
export const POST = handleChatRequest;
