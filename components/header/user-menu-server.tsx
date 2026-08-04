import { getCurrentEmployee } from "@/lib/auth/current";
import { getNavCounts } from "@/lib/queries/nav-counts";
import { getMyModuleAccess } from "@/lib/auth/module-access";
import { UserMenu } from "./user-menu";

export async function UserMenuServer() {
  const me = await getCurrentEmployee();
  if (!me) return null;
  // Memoised per request, so asking here costs nothing on pages that already
  // resolved access in the layout.
  const access = await getMyModuleAccess();
  // Inbox + Archived now live inside this menu, so it carries their counts —
  // the unread badge that used to sit on the nav pill moves here (plus a dot
  // on the avatar). Task totals are a shared cache hit; only the per-user
  // unread count actually queries.
  const { inboxUnread, archivedTasks } = await getNavCounts({
    userId: me.id,
    isAdmin: me.isAdmin,
    inboxSince: me.lastInboxVisitAt,
  });
  return (
    <UserMenu
      name={me.name}
      email={me.email}
      isAdmin={me.isAdmin}
      avatarUrl={me.avatarUrl}
      inboxUnread={inboxUnread}
      archivedTasks={archivedTasks}
      canAccessWms={access.wms?.allowed ?? true}
    />
  );
}
