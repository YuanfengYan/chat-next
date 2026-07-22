import { ToolInvocationLogTable } from "@/features/admin/components/tool-tables";
import { getAdminToolInvocationLogs } from "@/features/admin/server/tools.service.server";

export default async function AdminToolLogsPage() {
  const logs = await getAdminToolInvocationLogs();
  return <ToolInvocationLogTable logs={logs} />;
}
