# DeepChat

基于 Next.js、shadcn/ui、Vercel AI SDK 和 DeepSeek 的可扩展 AI 对话应用。

## 本地运行

```bash
pnpm install
Copy-Item .env.example .env.local
# 在 .env.local 中填写 DEEPSEEK_API_KEY 和 QIANFAN_API_KEY
pnpm dev
```

打开 <http://localhost:3000>。

## 工程命令

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## 架构

- `src/features/chat`：聊天组件、控制器、Store、Repository 和消息渲染器。
- `src/lib/ai`：模型目录、Transport、错误协议和服务端 Provider Registry。
- `src/components/ui`：shadcn/ui 基础组件。
- `.agents/skills/develop-chatbot-next`：供 Codex 使用的项目开发规范。

会话目前存储在浏览器 localStorage；通过实现 `SessionRepository` 可以切换到服务端持久化。模型密钥仅由 `/api/chat` 服务端路由读取，不会发送到浏览器。

联网搜索由模型按需调用 `webSearch` Tool，通过百度千帆 AI 搜索完成。可使用 `QIANFAN_SEARCH_MODEL` 调整搜索总结模型，默认值为 `ernie-4.5-turbo-32k`。
