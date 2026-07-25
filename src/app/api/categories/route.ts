import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { handleError, ok, parseBody, recordAudit, requireRole, requireUser } from "@/lib/api";
import { categorySchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    await requireUser();
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        color: categories.color,
        parentId: categories.parentId,
        createdAt: categories.createdAt,
        productCount: count(products.id),
        stockValue: sql<string>`coalesce(sum(${products.currentStock} * ${products.purchasePrice}), 0)`,
      })
      .from(categories)
      .leftJoin(
        products,
        and(eq(products.categoryId, categories.id), isNull(products.deletedAt)),
      )
      .where(isNull(categories.deletedAt))
      .groupBy(categories.id)
      .orderBy(asc(categories.name));
    return ok({ items: rows });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    const body = await parseBody(request, categorySchema);
    const inserted = await db
      .insert(categories)
      .values({
        name: body.name,
        slug: `${slugify(body.name)}-${Math.random().toString(36).slice(2, 6)}`,
        description: body.description ?? null,
        color: body.color,
        parentId: body.parentId,
      })
      .returning();
    await recordAudit({
      userId: user.id,
      action: "CREATE",
      entity: "Category",
      entityId: inserted[0].id,
      after: inserted[0],
    });
    return ok({ category: inserted[0] }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
