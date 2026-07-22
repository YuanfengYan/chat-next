/** 模型能力用于界面说明和服务端能力判断，不包含任何供应商密钥。 */
export interface ModelCapabilities { reasoning: boolean; tools: boolean; }
export type ModelProvider = "deepseek" | "openai" | "anthropic" | "google";
/** 前后端共享的模型目录，集中维护用户可选择和服务端允许调用的模型。 */
export interface ModelDefinition { id: string; name: string; provider: ModelProvider; description: string; capabilities: ModelCapabilities; }
export const MODEL_CATALOG = [
  { id: "deepseek-chat", name: "DeepSeek Chat", provider: "deepseek", description: "通用对话与编程", capabilities: { reasoning: false, tools: true } },
  { id: "deepseek-reasoner", name: "DeepSeek Reasoner", provider: "deepseek", description: "复杂推理任务", capabilities: { reasoning: true, tools: true } },
  { id: "gpt-5", name: "GPT-5", provider: "openai", description: "高质量通用模型", capabilities: { reasoning: true, tools: true } },
  { id: "gpt-5-mini", name: "GPT-5 mini", provider: "openai", description: "快速高效的通用模型", capabilities: { reasoning: true, tools: true } },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "anthropic", description: "高质量分析与编程", capabilities: { reasoning: true, tools: true } },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", provider: "anthropic", description: "低延迟日常任务", capabilities: { reasoning: true, tools: true } },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google", description: "复杂多步骤任务", capabilities: { reasoning: true, tools: true } },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", description: "快速多模态任务", capabilities: { reasoning: true, tools: true } },
] as const satisfies readonly ModelDefinition[];
export type ModelId = (typeof MODEL_CATALOG)[number]["id"];
export function isModelId(value: string): value is ModelId { return MODEL_CATALOG.some((model) => model.id === value); }
export function getModelDefinition(id: string) { return MODEL_CATALOG.find((model) => model.id === id); }
