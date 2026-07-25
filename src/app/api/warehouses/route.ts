import { db } from "@/db";
import { products, warehouseLocations, warehouses } from "@/db/schema";
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { handleError, ok, parseBody, recordAudit, requireRole, requireUser } from "@/lib/api";
import { warehouseSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireUser();
    const rows = await db
      .select({
        id: warehouses.id,
        name: warehouses.name,
        code: warehouses.code,
        address: warehouses.address,
        city: warehouses.city,
        country: warehouses.country,
        manager: warehouses.manager,
        createdAt: warehouses.createdAt,
        productCount: count(products.id),
        totalUnits: sql<string>`coalesce(sum(${products.currentStock}), 0)`,
        stockValue: sql<string>`coalesce(sum(${products.currentStock} * ${products.purchasePrice}), 0)`,
      })
      .from(warehouses)
      .leftJoin(
        products,
        and(eq(products.warehouseId, warehouses.id), isNull(products.deletedAt)),
      )
      .where(isNull(warehouses.deletedAt))
      .groupBy(warehouses.id)
      .orderBy(asc(warehouses.name));

    const locations = await db
      .select()
      .from(warehouseLocations)
      .orderBy(asc(warehouseLocations.label));

    return ok({
      items: rows.map((w) => ({
        ...w,
        locations: locations.filter((l) => l.warehouseId === w.id),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    const body = await parseBody(request, warehouseSchema);
    const inserted = await db
      .insert(warehouses)
      .values({
        name: body.name,
        code: body.code.toUpperCase(),
        address: body.address ?? null,
        city: body.city ?? null,
        country: body.country ?? null,
        manager: body.manager ?? null,
      })
      .returning();
    const warehouse = inserted[0];
    const zones = ["A", "B"];
    const values = zones.flatMap((zone) =>
      [1, 2, 3].map((shelf) => ({
        warehouseId: warehouse.id,
        zone,
        shelf: `S${shelf}`,
        bin: "B1",
        label: `${warehouse.code}-${zone}-S${shelf}-B1`,
      })),
    );
    await db.insert(warehouseLocations).values(values);
    await recordAudit({
      userId: user.id,
      action: "CREATE",
      entity: "Warehouse",
      entityId: warehouse.id,
      after: warehouse,
    });
    return ok({ warehouse }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
