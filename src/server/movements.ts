import { db } from "@/db";
import { notifications, products, stockMovements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api";
import type { MovementInput } from "@/lib/validation";
import type { SessionUser } from "@/lib/auth";

export function resolveNewQuantity(type: MovementInput["type"], previous: number, quantity: number) {
  switch (type) {
    case "IN":
    case "RETURN":
      return previous + Math.abs(quantity);
    case "OUT":
    case "TRANSFER":
      return previous - Math.abs(quantity);
    case "ADJUSTMENT":
      return previous + quantity;
    case "COUNT":
      return Math.max(0, quantity);
    default:
      return previous;
  }
}

export async function applyMovement(input: MovementInput, user: SessionUser) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);
    const product = rows[0];
    if (!product) throw new ApiError(404, "Product not found");

    const previous = product.currentStock;
    const next = resolveNewQuantity(input.type, previous, input.quantity);
    if (next < 0) throw new ApiError(400, "Insufficient stock for this movement");

    await tx
      .update(products)
      .set({
        currentStock: next,
        warehouseId: input.targetWarehouseId ?? product.warehouseId,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id));

    const inserted = await tx
      .insert(stockMovements)
      .values({
        productId: product.id,
        userId: user.id,
        warehouseId: input.targetWarehouseId ?? product.warehouseId,
        type: input.type,
        quantity: Math.abs(input.quantity),
        previousQuantity: previous,
        newQuantity: next,
        unitCost: product.purchasePrice,
        reason: input.reason ?? null,
        notes: input.notes ?? null,
        reference: input.reference ?? null,
      })
      .returning();

    if (next <= 0) {
      await tx.insert(notifications).values({
        userId: user.id,
        type: "OUT_OF_STOCK",
        title: "Out of stock",
        message: `${product.name} (${product.sku}) is now out of stock.`,
        entityId: product.id,
      });
    } else if (next <= product.minStock) {
      await tx.insert(notifications).values({
        userId: user.id,
        type: "LOW_STOCK",
        title: "Low stock alert",
        message: `${product.name} (${product.sku}) dropped to ${next} ${product.unit}s (min ${product.minStock}).`,
        entityId: product.id,
      });
    }

    return { movement: inserted[0], product: { ...product, currentStock: next } };
  });
}
