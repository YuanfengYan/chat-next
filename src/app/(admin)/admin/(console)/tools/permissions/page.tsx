import { ToolPermissionTable } from "@/features/admin/components/tool-tables";
import { getAdminToolEditorData, getAdminToolPermissionOverview } from "@/lib/admin/tools.service.server";
import { ToolBindingForm } from "@/features/admin/components/tool-config-forms";

export default async function AdminToolPermissionsPage() {
  const [permissions, editor] = await Promise.all([getAdminToolPermissionOverview(), getAdminToolEditorData()]);
  return <><ToolPermissionTable permissions={permissions} /><div className="mt-5"><ToolBindingForm tools={editor.tools} models={editor.models} /></div></>;
}
