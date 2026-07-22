/** 聊天接口统一错误协议，避免 UI 直接依赖具体模型供应商的错误格式。 */
export type ChatErrorCode = "AUTH_REQUIRED" | "INVALID_REQUEST" | "MODEL_NOT_ALLOWED" | "MODEL_MISMATCH" | "SKILL_NOT_ALLOWED" | "MISSING_API_KEY" | "RATE_LIMITED" | "UPSTREAM_ERROR" | "SESSION_NOT_FOUND" | "SESSION_CREATE_FAILED" | "SESSION_SAVE_FAILED" | "SESSION_REVISION_CONFLICT";
export interface ChatApiError { code: ChatErrorCode; message: string; retryable: boolean; }
export function apiError(error: ChatApiError, status: number) { return Response.json(error, { status }); }
export function userFacingError(error: Error | undefined) {
  if (!error) return null;
  try {
    const parsed = JSON.parse(error.message) as Partial<ChatApiError>;
    if (typeof parsed.message === "string") return parsed.message;
  } catch { /* The SDK may provide a plain-text error. */ }
  return error.message || "生成回复时出现问题，请稍后重试。";
}
