import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { searchWeb } from "@/features/ai/server/tools/web-search.server";

describe("searchWeb", () => {
  beforeEach(() => { process.env.QIANFAN_API_KEY = "test-key"; });
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.QIANFAN_API_KEY; });

  it("calls Qianfan with server-side authorization and normalizes sources", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "搜索摘要" } }],
      references: [{ id: "1", title: "来源", url: "https://example.com/news", content: "正文片段", website: "Example", type: "web" }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchWeb("最新 AI 新闻", "week");
    expect(result.answer).toBe("搜索摘要");
    expect(result.sources[0]).toEqual(expect.objectContaining({ title: "来源", url: "https://example.com/news" }));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual(expect.objectContaining({ Authorization: "Bearer test-key", "X-Appbuilder-Authorization": "Bearer test-key" }));
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({ search_source: "baidu_search_v2", search_recency_filter: "week" }));
  });

  it("fails clearly when the API key is missing", async () => {
    delete process.env.QIANFAN_API_KEY;
    await expect(searchWeb("测试搜索", "any")).rejects.toThrow("QIANFAN_API_KEY");
  });
});
