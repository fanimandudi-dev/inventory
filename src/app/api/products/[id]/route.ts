import { db } from "@/db";
import { products, stockMovements, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  ApiError,
  handleError,
  ok,
  parseBody,
  recordAudit,
  requireRole,
  requireUser,
} from "@/lib/api";
import { productUpdateSchema } from "@/lib/validation";
import { getProductById } from "@/server/products";
import { buildQrPayload, encodeQr } from "@/lib/qr";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const product = await getProductById(id);
    if (!product) throw new ApiError(404, "Product not found");
    const movements = await db
      .select({
        id: stockMovements.id,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        previousQuantity: stockMovements.previousQuantity,
        newQuantity: stockMovements.newQuantity,
        reason: stockMovements.reason,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
        userName: users.fullName,
      })
      .from(stockMovements)
      .leftJoin(users, eq(users.id, stockMovements.userId))
      .where(eq(stockMovements.productId, id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(25);
    const qr = encodeQr(
      buildQrPayload({
        id: product.id,
        sku: product.sku,
        qrToken: product.qrToken,
        warehouseCode: product.warehouseCode,
      }),
    );
    return ok({ product, movements, qr });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    const { id } = await ctx.params;
    const body = await parseBody(request, productUpdateSchema);
    const before = await getProductById(id);
    if (!before) throw new ApiError(404, "Product not found");

    const update: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of [
      "name",
      "barcode",
      "description",
      "imageUrl",
      "categoryId",
      "supplierId",
      "warehouseId",
      "locationId",
      "unit",
      "status",
      "reservedStock",
      "minStock",
      "maxStock",
      "currentStock",
    ] as const) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    if (body.sku !== undefined) update.sku = body.sku.toUpperCase();
    if (body.purchasePrice !== undefined) update.purchasePrice = String(body.purchasePrice);
    if (body.sellingPrice !== undefined) update.sellingPrice = String(body.sellingPrice);

    const updated = await db
      .update(products)
      .set(update)
      .where(eq(products.id, id))
      .returning();

    await recordAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "Product",
      entityId: id,
      before,
      after: updated[0],
    });
    return ok({ product: updated[0] });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    const { id } = await ctx.params;
    const before = await getProductById(id);
    if (!before) throw new ApiError(404, "Product not found");
    await db
      .update(products)
      .set({ deletedAt: new Date(), status: "INACTIVE" })
      .where(eq(products.id, id));
    await recordAudit({
      userId: user.id,
      action: "DELETE",
      entity: "Product",
      entityId: id,
      before,
    });
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
