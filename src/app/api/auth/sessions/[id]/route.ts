import { db } from "@/db";
import { sessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { handleError, ok, requireUser } from "@/lib/api";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, id), eq(sessions.userId, user.id)));
    return ok({ revoked: true });
  } catch (error) {
    return handleError(error);
  }
}
