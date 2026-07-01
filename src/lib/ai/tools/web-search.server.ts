import "server-only";
/** 千帆联网搜索工具：仅在服务端读取凭证、请求实时信息并规范化引用来源。 */
import { tool } from "ai";
import { z } from "zod";

const QIANFAN_SEARCH_URL = "https://qianfan.baidubce.com/v2/ai_search/chat/completions";

const referenceSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  title: z.string().catch("未命名来源"),
  url: z.string().url(),
  content: z.string().optional(),
  date: z.string().optional(),
  website: z.string().optional(),
  type: z.string().optional(),
});

const responseSchema = z.object({
  code: z.union([z.string(), z.number()]).optional(),
  message: z.string().optional(),
  choices: z.array(z.object({
    message: z.object({ content: z.string().default("") }).optional(),
  })).optional(),
  references: z.array(referenceSchema).optional(),
});

export interface WebSearchResult {
  query: string;
  answer: string;
  sources: Array<{ id: string; title: string; url: string; snippet?: string; publishedAt?: string; website?: string }>;
  searchedAt: string;
}

/** 调用百度千帆 AI 搜索，并将供应商响应转换成稳定的领域结果。 */
export async function searchWeb(query: string, recency: "week" | "month" | "semiyear" | "year" | "any", abortSignal?: AbortSignal): Promise<WebSearchResult> {
  const apiKey = process.env.QIANFAN_API_KEY;
  if (!apiKey) throw new Error("服务端尚未配置 QIANFAN_API_KEY，无法联网搜索。");

  const timeout = AbortSignal.timeout(30_000);
  const signal = abortSignal ? AbortSignal.any([abortSignal, timeout]) : timeout;
  const response = await fetch(QIANFAN_SEARCH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "X-Appbuilder-Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: query }],
      model: process.env.QIANFAN_SEARCH_MODEL || "ernie-4.5-turbo-32k",
      search_source: "baidu_search_v2",
      resource_type_filter: [{ type: "web", top_k: 8 }],
      ...(recency === "any" ? {} : { search_recency_filter: recency }),
      stream: false,
      enable_corner_markers: false,
      max_refer_search_items: 8,
    }),
    signal,
  });
  const raw: unknown = await response.json().catch(() => null);
  const parsed = responseSchema.safeParse(raw);
  if (!response.ok) {
    const detail = parsed.success ? parsed.data.message : null;
    throw new Error(detail || `千帆搜索请求失败（HTTP ${response.status}）。`);
  }
  if (!parsed.success) throw new Error("千帆搜索返回了无法识别的数据格式。");
  if (parsed.data.code) throw new Error(parsed.data.message || `千帆搜索错误：${parsed.data.code}`);

  const answer = parsed.data.choices?.[0]?.message?.content?.trim() || "未生成搜索摘要。";
  const sources = (parsed.data.references ?? []).filter((item) => item.type !== "image" && item.type !== "video").slice(0, 8).map((item, index) => ({
    id: String(item.id ?? index + 1), title: item.title, url: item.url,
    ...(item.content ? { snippet: item.content.slice(0, 500) } : {}),
    ...(item.date ? { publishedAt: item.date } : {}),
    ...(item.website ? { website: item.website } : {}),
  }));
  return { query, answer: answer.slice(0, 12_000), sources, searchedAt: new Date().toISOString() };
}

/** 暴露给大模型的联网搜索 Tool，由模型根据问题时效性自主决定是否调用。 */
export const webSearchTool = tool({
  description: "搜索互联网实时信息。遇到新闻、时效性事实、近期事件、价格、人物现状，或用户明确要求联网查询时使用。结果包含摘要和可引用来源。",
  inputSchema: z.object({
    query: z.string().trim().min(2).max(300).describe("独立、明确的搜索查询，包含必要的人名、地点或时间范围"),
    recency: z.enum(["week", "month", "semiyear", "year", "any"]).default("any").describe("时间范围：最近一周、一个月、半年、一年或不限"),
  }),
  execute: async ({ query, recency }, { abortSignal }) => searchWeb(query, recency, abortSignal),
});

/** 当前聊天接口允许执行的工具白名单。 */
export const chatTools = { webSearch: webSearchTool };
