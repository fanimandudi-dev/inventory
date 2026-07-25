import { db } from "@/db";
import { categories, products, suppliers, warehouses } from "@/db/schema";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { handleError, ok, requireUser } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 1) return ok({ products: [], categories: [], suppliers: [], warehouses: [] });
    const term = `%${q}%`;

    const productRows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        currentStock: products.currentStock,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(
        and(
          isNull(products.deletedAt),
          or(ilike(products.name, term), ilike(products.sku, term), ilike(products.barcode, term)),
        ),
      )
      .limit(8);

    const categoryRows = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(isNull(categories.deletedAt), ilike(categories.name, term)))
      .limit(5);

    const supplierRows = await db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(and(isNull(suppliers.deletedAt), ilike(suppliers.name, term)))
      .limit(5);

    const warehouseRows = await db
      .select({ id: warehouses.id, name: warehouses.name, code: warehouses.code })
      .from(warehouses)
      .where(
        and(
          isNull(warehouses.deletedAt),
          or(ilike(warehouses.name, term), ilike(warehouses.code, term)),
        ),
      )
      .limit(5);

    return ok({
      products: productRows,
      categories: categoryRows,
      suppliers: supplierRows,
      warehouses: warehouseRows,
    });
  } catch (error) {
    return handleError(error);
  }
}
