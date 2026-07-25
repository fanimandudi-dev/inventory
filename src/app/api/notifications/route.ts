import { db } from "@/db";
import { notifications } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { handleError, ok, requireUser } from "@/lib/api";

export async function GET() {
  try {
    await requireUser();
    const items = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(30);
    const unread = items.filter((n) => !n.isRead).length;
    return ok({ items, unread });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    } else {
      await db.update(notifications).set({ isRead: true }).where(sql`is_read = false`);
    }
    return ok({ updated: true });
  } catch (error) {
    return handleError(error);
  }
}
