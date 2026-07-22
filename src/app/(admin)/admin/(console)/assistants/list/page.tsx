import { AssistantListTable } from "@/features/admin/components/assistant-tables";
import { getAdminAssistantList } from "@/features/admin/server/assistants.service.server";

export default async function AdminAssistantListPage() {
  const assistants = await getAdminAssistantList();
  return <AssistantListTable assistants={assistants} />;
}
