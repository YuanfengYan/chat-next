import { ToolRuntimeConfigTable } from "@/features/admin/components/tool-tables";
import { getAdminToolEditorData, getAdminToolRuntimeConfigs } from "@/lib/admin/tools.service.server";
import { ToolVersionForm } from "@/features/admin/components/tool-config-forms";

export default async function AdminToolRuntimeConfigsPage() {
  const [configs, editor] = await Promise.all([getAdminToolRuntimeConfigs(), getAdminToolEditorData()]);
  return <><ToolRuntimeConfigTable configs={configs} /><ToolVersionForm tools={editor.tools} versions={editor.versions} /></>;
}
