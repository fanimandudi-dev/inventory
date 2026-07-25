import { db } from "@/db";
import {
  categories,
  products,
  suppliers,
  warehouses,
  warehouseLocations,
} from "@/db/schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  lte,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";

export const productColumns = {
  id: products.id,
  name: products.name,
  sku: products.sku,
  barcode: products.barcode,
  qrToken: products.qrToken,
  description: products.description,
  imageUrl: products.imageUrl,
  categoryId: products.categoryId,
  supplierId: products.supplierId,
  warehouseId: products.warehouseId,
  locationId: products.locationId,
  purchasePrice: products.purchasePrice,
  sellingPrice: products.sellingPrice,
  currentStock: products.currentStock,
  reservedStock: products.reservedStock,
  minStock: products.minStock,
  maxStock: products.maxStock,
  unit: products.unit,
  status: products.status,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
  categoryName: categories.name,
  categoryColor: categories.color,
  supplierName: suppliers.name,
  warehouseName: warehouses.name,
  warehouseCode: warehouses.code,
  locationLabel: warehouseLocations.label,
};

export type ProductRow = {
  [K in keyof typeof productColumns]: unknown;
} & {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  qrToken: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  supplierId: string | null;
  warehouseId: string | null;
  locationId: string | null;
  purchasePrice: string;
  sellingPrice: string;
  currentStock: number;
  reservedStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  categoryName: string | null;
  categoryColor: string | null;
  supplierName: string | null;
  warehouseName: string | null;
  warehouseCode: string | null;
  locationLabel: string | null;
};

function baseQuery() {
  return db
    .select(productColumns)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(suppliers, eq(suppliers.id, products.supplierId))
    .leftJoin(warehouses, eq(warehouses.id, products.warehouseId))
    .leftJoin(warehouseLocations, eq(warehouseLocations.id, products.locationId));
}

export type ProductFilters = {
  search?: string | null;
  categoryId?: string | null;
  supplierId?: string | null;
  warehouseId?: string | null;
  status?: string | null;
  stockState?: string | null;
  sort?: string | null;
  direction?: string | null;
  page: number;
  limit: number;
  offset: number;
};

export async function listProducts(filters: ProductFilters) {
  const clauses: SQL[] = [isNull(products.deletedAt)];
  if (filters.search) {
    const term = `%${filters.search}%`;
    const search = or(
      ilike(products.name, term),
      ilike(products.sku, term),
      ilike(products.barcode, term),
      ilike(categories.name, term),
      ilike(suppliers.name, term),
      ilike(warehouses.name, term),
    );
    if (search) clauses.push(search);
  }
  if (filters.categoryId) clauses.push(eq(products.categoryId, filters.categoryId));
  if (filters.supplierId) clauses.push(eq(products.supplierId, filters.supplierId));
  if (filters.warehouseId) clauses.push(eq(products.warehouseId, filters.warehouseId));
  if (filters.status)
    clauses.push(eq(products.status, filters.status as "ACTIVE" | "INACTIVE" | "DISCONTINUED"));
  if (filters.stockState === "out") clauses.push(lte(products.currentStock, 0));
  if (filters.stockState === "low")
    clauses.push(sql`${products.currentStock} > 0 and ${products.currentStock} <= ${products.minStock}`);
  if (filters.stockState === "ok")
    clauses.push(sql`${products.currentStock} > ${products.minStock}`);

  const where = and(...clauses);
  const sortMap: Record<string, SQLWrapper> = {
    name: products.name,
    sku: products.sku,
    stock: products.currentStock,
    price: products.sellingPrice,
    updated: products.updatedAt,
    created: products.createdAt,
  };
  const column = sortMap[filters.sort ?? "updated"] ?? products.updatedAt;
  const order = filters.direction === "asc" ? asc(column) : desc(column);

  const rows = (await baseQuery()
    .where(where)
    .orderBy(order)
    .limit(filters.limit)
    .offset(filters.offset)) as unknown as ProductRow[];

  const totalRows = await db
    .select({ value: count() })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(suppliers, eq(suppliers.id, products.supplierId))
    .leftJoin(warehouses, eq(warehouses.id, products.warehouseId))
    .where(where);
  const total = Number(totalRows[0]?.value ?? 0);

  return {
    items: rows,
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function getProductById(id: string) {
  const rows = (await baseQuery()
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .limit(1)) as unknown as ProductRow[];
  return rows[0] ?? null;
}

export async function getProductBySku(sku: string) {
  const rows = (await baseQuery()
    .where(and(eq(products.sku, sku), isNull(products.deletedAt)))
    .limit(1)) as unknown as ProductRow[];
  return rows[0] ?? null;
}

export function parseProductFilters(url: URL, page: number, limit: number, offset: number): ProductFilters {
  return {
    search: url.searchParams.get("search"),
    categoryId: url.searchParams.get("categoryId"),
    supplierId: url.searchParams.get("supplierId"),
    warehouseId: url.searchParams.get("warehouseId"),
    status: url.searchParams.get("status"),
    stockState: url.searchParams.get("stockState"),
    sort: url.searchParams.get("sort"),
    direction: url.searchParams.get("direction"),
    page,
    limit,
    offset,
  };
}
