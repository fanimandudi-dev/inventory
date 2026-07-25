import { randomBytes } from "crypto";
import { db } from "@/db";
import { notifications, products, qrLabels, stockMovements, warehouses } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  handleError,
  ok,
  pagination,
  parseBody,
  recordAudit,
  requireRole,
  requireUser,
  ApiError,
} from "@/lib/api";
import { productSchema } from "@/lib/validation";
import { listProducts, parseProductFilters } from "@/server/products";
import { buildQrPayload, encodeQr } from "@/lib/qr";

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const { page, limit, offset } = pagination(url);
    const result = await listProducts(parseProductFilters(url, page, limit, offset));
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    const body = await parseBody(request, productSchema);

    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.sku, body.sku))
      .limit(1);
    if (existing[0]) throw new ApiError(409, `SKU ${body.sku} already exists`);

    const qrToken = randomBytes(8).toString("hex");
    const inserted = await db
      .insert(products)
      .values({
        name: body.name,
        sku: body.sku.toUpperCase(),
        barcode: body.barcode ?? null,
        qrToken,
        description: body.description ?? null,
        imageUrl: body.imageUrl ?? null,
        categoryId: body.categoryId,
        supplierId: body.supplierId,
        warehouseId: body.warehouseId,
        locationId: body.locationId,
        purchasePrice: String(body.purchasePrice),
        sellingPrice: String(body.sellingPrice),
        currentStock: body.currentStock,
        reservedStock: body.reservedStock,
        minStock: body.minStock,
        maxStock: body.maxStock,
        unit: body.unit,
        status: body.status,
      })
      .returning();
    const product = inserted[0];

    let warehouseCode: string | null = null;
    if (product.warehouseId) {
      const wh = await db
        .select({ code: warehouses.code })
        .from(warehouses)
        .where(eq(warehouses.id, product.warehouseId))
        .limit(1);
      warehouseCode = wh[0]?.code ?? null;
    }
    const payload = buildQrPayload({ ...product, warehouseCode });
    await db.insert(qrLabels).values({
      productId: product.id,
      payload: encodeQr(payload),
      checksum: payload.sig,
    });

    if (product.currentStock > 0) {
      await db.insert(stockMovements).values({
        productId: product.id,
        userId: user.id,
        warehouseId: product.warehouseId,
        type: "IN",
        quantity: product.currentStock,
        previousQuantity: 0,
        newQuantity: product.currentStock,
        reason: "Initial stock",
      });
    }

    await db.insert(notifications).values({
      userId: user.id,
      type: "NEW_PRODUCT",
      title: "Product created",
      message: `${product.name} (${product.sku}) was added to the catalogue.`,
      entityId: product.id,
    });

    await recordAudit({
      userId: user.id,
      action: "CREATE",
      entity: "Product",
      entityId: product.id,
      after: product,
    });

    return ok({ product }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
