import { KnowledgeBindingTable } from "@/features/admin/components/assistant-tables";
import { getAdminKnowledgeBindings } from "@/features/admin/server/assistants.service.server";

export default async function AdminKnowledgeBindingsPage() {
  const bindings = await getAdminKnowledgeBindings();
  return <KnowledgeBindingTable bindings={bindings} />;
}
