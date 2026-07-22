import { PromptConfigTable } from "@/features/admin/components/assistant-tables";
import { getAdminPromptConfigs } from "@/features/admin/server/assistants.service.server";

export default async function AdminPromptConfigsPage() {
  const prompts = await getAdminPromptConfigs();
  return <PromptConfigTable prompts={prompts} />;
}
