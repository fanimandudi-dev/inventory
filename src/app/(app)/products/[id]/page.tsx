"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import QRCodeSVG from "react-qr-code";
import {
  ArrowLeft,
  Download,
  Pencil,
  Printer,
  Repeat,
} from "lucide-react";
import { api, type ProductDTO } from "@/lib/client";
import {
  Badge,
  Button,
  Card,
  SectionTitle,
  Skeleton,
  StockBadge,
  TableShell,
} from "@/components/ui";
import { MovementDialog, ProductDialog } from "@/components/dialogs";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Detail = {
  product: ProductDTO;
  qr: string;
  movements: {
    id: string;
    type: string;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string | null;
    notes: string | null;
    createdAt: string;
    userName: string | null;
  }[];
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["product", params.id],
    queryFn: () => api.get<Detail>(`/api/products/${params.id}`),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const p = data.product;
  const stockValue = Number(p.purchasePrice) * p.currentStock;
  const margin = Number(p.sellingPrice) - Number(p.purchasePrice);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{p.name}</h1>
            <p className="text-muted font-mono text-xs">{p.sku}</p>
          </div>
          <StockBadge stock={p.currentStock} min={p.minStock} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button onClick={() => setMovementOpen(true)}>
            <Repeat className="h-4 w-4" /> Stock movement
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Product details" />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              ["Category", p.categoryName ?? "—"],
              ["Supplier", p.supplierName ?? "—"],
              ["Warehouse", p.warehouseName ?? "—"],
              ["Location", p.locationLabel ?? "—"],
              ["Barcode", p.barcode ?? "—"],
              ["Status", p.status],
              ["Purchase price", formatCurrency(p.purchasePrice)],
              ["Selling price", formatCurrency(p.sellingPrice)],
              ["Unit margin", formatCurrency(margin)],
              ["Current stock", `${p.currentStock} ${p.unit}`],
              ["Reserved", `${p.reservedStock} ${p.unit}`],
              ["Min / max", `${p.minStock} / ${p.maxStock}`],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-muted text-[11px] tracking-wide uppercase">{label}</p>
                <p className="mt-0.5 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
          {p.description ? (
            <p className="text-muted border-line mt-5 border-t pt-4 text-sm">{p.description}</p>
          ) : null}
          <div className="bg-surface-2 mt-5 flex flex-wrap gap-6 rounded-xl p-4 text-sm">
            <div>
              <p className="text-muted text-xs">Stock value (cost)</p>
              <p className="text-lg font-semibold">{formatCurrency(stockValue)}</p>
            </div>
            <div>
              <p className="text-muted text-xs">Retail value</p>
              <p className="text-lg font-semibold">
                {formatCurrency(Number(p.sellingPrice) * p.currentStock)}
              </p>
            </div>
            <div>
              <p className="text-muted text-xs">Coverage vs minimum</p>
              <p className="text-lg font-semibold">
                {p.minStock > 0 ? `${Math.round((p.currentStock / p.minStock) * 100)}%` : "∞"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Signed QR label" subtitle="Scan on the floor to act instantly" />
          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="rounded-2xl bg-white p-4">
              <QRCodeSVG value={data.qr} size={170} />
            </div>
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(`/api/qr/${p.id}?format=png`, "_blank")}
              >
                <Download className="h-4 w-4" /> PNG
              </Button>
              <Button
                className="flex-1"
                onClick={() => window.open(`/api/qr/labels?ids=${p.id}`, "_blank")}
              >
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <SectionTitle title="Movement history" subtitle="Last 25 stock events for this product" />
        <div className="mt-3">
          <TableShell>
            <table className="w-full min-w-[720px] text-sm">
              <thead className="surface-2 text-muted text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Before → After</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-left">User</th>
                </tr>
              </thead>
              <tbody>
                {data.movements.map((m) => (
                  <tr key={m.id} className="border-line border-t">
                    <td className="px-4 py-3">{formatDateTime(m.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          m.type === "IN" || m.type === "RETURN"
                            ? "success"
                            : m.type === "OUT" || m.type === "TRANSFER"
                              ? "danger"
                              : "info"
                        }
                      >
                        {m.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{m.quantity}</td>
                    <td className="text-muted px-4 py-3 text-right">
                      {m.previousQuantity} → {m.newQuantity}
                    </td>
                    <td className="px-4 py-3">{m.reason ?? "—"}</td>
                    <td className="px-4 py-3">{m.userName ?? "System"}</td>
                  </tr>
                ))}
                {data.movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted px-4 py-10 text-center">
                      No movements recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </TableShell>
        </div>
      </div>

      <ProductDialog open={editOpen} onClose={() => setEditOpen(false)} product={p} />
      <MovementDialog
        open={movementOpen}
        onClose={() => setMovementOpen(false)}
        product={p}
      />
    </div>
  );
}
