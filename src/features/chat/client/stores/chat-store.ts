import { create } from "zustand";
/** 聊天全局状态：只维护会话摘要和 UI 状态，不保存流式消息及仓库实例。 */
import type { SessionSummary } from "@/features/chat/domain/chat";

interface ChatState {
  summaries: SessionSummary[];
  activeSessionId: string | null;
  sidebarOpen: boolean;
  hydrated: boolean;
  setSummaries: (summaries: SessionSummary[]) => void;
  // 更新或插入会话摘要
  upsertSummary: (summary: SessionSummary) => void; 
  removeSummary: (id: string) => void;
  setActiveSessionId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
}
/** 跨聊天组件共享的轻量 Zustand Store。 */
export const useChatStore = create<ChatState>((set) => ({
  summaries: [], activeSessionId: null, sidebarOpen: false, hydrated: false,
  setSummaries: (summaries) => set({ summaries }),
  upsertSummary: (summary) => set((state) => ({ summaries: [summary, ...state.summaries.filter((item) => item.id !== summary.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) })),
  removeSummary: (id) => set((state) => ({ summaries: state.summaries.filter((item) => item.id !== id) })),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setHydrated: (hydrated) => set({ hydrated }),
}));
