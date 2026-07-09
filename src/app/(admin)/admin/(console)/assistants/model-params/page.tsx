import { ModelParameterTable } from "@/features/admin/components/assistant-tables";
import { getAdminModelParameterConfigs } from "@/lib/admin/assistants.service.server";

export default async function AdminModelParamsPage() {
  const models = await getAdminModelParameterConfigs();
  return <ModelParameterTable models={models} />;
}
