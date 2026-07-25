"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Download, Loader2, Printer } from "lucide-react";
import QRCodeSVG from "react-qr-code";
import { api, type ProductDTO } from "@/lib/client";
import { Badge, Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export type RefData = {
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  warehouses: { id: string; name: string; code: string; locations?: { id: string; label: string }[] }[];
};

export function useRefData() {
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<{ items: { id: string; name: string }[] }>("/api/categories"),
  });
  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get<{ items: { id: string; name: string }[] }>("/api/suppliers"),
  });
  const warehouses = useQuery({
    queryKey: ["warehouses"],
    queryFn: () =>
      api.get<{
        items: { id: string; name: string; code: string; locations: { id: string; label: string }[] }[];
      }>("/api/warehouses"),
  });
  return {
    categories: categories.data?.items ?? [],
    suppliers: suppliers.data?.items ?? [],
    warehouses: warehouses.data?.items ?? [],
  };
}

type ProductFormValues = {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  categoryId: string;
  supplierId: string;
  warehouseId: string;
  locationId: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  reservedStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
};

export function ProductDialog({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product?: ProductDTO | null;
}) {
  const ref = useRefData();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, formState } = useForm<ProductFormValues>();
  const warehouseId = watch("warehouseId");

  useEffect(() => {
    reset({
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      barcode: product?.barcode ?? "",
      description: product?.description ?? "",
      categoryId: product?.categoryId ?? "",
      supplierId: product?.supplierId ?? "",
      warehouseId: product?.warehouseId ?? "",
      locationId: product?.locationId ?? "",
      purchasePrice: Number(product?.purchasePrice ?? 0),
      sellingPrice: Number(product?.sellingPrice ?? 0),
      currentStock: product?.currentStock ?? 0,
      reservedStock: product?.reservedStock ?? 0,
      minStock: product?.minStock ?? 10,
      maxStock: product?.maxStock ?? 100,
      unit: product?.unit ?? "unit",
      status: product?.status ?? "ACTIVE",
    });
  }, [product, open, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const payload = { ...values };
      return product
        ? api.patch(`/api/products/${product.id}`, payload)
        : api.post("/api/products", payload);
    },
    onSuccess: () => {
      toast.success(product ? "Product updated" : "Product created");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const locations =
    ref.warehouses.find((w) => w.id === warehouseId)?.locations ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={product ? `Edit ${product.name}` : "New product"}
      description="Products automatically receive a signed QR label on creation."
    >
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Product name" className="sm:col-span-2">
          <Input {...register("name", { required: true })} placeholder="Wireless barcode scanner" />
        </Field>
        <Field label="SKU">
          <Input {...register("sku", { required: true })} placeholder="ELE-1042" />
        </Field>
        <Field label="Barcode">
          <Input {...register("barcode")} placeholder="3600000000000" />
        </Field>
        <Field label="Category">
          <Select {...register("categoryId")}>
            <option value="">Unassigned</option>
            {ref.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Supplier">
          <Select {...register("supplierId")}>
            <option value="">Unassigned</option>
            {ref.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Warehouse">
          <Select {...register("warehouseId")}>
            <option value="">Unassigned</option>
            {ref.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Storage location">
          <Select {...register("locationId")}>
            <option value="">Unassigned</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Purchase price">
          <Input type="number" step="0.01" {...register("purchasePrice", { valueAsNumber: true })} />
        </Field>
        <Field label="Selling price">
          <Input type="number" step="0.01" {...register("sellingPrice", { valueAsNumber: true })} />
        </Field>
        <Field label="Current stock">
          <Input type="number" {...register("currentStock", { valueAsNumber: true })} />
        </Field>
        <Field label="Reserved stock">
          <Input type="number" {...register("reservedStock", { valueAsNumber: true })} />
        </Field>
        <Field label="Minimum stock">
          <Input type="number" {...register("minStock", { valueAsNumber: true })} />
        </Field>
        <Field label="Maximum stock">
          <Input type="number" {...register("maxStock", { valueAsNumber: true })} />
        </Field>
        <Field label="Unit">
          <Input {...register("unit")} placeholder="unit" />
        </Field>
        <Field label="Status">
          <Select {...register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DISCONTINUED">Discontinued</option>
          </Select>
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea rows={3} {...register("description")} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending || formState.isSubmitting}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {product ? "Save changes" : "Create product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const REASONS: Record<string, string[]> = {
  IN: ["Supplier delivery", "Purchase order receipt", "Restock", "Production output"],
  OUT: ["Customer order", "Sales pick", "Store transfer", "Damaged / scrapped"],
  ADJUSTMENT: ["Cycle count correction", "Shrinkage", "Data entry fix"],
  TRANSFER: ["Inter-warehouse transfer"],
  RETURN: ["Customer return", "Supplier credit"],
  COUNT: ["Inventory count"],
};

export function MovementDialog({
  open,
  onClose,
  product,
  defaultType = "IN",
}: {
  open: boolean;
  onClose: () => void;
  product: { id: string; name: string; sku: string; currentStock: number; unit?: string } | null;
  defaultType?: "IN" | "OUT" | "ADJUSTMENT" | "COUNT" | "TRANSFER" | "RETURN";
}) {
  const queryClient = useQueryClient();
  const ref = useRefData();
  const [type, setType] = useState(defaultType);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [targetWarehouseId, setTargetWarehouseId] = useState("");

  useEffect(() => {
    setType(defaultType);
    setQuantity(1);
    setReason(REASONS[defaultType]?.[0] ?? "");
    setNotes("");
  }, [defaultType, open]);

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/api/movements", {
        productId: product?.id,
        type,
        quantity,
        reason,
        notes,
        targetWarehouseId: type === "TRANSFER" ? targetWarehouseId : null,
      }),
    onSuccess: () => {
      toast.success("Stock movement recorded");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!product) return null;

  const projected =
    type === "IN" || type === "RETURN"
      ? product.currentStock + Math.abs(quantity)
      : type === "OUT" || type === "TRANSFER"
        ? product.currentStock - Math.abs(quantity)
        : type === "COUNT"
          ? quantity
          : product.currentStock + quantity;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record stock movement"
      description={`${product.name} · ${product.sku}`}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(["IN", "OUT", "ADJUSTMENT", "COUNT", "TRANSFER", "RETURN"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setReason(REASONS[t]?.[0] ?? "");
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                type === t
                  ? "border-transparent bg-brand text-white"
                  : "border-line hover:bg-surface-2"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <Field label={type === "COUNT" ? "Counted quantity" : "Quantity"}>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </Field>

        {type === "TRANSFER" ? (
          <Field label="Destination warehouse">
            <Select
              value={targetWarehouseId}
              onChange={(e) => setTargetWarehouseId(e.target.value)}
            >
              <option value="">Select warehouse</option>
              {ref.warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label="Reason">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {(REASONS[type] ?? []).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Notes">
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional context for the audit trail"
          />
        </Field>

        <div className="bg-surface-2 flex items-center justify-between rounded-xl p-3 text-sm">
          <span className="text-muted">Projected stock</span>
          <span className="font-semibold">
            {product.currentStock} → {projected < 0 ? "⚠︎ " : ""}
            {projected}
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || projected < 0}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm movement
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function QrDialog({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product: ProductDTO | null;
}) {
  const { data } = useQuery({
    queryKey: ["qr", product?.id],
    queryFn: () => api.get<{ encoded: string; payload: { sig: string } }>(`/api/qr/${product?.id}`),
    enabled: open && Boolean(product?.id),
  });

  if (!product) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Signed QR label"
      description={`${product.name} · ${product.sku}`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-2xl bg-white p-4">
          {data?.encoded ? (
            <QRCodeSVG value={data.encoded} size={190} />
          ) : (
            <div className="h-[190px] w-[190px] animate-pulse rounded bg-slate-200" />
          )}
        </div>
        <div className="text-center">
          <Badge tone="brand">checksum {data?.payload?.sig ?? "…"}</Badge>
          <p className="text-muted mt-2 text-xs">
            Payload includes product id, SKU, warehouse code and an HMAC integrity checksum.
          </p>
          <p className="text-muted mt-1 text-xs">
            {formatCurrency(product.sellingPrice)} · {product.warehouseName ?? "Unassigned"}
          </p>
        </div>
        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.open(`/api/qr/${product.id}?format=png`, "_blank")}
          >
            <Download className="h-4 w-4" /> PNG
          </Button>
          <Button
            className="flex-1"
            onClick={() => window.open(`/api/qr/labels?ids=${product.id}`, "_blank")}
          >
            <Printer className="h-4 w-4" /> Print label
          </Button>
        </div>
      </div>
    </Modal>
  );
}
