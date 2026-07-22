import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    chatMessage: {
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    ensureModelCatalog: vi.fn(),
    tx,
    prisma: {
      chatSession: { findFirst: vi.fn() },
      chatMessage: {
        findUnique: vi.fn(),
        aggregate: vi.fn(),
        create: vi.fn(),
      },
      generation: { create: vi.fn() },
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx)),
    },
  };
});

vi.mock("@/features/ai/server/models/model-catalog.server", () => ({
  ensureModelCatalog: mocks.ensureModelCatalog,
}));
vi.mock("@/infrastructure/db/prisma.server", () => ({ prisma: mocks.prisma }));

import { startCloudGeneration } from "@/features/chat/server/services/cloud-generation.service.server";

const editedMessage: UIMessage = {
  id: "user-existing",
  role: "user",
  parts: [{ type: "text", text: "修改后的问题" }],
};

describe("云端历史消息重新生成", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.chatSession.findFirst.mockResolvedValue({ id: "session-1", modelId: "model-db-id", model: { key: "deepseek-chat" } });
    mocks.prisma.generation.create.mockResolvedValue({ id: "generation-1", startedAt: new Date("2026-01-01T00:00:00.000Z") });
  });

  it("更新目标用户消息并删除其后的旧分支", async () => {
    mocks.prisma.chatMessage.findUnique.mockResolvedValue({ id: "message-db-id", sequence: 2 });

    await startCloudGeneration({
      userId: "user-1",
      sessionId: "session-1",
      modelId: "deepseek-chat",
      skillIds: [],
      messages: [editedMessage],
    });

    expect(mocks.tx.chatMessage.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: "session-1", sequence: { gt: 2 } },
    });
    expect(mocks.tx.chatMessage.update).toHaveBeenCalledWith({
      where: { id: "message-db-id" },
      data: { parts: editedMessage.parts },
    });
    expect(mocks.prisma.generation.create).toHaveBeenCalled();
  });

  it("新用户消息仍按末尾 sequence 追加", async () => {
    mocks.prisma.chatMessage.findUnique.mockResolvedValue(null);
    mocks.prisma.chatMessage.aggregate.mockResolvedValue({ _max: { sequence: 4 } });

    await startCloudGeneration({
      userId: "user-1",
      sessionId: "session-1",
      modelId: "deepseek-chat",
      skillIds: [],
      messages: [{ ...editedMessage, id: "user-new" }],
    });

    expect(mocks.prisma.chatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sessionId: "session-1", externalId: "user-new", sequence: 5, role: "USER" }),
    });
    expect(mocks.tx.chatMessage.deleteMany).not.toHaveBeenCalled();
  });

  it("拒绝不存在的会话和模型不匹配", async () => {
    mocks.prisma.chatSession.findFirst.mockResolvedValueOnce(null);
    await expect(startCloudGeneration({ userId: "user-1", sessionId: "missing", modelId: "deepseek-chat", skillIds: [], messages: [editedMessage] })).rejects.toThrow("SESSION_NOT_FOUND");

    mocks.prisma.chatSession.findFirst.mockResolvedValueOnce({ id: "session-1", modelId: "model-db-id", model: { key: "other-model" } });
    await expect(startCloudGeneration({ userId: "user-1", sessionId: "session-1", modelId: "deepseek-chat", skillIds: [], messages: [editedMessage] })).rejects.toThrow("MODEL_MISMATCH");
  });
});
