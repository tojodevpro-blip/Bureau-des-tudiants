import { hasTreasuryAccess, requireStaffPage } from "@/lib/auth/guard";
import { getUserStats } from "@/server/services/users";
import { getCurrentElection } from "@/server/services/elections";
import { AdminShell } from "@/components/admin/admin-shell";
import { getEnabledModules } from "@/lib/modules";
import { pendingReportCount } from "@/server/services/reports";
import { unreadNotificationCount } from "@/server/services/notifications";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireStaffPage();
  const [stats, openElection, modules, reports, unread, branding] = await Promise.all([
    getUserStats(),
    getCurrentElection(),
    getEnabledModules(),
    pendingReportCount(),
    unreadNotificationCount(admin.id),
    getBranding(),
  ]);

  return (
    <AdminShell
      adminEmail={admin.email}
      role={admin.role === "ADMIN" ? "ADMIN" : "MEMBRE_BDE"}
      modules={[...modules]}
      pendingCount={stats.enAttente}
      pendingReports={reports}
      openElection={
        openElection && openElection.statut === "OUVERTE" ? openElection.titre : null
      }
      initialUnread={unread}
      branding={branding}
      treasuryAccess={hasTreasuryAccess(admin)}
    >
      {children}
    </AdminShell>
  );
}
