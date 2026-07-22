# DeepChat

基于 Next.js、shadcn/ui、Vercel AI SDK 和 DeepSeek 的可扩展 AI 对话应用。

## 本地运行

```bash
pnpm install
Copy-Item .env.example .env.local
# 在 .env.local 中填写 DeepSeek、千帆以及数据库配置
pnpm dev
```

打开 <http://localhost:3000>。

## PostgreSQL 与 Prisma

请先在本机安装并启动 PostgreSQL，然后在 `.env.local` 中配置实际连接地址：

```bash
DATABASE_URL=postgresql://用户名:密码@localhost:5432/数据库名?schema=public
```

初始化数据库：

```bash
pnpm db:validate
pnpm db:generate
pnpm db:migrate
```

`DATABASE_URL` 必须仅在服务端环境中配置。Prisma CLI 会通过 `prisma.config.ts` 加载项目根目录的 `.env.local`。切换到 Vercel 或云服务器时，只需在对应部署环境配置新的 `DATABASE_URL`，再执行：

```bash
pnpm db:deploy
```

常用数据库命令：

- `pnpm db:generate`：根据 schema 生成类型安全客户端。
- `pnpm db:validate`：校验 Prisma schema。
- `pnpm db:migrate`：创建并应用本地开发迁移。
- `pnpm db:deploy`：在部署环境应用已有迁移。
- `pnpm db:studio`：打开 Prisma Studio。

聊天支持浏览器本地会话和登录用户云端会话；两种持久化方式都通过聊天领域的 `SessionRepository` 契约访问。

## 工程命令

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## 多模型与 Skill

聊天服务通过服务端 `Brains` 单例统一调用 DeepSeek、OpenAI、Anthropic 与 Google 模型。按需在 `.env.local` 配置 `DEEPSEEK_API_KEY`、`OPENAI_API_KEY`、`ANTHROPIC_API_KEY` 和 `GOOGLE_GENERATIVE_AI_API_KEY`；未配置密钥的模型会在调用时返回标准错误。

项目 Skill 位于 `skills/<skill-id>/SKILL.md`。Skill 只允许绑定服务端静态注册的工具，不会动态执行目录中的代码；详细格式见该目录的 README。

## 架构

- `src/app`：Next.js 页面、布局和薄 HTTP 入口，不承载业务编排。
- `src/features`：按 `chat`、`ai`、`auth`、`admin` 领域组织业务，每个领域明确区分 domain、client 和 server。
- `src/shared`：无业务含义的基础 UI、主题组件和通用函数。
- `src/infrastructure`：Prisma、凭证加密等仅服务端可用的技术实现。
- `src/generated`：Prisma 生成代码，不放置手写业务。
- `tests`：按 unit、components、integration 和 setup 集中管理测试。
- `prisma`：数据库 schema 和版本化迁移。

依赖方向固定为 `app → features → shared`。领域服务端适配器可以依赖 `infrastructure`，但基础设施不得反向依赖业务领域；客户端代码不得导入 `server`、`infrastructure` 或 Prisma。

模型密钥只由服务端路由读取，不会发送到浏览器。数据库中的平台凭据字段只允许保存服务端加密后的内容，禁止写入明文密钥。
