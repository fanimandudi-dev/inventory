import { db } from "@/db";
import { products, stockMovements, users, warehouses } from "@/db/schema";
import { and, count, desc, eq, gte, ilike, or, type SQL } from "drizzle-orm";
import {
  handleError,
  ok,
  pagination,
  parseBody,
  recordAudit,
  requireRole,
  requireUser,
} from "@/lib/api";
import { movementSchema } from "@/lib/validation";
import { applyMovement } from "@/server/movements";

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const { page, limit, offset } = pagination(url);
    const clauses: SQL[] = [];
    const type = url.searchParams.get("type");
    const productId = url.searchParams.get("productId");
    const search = url.searchParams.get("search");
    const since = url.searchParams.get("since");
    if (type)
      clauses.push(
        eq(stockMovements.type, type as "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER" | "RETURN" | "COUNT"),
      );
    if (productId) clauses.push(eq(stockMovements.productId, productId));
    if (since) clauses.push(gte(stockMovements.createdAt, new Date(since)));
    if (search) {
      const term = `%${search}%`;
      const s = or(ilike(products.name, term), ilike(products.sku, term));
      if (s) clauses.push(s);
    }
    const where = clauses.length ? and(...clauses) : undefined;

    const items = await db
      .select({
        id: stockMovements.id,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        previousQuantity: stockMovements.previousQuantity,
        newQuantity: stockMovements.newQuantity,
        reason: stockMovements.reason,
        notes: stockMovements.notes,
        reference: stockMovements.reference,
        createdAt: stockMovements.createdAt,
        productId: products.id,
        productName: products.name,
        productSku: products.sku,
        unitCost: stockMovements.unitCost,
        userName: users.fullName,
        warehouseName: warehouses.name,
      })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .leftJoin(users, eq(users.id, stockMovements.userId))
      .leftJoin(warehouses, eq(warehouses.id, stockMovements.warehouseId))
      .where(where)
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit)
      .offset(offset);

    const totalRows = await db
      .select({ value: count() })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .where(where);
    const total = Number(totalRows[0]?.value ?? 0);

    return ok({
      items,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER", "EMPLOYEE"]);
    const body = await parseBody(request, movementSchema);
    const result = await applyMovement(body, user);
    await recordAudit({
      userId: user.id,
      action: `STOCK_${body.type}`,
      entity: "StockMovement",
      entityId: result.movement?.id,
      before: { quantity: result.movement?.previousQuantity },
      after: { quantity: result.movement?.newQuantity, reason: body.reason },
    });
    return ok(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
