import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UIMessage } from "ai";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { MessageList } from "@/features/chat/client/components/message-list";

const textMessage: UIMessage = {
  id: "user-1",
  role: "user",
  parts: [{ type: "text", text: "原始问题" }],
};

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("用户消息内联编辑", () => {
  it("回填原文本并在 Enter 后提交编辑", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<MessageList messages={[textMessage]} isStreaming={false} onEdit={onEdit} />);

    await user.click(screen.getByRole("button", { name: "编辑消息" }));
    const editor = screen.getByRole("textbox", { name: "编辑用户消息" });
    expect(editor).toHaveValue("原始问题");
    await user.clear(editor);
    await user.type(editor, "修改后的问题{enter}");

    expect(onEdit).toHaveBeenCalledWith("user-1", "修改后的问题");
    expect(screen.queryByRole("textbox", { name: "编辑用户消息" })).not.toBeInTheDocument();
  });

  it("支持 Escape 和取消按钮放弃编辑", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<MessageList messages={[textMessage]} isStreaming={false} onEdit={onEdit} />);

    await user.click(screen.getByRole("button", { name: "编辑消息" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("textbox", { name: "编辑用户消息" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "编辑消息" }));
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("阻止发送纯空消息和已失效附件", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const expiredMessage: UIMessage = {
      id: "user-file",
      role: "user",
      parts: [
        { type: "text", text: "识别图片" },
        { type: "file", mediaType: "image/png", filename: "old.png", url: "attachment:expired" },
      ],
    };
    const { rerender } = render(<MessageList messages={[textMessage]} isStreaming={false} onEdit={onEdit} />);
    await user.click(screen.getByRole("button", { name: "编辑消息" }));
    await user.clear(screen.getByRole("textbox", { name: "编辑用户消息" }));
    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(screen.getByRole("alert")).toHaveTextContent("消息内容不能为空");

    rerender(<MessageList messages={[expiredMessage]} isStreaming={false} onEdit={onEdit} />);
    await user.click(screen.getByRole("button", { name: "编辑消息" }));
    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(screen.getByRole("alert")).toHaveTextContent("历史图片已失效");
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("流式生成期间禁用编辑", () => {
    render(<MessageList messages={[textMessage]} isStreaming onEdit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "编辑消息" })).toBeDisabled();
  });
});
