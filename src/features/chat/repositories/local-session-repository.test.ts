import { beforeEach, describe, expect, it } from "vitest";
import { LocalSessionRepository, STORAGE_KEY } from "@/features/chat/repositories/local-session-repository";
import { createSession } from "@/features/chat/types/chat";

describe("LocalSessionRepository", () => {
  beforeEach(() => localStorage.clear());

  it("saves, lists, loads and removes sessions", async () => {
    const repository = new LocalSessionRepository();
    const session = createSession("chat-1");
    session.title = "测试对话";
    await repository.save(session);
    expect(await repository.list()).toEqual([expect.objectContaining({ id: "chat-1", title: "测试对话" })]);
    expect(await repository.get("chat-1")).toEqual(session);
    await repository.remove("chat-1");
    expect(await repository.list()).toEqual([]);
  });

  it("ignores damaged records while preserving valid records", async () => {
    const valid = createSession("valid");
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, sessions: [{ broken: true }, valid] }));
    expect(await new LocalSessionRepository().list()).toEqual([expect.objectContaining({ id: "valid" })]);
  });

  it("falls back safely for invalid storage envelopes", async () => {
    localStorage.setItem(STORAGE_KEY, "not-json");
    expect(await new LocalSessionRepository().list()).toEqual([]);
  });
});
