import { render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { MessagePartRenderer } from "@/features/chat/renderers/message-part-renderer";

type MessagePart = UIMessage["parts"][number];
describe("MessagePartRenderer", () => {
  it("renders markdown text", () => {
    render(<MessagePartRenderer part={{ type: "text", text: "**你好**" }} />);
    expect(screen.getByText("你好")).toHaveStyle({ fontWeight: "bold" });
  });

  it("renders a safe fallback for unknown future parts", () => {
    render(<MessagePartRenderer part={{ type: "future-widget" } as unknown as MessagePart} />);
    expect(screen.getByText(/future-widget/)).toBeInTheDocument();
  });

  it("renders completed web search sources", () => {
    render(<MessagePartRenderer part={{ type: "tool-webSearch", state: "output-available", input: { query: "AI 新闻" }, output: { query: "AI 新闻", answer: "摘要", searchedAt: "2026-07-01T00:00:00Z", sources: [{ id: "1", title: "示例来源", url: "https://example.com", website: "Example" }] } } as unknown as MessagePart} />);
    expect(screen.getByText("已搜索：AI 新闻")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /示例来源/ })).toHaveAttribute("href", "https://example.com");
  });
});
