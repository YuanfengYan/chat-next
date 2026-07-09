<!-- BEGIN:nextjs-agent-rules -->

Next.js: Read docs before coding

Before any Next.js-specific work, find and read the relevant doc in node_modules/next/dist/docs/.

不要只依赖模型训练数据；当前项目安装的 Next.js 本地文档才是准确依据。

This is especially required for routing, caching, data fetching, Server Components, Client Components, Route Handlers, Server Actions, metadata, proxy, and deployment behavior.

For simple refactors, UI-only changes, naming changes, or TypeScript cleanup that does not involve Next.js APIs, do not read docs unless needed.

<!-- END:nextjs-agent-rules -->
# 项目协作规范

本项目是基于 Next.js App Router、TypeScript、shadcn/ui、Vercel AI SDK、Zustand 和 DeepSeek 构建的可扩展 AI 对话应用。修改代码时应保持轻量模块化边界，为会话云同步、多模型、工具调用、RAG 和附件能力保留扩展空间。

## 技术约定

- 使用 pnpm 管理依赖，不混用 npm、Yarn 或 Bun。
- 使用 TypeScript 编写业务代码，避免无必要的 `any` 和类型断言。
- 使用 Tailwind CSS v4 与 shadcn/ui；通用基础组件放在 `src/components/ui`。
- 界面文案、业务注释和错误提示默认使用简体中文。
- 新增或修改业务模块时，为模块职责、公开类型和关键流程添加简洁的中文说明。

## 架构边界

- 页面和路由只负责参数解析与模块组合，聊天业务放在 `src/features/chat`，后台。
- 业务组件不得直接访问 localStorage、模型供应商 SDK、环境变量或服务端 Provider。
- 使用 `useChatController` 统一协调 AI SDK 流式消息、Zustand 状态、会话仓库和路由切换。
- 流式消息由 AI SDK `useChat` 管理；全局 Store 只保存会话摘要和 UI 状态，不保存流对象、Repository 实例或完整消息历史。
- 所有会话持久化都通过 `SessionRepository`；接入数据库或远程 API 时新增实现，不绕过该接口。
- 模型目录放在 `src/lib/ai/models.ts`，服务端模型实例和密钥解析放在 server-only 模块。
- API 错误必须先标准化，再交给 UI 展示，组件不得解析供应商原始错误格式。

## 消息与工具扩展

- 消息统一使用 AI SDK `UIMessage`，并按 `parts` 独立渲染。
- 新增  reasoning、tool、source、data 或 file 类型时，应增加专用 Part Renderer，并保留未知类型的安全降级界面。
- 输入草稿保持文本与附件可扩展结构，不把输入能力退化为单一字符串接口。
- 可执行 Tool 必须位于服务端 AI 模块，密钥不得传入客户端或写入日志。
- `webSearch` 使用百度千帆联网搜索，必须返回结构化来源，支持模型引用与前端来源卡片展示。
- Tool 调用应设置明确的输入校验、超时、错误处理和循环步数上限。

## 安全要求

- 真实密钥只允许放在 `.env.local` 或部署平台环境变量中。
- `.env.example` 只能保留空值或无敏感性的示例值。
- 禁止在客户端代码、测试快照、日志、错误消息或版本库中输出 API Key。
- 外部 API 的请求体和响应体必须经过校验，并限制消息数量、内容大小和返回数据长度。
- 外部链接使用安全的新窗口属性，并为未知消息内容提供安全降级。

## 测试与验收

完成修改后，根据影响范围执行：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

- 修改 Repository 时补充保存、读取、删除、迁移和损坏数据测试。
- 新增消息 Part 时补充渲染状态、错误状态和未知类型测试。
- 修改 Tool 或外部 API 时补充鉴权、请求参数、响应规范化和失败路径测试。
- 修改路由、模型目录或 API 校验时补充对应接口测试。
- 涉及响应式界面时验证桌面端和移动端布局。

## 修改原则

- 优先复用现有模块边界，不引入依赖注入容器、通用事件总线等超出当前规模的基础设施。
- 不修改与当前任务无关的用户代码，不覆盖工作区中已有的未提交变更。
- 只在确有复用价值时增加抽象，避免预先实现尚未需要的功能。
- 保持函数和组件职责单一，避免在页面组件中堆叠网络、存储和状态编排逻辑。
