import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/guard";
import { listNotifications } from "@/server/services/notifications";
import { parsePagination } from "@/lib/pagination";
import { NotificationList } from "@/components/site/notification-list";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUserPage();
  const query = await searchParams;
  const { page, pageSize } = parsePagination({ page: Number(query.page) });
  const data = await listNotifications(user.id, page, pageSize);

  return (
    <div className="container-page max-w-3xl py-8">
      <div className="mb-6">
        <p className="label-caps">Ton activité</p>
        <h1 className="text-2xl font-black tracking-tight text-ink-950">Notifications</h1>
        <p className="mt-1 text-sm text-ink-500">{data.unread} non lue(s) sur {data.total}.</p>
      </div>
      <NotificationList items={data.items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() ?? null }))} />
      <Pagination page={page} total={data.total} pageSize={pageSize} basePath="/notifications" />
    </div>
  );
}
