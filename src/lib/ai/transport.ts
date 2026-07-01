import { DefaultChatTransport, type UIMessage } from "ai";
/** 创建聊天传输层；未来切换 API 地址或认证方式时只需修改此处。 */
export function createChatTransport() { return new DefaultChatTransport<UIMessage>({ api: "/api/chat" }); }
