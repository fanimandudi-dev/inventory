import {
  pgTable,
  text,
  uuid,
  integer,
  numeric,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "MANAGER",
  "EMPLOYEE",
  "AUDITOR",
]);

export const productStatusEnum = pgEnum("product_status", [
  "ACTIVE",
  "INACTIVE",
  "DISCONTINUED",
]);

export const movementTypeEnum = pgEnum("movement_type", [
  "IN",
  "OUT",
  "ADJUSTMENT",
  "TRANSFER",
  "RETURN",
  "COUNT",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "NEW_PRODUCT",
  "MOVEMENT",
  "SYSTEM",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    role: userRoleEnum("role").notNull().default("EMPLOYEE"),
    avatarUrl: text("avatar_url"),
    phone: text("phone"),
    jobTitle: text("job_title"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_key").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refreshTokenHash: text("refresh_token_hash").notNull(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    color: text("color").notNull().default("#6366f1"),
    parentId: uuid("parent_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categories_slug_key").on(t.slug)],
);

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  country: text("country"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const warehouses = pgTable(
  "warehouses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    address: text("address"),
    city: text("city"),
    country: text("country"),
    manager: text("manager"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("warehouses_code_key").on(t.code)],
);

export const warehouseLocations = pgTable(
  "warehouse_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    zone: text("zone").notNull(),
    shelf: text("shelf").notNull(),
    bin: text("bin").notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("locations_warehouse_idx").on(t.warehouseId)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    barcode: text("barcode"),
    qrToken: text("qr_token").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id, {
      onDelete: "set null",
    }),
    locationId: uuid("location_id").references(() => warehouseLocations.id, {
      onDelete: "set null",
    }),
    purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    sellingPrice: numeric("selling_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    currentStock: integer("current_stock").notNull().default(0),
    reservedStock: integer("reserved_stock").notNull().default(0),
    minStock: integer("min_stock").notNull().default(0),
    maxStock: integer("max_stock").notNull().default(0),
    unit: text("unit").notNull().default("unit"),
    status: productStatusEnum("status").notNull().default("ACTIVE"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("products_sku_key").on(t.sku),
    index("products_category_idx").on(t.categoryId),
    index("products_warehouse_idx").on(t.warehouseId),
    index("products_name_idx").on(t.name),
  ],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id, {
      onDelete: "set null",
    }),
    type: movementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    previousQuantity: integer("previous_quantity").notNull(),
    newQuantity: integer("new_quantity").notNull(),
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 }),
    reason: text("reason"),
    notes: text("notes"),
    reference: text("reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("movements_product_idx").on(t.productId),
    index("movements_created_idx").on(t.createdAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    beforeValue: jsonb("before_value"),
    afterValue: jsonb("after_value"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    entityId: text("entity_id"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

export const qrLabels = pgTable("qr_labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  checksum: text("checksum").notNull(),
  printedCount: integer("printed_count").notNull().default(0),
  lastPrintedAt: timestamp("last_printed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  warehouse: one(warehouses, {
    fields: [products.warehouseId],
    references: [warehouses.id],
  }),
  location: one(warehouseLocations, {
    fields: [products.locationId],
    references: [warehouseLocations.id],
  }),
  movements: many(stockMovements),
}));

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Warehouse = typeof warehouses.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
