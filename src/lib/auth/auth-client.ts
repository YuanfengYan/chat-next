import { createAuthClient } from "better-auth/react";

/** 浏览器认证客户端；业务组件只通过该客户端发起认证请求。 */
export const authClient = createAuthClient();
