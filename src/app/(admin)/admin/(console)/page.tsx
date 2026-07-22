import { DashboardOverview } from "@/features/admin/components/dashboard-overview";
import { getAdminDashboardOverview } from "@/features/admin/server/dashboard.service.server";

export default async function AdminDashboardPage() {
  const overview = await getAdminDashboardOverview();
  return <DashboardOverview overview={overview} />;
}
