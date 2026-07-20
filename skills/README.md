# Skill 编写约定

每个 Skill 位于独立目录并包含 `SKILL.md`。frontmatter 必须提供 `id`、`name`、`description`，可通过 `tools: [toolName]` 绑定服务端静态注册表中的工具。正文会作为模型指令加载。

Skill 目录不会执行 JavaScript 或 TypeScript。新增工具时必须在 server-only 的工具注册表中实现输入校验、错误处理和脱敏日志。
