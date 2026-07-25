import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleError, ok, parseBody, recordAudit, requireRole } from "@/lib/api";
import { supplierSchema } from "@/lib/validation";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    const { id } = await ctx.params;
    const body = await parseBody(request, supplierSchema.partial());
    const updated = await db
      .update(suppliers)
      .set({ ...body, email: body.email || null, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    await recordAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "Supplier",
      entityId: id,
      after: updated[0],
    });
    return ok({ supplier: updated[0] });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    const { id } = await ctx.params;
    await db.update(suppliers).set({ deletedAt: new Date() }).where(eq(suppliers.id, id));
    await recordAudit({ userId: user.id, action: "DELETE", entity: "Supplier", entityId: id });
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
