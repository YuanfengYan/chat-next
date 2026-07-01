/** 前后端共享的模型目录，集中维护用户可选择和服务端允许调用的模型。 */
export interface ModelDefinition { id: string; name: string; provider: "deepseek"; description: string; }
export const MODEL_CATALOG = [{ id: "deepseek-chat", name: "DeepSeek Chat", provider: "deepseek", description: "通用对话与编程模型" }] as const satisfies readonly ModelDefinition[];
export type ModelId = (typeof MODEL_CATALOG)[number]["id"];
export function isModelId(value: string): value is ModelId { return MODEL_CATALOG.some((model) => model.id === value); }
export function getModelDefinition(id: string) { return MODEL_CATALOG.find((model) => model.id === id); }
