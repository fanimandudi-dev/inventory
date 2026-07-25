"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Repeat,
  Search,
  Trash2,
} from "lucide-react";
import { api, type Paged, type ProductDTO } from "@/lib/client";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  SectionTitle,
  Select,
  Skeleton,
  StockBadge,
  TableShell,
} from "@/components/ui";
import { MovementDialog, ProductDialog, QrDialog, useRefData } from "@/components/dialogs";
import { formatCurrency } from "@/lib/utils";

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const ref = useRefData();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [stockState, setStockState] = useState("");
  const [sort, setSort] = useState("updated");
  const [direction, setDirection] = useState("desc");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [qrProduct, setQrProduct] = useState<ProductDTO | null>(null);
  const [movementProduct, setMovementProduct] = useState<ProductDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductDTO | null>(null);

  const params = new URLSearchParams({
    page: String(page),
    limit: "12",
    sort,
    direction,
    ...(search ? { search } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(stockState ? { stockState } : {}),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["products", params.toString()],
    queryFn: () => api.get<Paged<ProductDTO>>(`/api/products?${params.toString()}`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/${id}`),
    onSuccess: () => {
      toast.success("Product archived");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteTarget(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Products"
        subtitle="Catalogue, stock levels and signed QR labels"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                window.open(`/api/qr/labels?ids=${items.map((p) => p.id).join(",")}`, "_blank")
              }
            >
              <Printer className="h-4 w-4" /> Label sheet
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New product
            </Button>
          </div>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="text-muted pointer-events-none absolute top-2.5 left-3 h-4 w-4" />
            <Input
              className="pl-9"
              placeholder="Search name, SKU, barcode…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {ref.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All warehouses</option>
            {ref.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Select
            value={stockState}
            onChange={(e) => {
              setStockState(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Any stock level</option>
            <option value="ok">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="h-5 w-5" />}
            title="No products found"
            description="Adjust your filters or create your first product."
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> New product
              </Button>
            }
          />
        </Card>
      ) : (
        <TableShell>
          <table className="w-full min-w-[900px] text-sm">
            <thead className="surface-2 text-muted text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => {
                      setSort("name");
                      setDirection(direction === "asc" ? "desc" : "asc");
                    }}
                  >
                    Product <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Warehouse</th>
                <th className="px-4 py-3 text-right">
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => {
                      setSort("stock");
                      setDirection(direction === "asc" ? "desc" : "asc");
                    }}
                  >
                    Stock <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-line hover:bg-surface-2 border-t transition">
                  <td className="px-4 py-3">
                    <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-muted font-mono text-xs">{p.sku}</p>
                  </td>
                  <td className="px-4 py-3">
                    {p.categoryName ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: p.categoryColor ?? "#888" }}
                        />
                        {p.categoryName}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p>{p.warehouseName ?? "—"}</p>
                    <p className="text-muted text-xs">{p.locationLabel ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold">{p.currentStock}</p>
                    <p className="text-muted text-xs">min {p.minStock}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(Number(p.purchasePrice) * p.currentStock)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <StockBadge stock={p.currentStock} min={p.minStock} />
                      {p.status !== "ACTIVE" ? <Badge>{p.status}</Badge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setQrProduct(p)} title="QR code">
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMovementProduct(p)}
                        title="Stock movement"
                      >
                        <Repeat className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(p)}
                        title="Archive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      {data ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted">
            Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} products
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
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

      <ProductDialog open={formOpen} onClose={() => setFormOpen(false)} product={editing} />
      <QrDialog open={Boolean(qrProduct)} onClose={() => setQrProduct(null)} product={qrProduct} />
      <MovementDialog
        open={Boolean(movementProduct)}
        onClose={() => setMovementProduct(null)}
        product={movementProduct}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Archive product"
        message={`${deleteTarget?.name ?? ""} will be soft-deleted and hidden from the catalogue. History is preserved.`}
        confirmLabel="Archive"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}
