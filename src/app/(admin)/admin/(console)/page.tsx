import { DashboardOverview } from "@/features/admin/components/dashboard-overview";
import { getAdminDashboardOverview } from "@/lib/admin/dashboard.service.server";

export default async function AdminDashboardPage() {
  const overview = await getAdminDashboardOverview();
  return <DashboardOverview overview={overview} />;
}
