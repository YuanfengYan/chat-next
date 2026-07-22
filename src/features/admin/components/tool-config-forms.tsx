import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { AdminSection } from "@/features/admin/components/admin-page";
import { archiveToolVersionAction, bindModelToolAction, cloneToolVersionAction, createToolAction, createToolVersionAction, publishToolVersionAction, testToolVersionAction, toggleToolAction } from "@/features/admin/server/tool-actions";

type ToolOption = { id: string; key: string; name: string; isEnabled: boolean };
type ModelOption = { id: string; key: string; name: string };
type VersionOption = { id: string; toolId: string; version: number; status: string; tool: { name: string }; exampleInput: unknown; credentialAliases: string[] };

const selectClass = "h-9 w-full rounded-md border bg-background px-3 text-sm";

export function ToolCatalogForm({ tools }: { tools: ToolOption[] }) {
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <AdminSection title="创建工具" description="工具 key 发布后作为模型可见的函数名，请保持稳定。">
        <form action={createToolAction} className="grid gap-3 p-4">
          <Input name="key" placeholder="例如 weatherQuery" required pattern="[A-Za-z][A-Za-z0-9_-]+" />
          <Input name="name" placeholder="工具名称" required />
          <Textarea name="description" placeholder="说明模型应在何时调用该工具" required />
          <Button type="submit">创建工具</Button>
        </form>
      </AdminSection>
      <AdminSection title="启用状态" description="停用后所有模型立即停止装载该工具。">
        <div className="divide-y">
          {tools.map((tool) => <form action={toggleToolAction.bind(null, tool.id)} key={tool.id} className="flex items-center justify-between gap-3 p-4"><div><p className="font-medium">{tool.name}</p><p className="text-xs text-muted-foreground">{tool.key}</p></div><Button type="submit" variant="outline">{tool.isEnabled ? "停用" : "启用"}</Button></form>)}
        </div>
      </AdminSection>
    </div>
  );
}

export function ToolVersionForm({ tools, versions }: { tools: ToolOption[]; versions: VersionOption[] }) {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <AdminSection title="新建版本草稿" description="模板支持 {{input.field}} 与 {{credential.alias}}，发布后配置被冻结。">
        <form action={createToolVersionAction} className="grid gap-3 p-4">
          <select className={selectClass} name="toolId" required><option value="">选择工具</option>{tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}（{tool.key}）</option>)}</select>
          <select className={selectClass} name="draftVersionId"><option value="">创建下一版本草稿</option>{versions.filter((version) => version.status === "DRAFT").map((version) => <option key={version.id} value={version.id}>编辑 {version.tool.name} v{version.version} 草稿</option>)}</select>
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]"><select className={selectClass} name="method" defaultValue="POST"><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select><Input name="endpointTemplate" placeholder="https://api.example.com/items/{id}" required /></div>
          <Textarea name="requestTemplate" rows={8} defaultValue={'{\n  "pathParams": { "id": "{{input.id}}" },\n  "query": {},\n  "headers": { "Authorization": "Bearer {{credential.api}}" },\n  "body": { "query": "{{input.query}}" }\n}'} />
          <Textarea name="inputSchema" rows={8} defaultValue={'{\n  "type": "object",\n  "properties": { "query": { "type": "string" } },\n  "required": ["query"],\n  "additionalProperties": false\n}'} />
          <Textarea name="outputSchema" rows={5} placeholder="可选输出 JSON Schema；留空表示不校验" />
          <Textarea name="exampleInput" rows={4} defaultValue={'{ "query": "示例输入" }'} />
          <Input name="responsePath" placeholder="可选响应路径，例如 data.result" />
          <div className="grid gap-3 sm:grid-cols-2"><Input name="timeoutMs" type="number" defaultValue="15000" min="100" max="90000" /><Input name="maxResponseBytes" type="number" defaultValue="1048576" min="1024" max="5242880" /></div>
          <div className="grid gap-3 sm:grid-cols-2"><Input name="credentialAlias" placeholder="可选凭据别名，例如 api" /><Input name="credentialValue" type="password" placeholder="凭据值（加密保存）" /></div>
          <Button type="submit">创建或更新草稿</Button>
        </form>
      </AdminSection>
      <AdminSection title="版本操作" description="测试使用版本示例输入；测试和发布均会重新校验管理员权限。">
        <div className="divide-y">
          {versions.map((version) => <div key={version.id} className="space-y-3 p-4"><div><p className="font-medium">{version.tool.name} v{version.version}</p><p className="text-xs text-muted-foreground">{version.status} · 凭据：{version.credentialAliases.join("、") || "无"}</p></div><div className="flex flex-wrap gap-2"><form action={testToolVersionAction.bind(null, version.id)}><Button type="submit" size="sm" variant="outline">示例测试</Button></form><form action={cloneToolVersionAction.bind(null, version.id)}><Button type="submit" size="sm" variant="outline">复制草稿</Button></form>{version.status === "DRAFT" && <form action={publishToolVersionAction.bind(null, version.id)}><Button type="submit" size="sm">发布</Button></form>}{version.status !== "ARCHIVED" && <form action={archiveToolVersionAction.bind(null, version.id)}><Button type="submit" size="sm" variant="outline">归档</Button></form>}</div></div>)}
        </div>
      </AdminSection>
    </div>
  );
}

export function ToolBindingForm({ tools, models }: { tools: ToolOption[]; models: ModelOption[] }) {
  return <AdminSection title="模型工具绑定" description="重复提交同一组合可切换启用状态。"><form action={bindModelToolAction} className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]"><select className={selectClass} name="modelId" required><option value="">选择模型</option>{models.map((model) => <option key={model.id} value={model.id}>{model.name}（{model.key}）</option>)}</select><select className={selectClass} name="toolId" required><option value="">选择工具</option>{tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}</select><Button type="submit">切换绑定</Button></form></AdminSection>;
}
