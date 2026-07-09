import { ToolInvocationLogTable } from "@/features/admin/components/tool-tables";
import { getAdminToolInvocationLogs } from "@/lib/admin/tools.service.server";

export default async function AdminToolLogsPage() {
  const logs = await getAdminToolInvocationLogs();
  return <ToolInvocationLogTable logs={logs} />;
}
