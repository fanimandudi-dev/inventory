"use client";

export type ApiEnvelope<T> = { success: boolean; data: T; error?: { message: string } };

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !json?.success) {
    const message = json?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json.data;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

export type ProductDTO = {
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
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  createdAt: string;
  updatedAt: string;
  categoryName: string | null;
  categoryColor: string | null;
  supplierName: string | null;
  warehouseName: string | null;
  warehouseCode: string | null;
  locationLabel: string | null;
};

export type Paged<T> = {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type MovementDTO = {
  id: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER" | "RETURN" | "COUNT";
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  notes: string | null;
  reference: string | null;
  createdAt: string;
  productId: string;
  productName: string;
  productSku: string;
  userName: string | null;
  warehouseName: string | null;
};
