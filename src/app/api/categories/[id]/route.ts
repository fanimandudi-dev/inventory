import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleError, ok, parseBody, recordAudit, requireRole } from "@/lib/api";
import { categorySchema } from "@/lib/validation";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    const { id } = await ctx.params;
    const body = await parseBody(request, categorySchema.partial());
    const updated = await db
      .update(categories)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    await recordAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "Category",
      entityId: id,
      after: updated[0],
    });
    return ok({ category: updated[0] });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    const { id } = await ctx.params;
    await db.update(categories).set({ deletedAt: new Date() }).where(eq(categories.id, id));
    await recordAudit({ userId: user.id, action: "DELETE", entity: "Category", entityId: id });
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
