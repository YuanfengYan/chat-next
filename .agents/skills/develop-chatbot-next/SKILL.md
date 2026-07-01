---
name: develop-chatbot-next
description: Build, extend, review, or refactor this Next.js AI chat application. Use for chat UI, session persistence, AI providers, message parts, models, tools, RAG, attachments, authentication, and related tests in this repository.
---

# Develop Chatbot Next

Preserve the lightweight module boundaries that keep the chat application extensible.

## Follow the architecture

- Keep route pages as composition points; put chat behavior under `src/features/chat`.
- Keep reusable shadcn primitives under `src/components/ui`; do not put business components there.
- Use `useChatController` as the orchestration boundary between AI SDK streaming, Zustand state, navigation, and persistence.
- Keep streaming messages local to AI SDK `useChat`. Store only session summaries and UI state globally.
- Access saved conversations through `SessionRepository`. Add a new implementation for remote persistence instead of calling storage from components.
- Keep provider SDKs, secrets, and model resolution in server-only AI modules. Register models in the catalog and provider registry.

## Extend messages safely

- Represent messages as AI SDK `UIMessage` values and render their `parts` independently.
- Add a focused renderer for new reasoning, tool, source, data, or file parts; retain a safe fallback for unknown parts.
- Keep the composer draft extensible with attachments even when a feature is not yet enabled.
- Normalize API errors before presenting them in UI components.
- Keep executable tools in server-only AI modules. The existing `webSearch` tool uses Qianfan credentials and must return structured sources for citation and UI rendering.

## Verify changes

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`. Add repository tests for persistence changes, renderer tests for new parts, and route tests for request validation or model registry changes.
