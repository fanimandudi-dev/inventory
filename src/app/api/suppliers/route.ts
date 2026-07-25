import { db } from "@/db";
import { products, suppliers } from "@/db/schema";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { handleError, ok, parseBody, recordAudit, requireRole, requireUser } from "@/lib/api";
import { supplierSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireUser();
    const rows = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        contactPerson: suppliers.contactPerson,
        email: suppliers.email,
        phone: suppliers.phone,
        address: suppliers.address,
        country: suppliers.country,
        notes: suppliers.notes,
        createdAt: suppliers.createdAt,
        productCount: count(products.id),
      })
      .from(suppliers)
      .leftJoin(
        products,
        and(eq(products.supplierId, suppliers.id), isNull(products.deletedAt)),
      )
      .where(isNull(suppliers.deletedAt))
      .groupBy(suppliers.id)
      .orderBy(asc(suppliers.name));
    return ok({ items: rows });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    const body = await parseBody(request, supplierSchema);
    const inserted = await db
      .insert(suppliers)
      .values({
        name: body.name,
        contactPerson: body.contactPerson ?? null,
        email: body.email || null,
        phone: body.phone ?? null,
        address: body.address ?? null,
        country: body.country ?? null,
        notes: body.notes ?? null,
      })
      .returning();
    await recordAudit({
      userId: user.id,
      action: "CREATE",
      entity: "Supplier",
      entityId: inserted[0].id,
      after: inserted[0],
    });
    return ok({ supplier: inserted[0] }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
