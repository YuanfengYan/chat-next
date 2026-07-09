import { ToolListTable } from "@/features/admin/components/tool-tables";
import { getAdminToolList } from "@/lib/admin/tools.service.server";

export default async function AdminToolListPage() {
  const tools = await getAdminToolList();
  return <ToolListTable tools={tools} />;
}
