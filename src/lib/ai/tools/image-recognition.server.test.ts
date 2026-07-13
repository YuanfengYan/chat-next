import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recognizeImages } from "@/lib/ai/tools/image-recognition.server";

describe("recognizeImages", () => {
  beforeEach(() => { process.env.BAIDU_IMAGE_API_KEY = "api"; process.env.BAIDU_IMAGE_SECRET_KEY = "secret"; });
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.BAIDU_IMAGE_API_KEY; delete process.env.BAIDU_IMAGE_SECRET_KEY; });

  it("调用标准含位置版 OCR 并规范化文字位置", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ direction: 0, language: 3, words_result_num: 1, words_result: [{ words: "百度文字识别", location: { left: 47, top: 84, width: 132, height: 54 }, probability: { average: 0.99, variance: 0.001, min: 0.98 }, vertexes_location: [{ x: 47, y: 84 }] }], paragraphs_result: [{ words_result_idx: [0] }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await recognizeImages([{ data: "YWJj", mediaType: "image/png" }], [0]);
    expect(result.images[0]).toEqual(expect.objectContaining({ direction: 0, language: 3, words: [expect.objectContaining({ text: "百度文字识别", location: { left: 47, top: 84, width: 132, height: 54 } })], paragraphs: [{ wordIndexes: [0] }] }));
    expect(String(fetchMock.mock.calls[1][0])).toContain("/rest/2.0/ocr/v1/general");
    expect(String(fetchMock.mock.calls[1][1]?.body)).toContain("vertexes_location=true");
  });
});
