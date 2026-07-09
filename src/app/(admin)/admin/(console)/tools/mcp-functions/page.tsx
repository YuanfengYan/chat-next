import { ToolRuntimeConfigTable } from "@/features/admin/components/tool-tables";
import { getAdminToolRuntimeConfigs } from "@/lib/admin/tools.service.server";

export default async function AdminToolRuntimeConfigsPage() {
  const configs = await getAdminToolRuntimeConfigs();
  return <ToolRuntimeConfigTable configs={configs} />;
}
