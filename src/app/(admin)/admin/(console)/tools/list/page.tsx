import { ToolListTable } from "@/features/admin/components/tool-tables";
import { getAdminToolList } from "@/lib/admin/tools.service.server";
import { getAdminToolEditorData } from "@/lib/admin/tools.service.server";
import { ToolCatalogForm } from "@/features/admin/components/tool-config-forms";

export default async function AdminToolListPage() {
  const [tools, editor] = await Promise.all([getAdminToolList(), getAdminToolEditorData()]);
  return <><ToolListTable tools={tools} /><ToolCatalogForm tools={editor.tools} /></>;
}
