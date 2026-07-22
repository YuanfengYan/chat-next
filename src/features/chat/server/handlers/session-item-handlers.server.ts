import type { UIMessage } from "ai";
import { z } from "zod";
import { apiError } from "@/features/ai/domain/errors";
import { auth } from "@/features/auth/server/auth.server";
import {
  archiveCloudSession,
  getCloudSession,
  saveCloudSession,
} from "@/features/chat/server/repositories/cloud-sessions.server";

const saveSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  modelId: z.string().min(1).max(120),
  skillIds: z.array(z.string()).max(5),
  storage: z.literal("cloud"),
  revision: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(z.object({
    id: z.string().min(1).max(255),
    role: z.enum(["system", "user", "assistant"]),
    parts: z.array(z.object({ type: z.string() }).passthrough()),
  }).passthrough()).max(100),
});

type SessionRouteContext = { params: Promise<{ id: string }> };

function viewer(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export async function handleGetSession(request: Request, context: SessionRouteContext) {
  const session = await viewer(request);
  if (!session) return apiError({ code: "AUTH_REQUIRED", message: "请重新登录。", retryable: false }, 401);
  const { id } = await context.params;
  const result = await getCloudSession(session.user.id, id);
  return result ? Response.json(result) : apiError({ code: "SESSION_NOT_FOUND", message: "会话不存在。", retryable: false }, 404);
}

export async function handleSaveSession(request: Request, context: SessionRouteContext) {
  const session = await viewer(request);
  if (!session) return apiError({ code: "AUTH_REQUIRED", message: "请重新登录。", retryable: false }, 401);
  const { id } = await context.params;
  const parsed = saveSchema.safeParse(await request.json());
  if (!parsed.success || parsed.data.id !== id) return apiError({ code: "INVALID_REQUEST", message: "会话数据无效。", retryable: false }, 400);
  try {
    return Response.json(await saveCloudSession(session.user.id, { ...parsed.data, messages: parsed.data.messages as UIMessage[] }));
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_REVISION_CONFLICT") return apiError({ code: "SESSION_REVISION_CONFLICT", message: "会话已在其他位置更新，请刷新后重试。", retryable: true }, 409);
    return apiError({ code: "SESSION_SAVE_FAILED", message: "保存会话失败。", retryable: true }, 500);
  }
}

export async function handleArchiveSession(request: Request, context: SessionRouteContext) {
  const session = await viewer(request);
  if (!session) return apiError({ code: "AUTH_REQUIRED", message: "请重新登录。", retryable: false }, 401);
  const { id } = await context.params;
  return await archiveCloudSession(session.user.id, id)
    ? new Response(null, { status: 204 })
    : apiError({ code: "SESSION_NOT_FOUND", message: "会话不存在。", retryable: false }, 404);
}
