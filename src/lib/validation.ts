import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const profileSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

const optionalUuid = z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

export const productSchema = z.object({
  name: z.string().min(2, "Name is required"),
  sku: z.string().min(2, "SKU is required"),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  categoryId: optionalUuid,
  supplierId: optionalUuid,
  warehouseId: optionalUuid,
  locationId: optionalUuid,
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  currentStock: z.coerce.number().int().min(0).default(0),
  reservedStock: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  maxStock: z.coerce.number().int().min(0).default(0),
  unit: z.string().default("unit"),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]).default("ACTIVE"),
});

export const productUpdateSchema = productSchema.partial();

export const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  color: z.string().default("#6366f1"),
  parentId: optionalUuid,
});

export const supplierSchema = z.object({
  name: z.string().min(2),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const warehouseSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  manager: z.string().optional().nullable(),
});

export const movementSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(["IN", "OUT", "ADJUSTMENT", "TRANSFER", "RETURN", "COUNT"]),
  quantity: z.coerce.number().int(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  targetWarehouseId: optionalUuid,
});

export type ProductInput = z.infer<typeof productSchema>;
export type MovementInput = z.infer<typeof movementSchema>;
