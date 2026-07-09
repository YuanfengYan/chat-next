import { ToolPermissionTable } from "@/features/admin/components/tool-tables";
import { getAdminToolPermissionOverview } from "@/lib/admin/tools.service.server";

export default async function AdminToolPermissionsPage() {
  const permissions = await getAdminToolPermissionOverview();
  return <ToolPermissionTable permissions={permissions} />;
}
