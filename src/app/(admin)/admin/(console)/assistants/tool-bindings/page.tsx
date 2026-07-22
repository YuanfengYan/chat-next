import { ToolBindingTable } from "@/features/admin/components/assistant-tables";
import { getAdminToolBindings } from "@/features/admin/server/assistants.service.server";

export default async function AdminToolBindingsPage() {
  const bindings = await getAdminToolBindings();
  return <ToolBindingTable bindings={bindings} />;
}
