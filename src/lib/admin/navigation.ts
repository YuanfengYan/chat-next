import type { AdminNavItem } from "@/lib/admin/types";

/** 后台左侧树形导航配置，路由组只改变代码组织，不改变这些 URL。 */
export const adminNavigation: AdminNavItem[] = [
  { title: "仪表盘", href: "/admin", icon: "dashboard" },
  {
    title: "工具管理",
    icon: "tool",
    children: [
      { title: "工具列表", href: "/admin/tools/list", icon: "list" },
      { title: "工具权限", href: "/admin/tools/permissions", icon: "shield" },
      { title: "工具调用日志", href: "/admin/tools/logs", icon: "logs" },
      { title: "MCP / Function 配置", href: "/admin/tools/mcp-functions", icon: "settings" },
    ],
  },
  {
    title: "助手管理",
    icon: "assistant",
    children: [
      { title: "助手列表", href: "/admin/assistants/list", icon: "list" },
      { title: "Prompt 配置", href: "/admin/assistants/prompts", icon: "prompt" },
      { title: "模型参数", href: "/admin/assistants/model-params", icon: "sliders" },
      { title: "工具绑定", href: "/admin/assistants/tool-bindings", icon: "link" },
      { title: "知识库绑定", href: "/admin/assistants/knowledge-bindings", icon: "database" },
    ],
  },
];
