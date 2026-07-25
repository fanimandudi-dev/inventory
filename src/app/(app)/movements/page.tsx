"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ClipboardList, Download, Plus, Search } from "lucide-react";
import { api, type MovementDTO, type Paged, type ProductDTO } from "@/lib/client";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  SectionTitle,
  Select,
  Skeleton,
  TableShell,
} from "@/components/ui";
import { MovementDialog } from "@/components/dialogs";
import { formatDateTime } from "@/lib/utils";

export default function MovementsPage() {
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<ProductDTO | null>(null);

  const params = new URLSearchParams({
    page: String(page),
    limit: "15",
    ...(type ? { type } : {}),
    ...(search ? { search } : {}),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["movements", params.toString()],
    queryFn: () => api.get<Paged<MovementDTO>>(`/api/movements?${params.toString()}`),
  });

  const products = useQuery({
    queryKey: ["products", "picker"],
    queryFn: () => api.get<Paged<ProductDTO>>("/api/products?limit=100&sort=name&direction=asc"),
    enabled: pickerOpen,
  });

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Stock movements"
        subtitle="Every in, out, adjustment, transfer, return and count"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open("/api/reports?type=movements&format=csv", "_blank")}
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" /> New movement
            </Button>
          </div>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="text-muted pointer-events-none absolute top-2.5 left-3 h-4 w-4" />
            <Input
              className="pl-9"
              placeholder="Search product or SKU…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All movement types</option>
            {["IN", "OUT", "ADJUSTMENT", "TRANSFER", "RETURN", "COUNT"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" />}
            title="No movements found"
            description="Record your first stock movement or adjust the filters."
          />
        </Card>
      ) : (
        <TableShell>
          <table className="w-full min-w-[900px] text-sm">
            <thead className="surface-2 text-muted text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Before → After</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Warehouse</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((m) => (
                <tr key={m.id} className="border-line hover:bg-surface-2 border-t">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/products/${m.productId}`} className="font-medium hover:underline">
                      {m.productName}
                    </Link>
                    <p className="text-muted font-mono text-xs">{m.productSku}</p>
                  </td>
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
                  <td className="px-4 py-3">{m.warehouseName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      {data ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted">
            {data.meta.total} movements · page {data.meta.page}/{data.meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {pickerOpen && !selected ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 pt-20 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPickerOpen(false);
          }}
        >
          <Card className="max-h-[70vh] w-full max-w-lg overflow-y-auto p-4">
            <p className="mb-3 font-semibold">Select a product</p>
            <div className="space-y-1">
              {(products.data?.items ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelected(p);
                    setPickerOpen(false);
                  }}
                  className="hover:bg-surface-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm"
                >
                  <span>{p.name}</span>
                  <span className="text-muted font-mono text-xs">
                    {p.sku} · {p.currentStock}
                  </span>
                </button>
              ))}
              {products.isLoading ? <Skeleton className="h-32" /> : null}
            </div>
          </Card>
        </div>
      ) : null}

      <MovementDialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        product={selected}
      />
    </div>
  );
}
