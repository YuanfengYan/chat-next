import { z } from "zod";
import { auth } from "@/lib/auth/auth.server";
import { apiError } from "@/lib/ai/errors";
import { createCloudSession, listCloudSessions } from "@/lib/chat/cloud-sessions.server";

const createSchema = z.object({ id: z.string().uuid(), title: z.string().min(1).max(200), modelId: z.string().min(1).max(120), skillIds: z.array(z.string()).max(5).default([]) });

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError({ code: "AUTH_REQUIRED", message: "请重新登录。", retryable: false }, 401);
  return Response.json(await listCloudSessions(session.user.id));
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError({ code: "AUTH_REQUIRED", message: "请重新登录。", retryable: false }, 401);
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return apiError({ code: "INVALID_REQUEST", message: "会话配置无效。", retryable: false }, 400);
  try { return Response.json(await createCloudSession(session.user.id, parsed.data), { status: 201 }); }
  catch { return apiError({ code: "SESSION_CREATE_FAILED", message: "无法创建云端会话。", retryable: true }, 409); }
}

