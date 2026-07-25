import { db } from "@/db";
import { warehouses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleError, ok, parseBody, recordAudit, requireRole } from "@/lib/api";
import { warehouseSchema } from "@/lib/validation";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    const { id } = await ctx.params;
    const body = await parseBody(request, warehouseSchema.partial());
    const updated = await db
      .update(warehouses)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(warehouses.id, id))
      .returning();
    await recordAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "Warehouse",
      entityId: id,
      after: updated[0],
    });
    return ok({ warehouse: updated[0] });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["ADMIN"]);
    const { id } = await ctx.params;
    await db.update(warehouses).set({ deletedAt: new Date() }).where(eq(warehouses.id, id));
    await recordAudit({ userId: user.id, action: "DELETE", entity: "Warehouse", entityId: id });
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
