"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Pencil, Plus, Warehouse } from "lucide-react";
import { api } from "@/lib/client";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  SectionTitle,
  Skeleton,
} from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/utils";

type WarehouseRow = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  country: string | null;
  manager: string | null;
  productCount: number;
  totalUnits: string;
  stockValue: string;
  locations: { id: string; zone: string; shelf: string; bin: string; label: string }[];
};

const EMPTY = { name: "", code: "", address: "", city: "", country: "", manager: "" };

export default function WarehousesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseRow | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => api.get<{ items: WarehouseRow[] }>("/api/warehouses"),
  });

  const save = useMutation({
    mutationFn: () =>
      editing ? api.patch(`/api/warehouses/${editing.id}`, form) : api.post("/api/warehouses", form),
    onSuccess: () => {
      toast.success(editing ? "Warehouse updated" : "Warehouse created with default zones");
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Warehouses"
        subtitle="Sites, zones, shelves and bin-level storage locations"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setForm(EMPTY);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New warehouse
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={<Warehouse className="h-5 w-5" />} title="No warehouses configured" />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((w) => (
            <Card key={w.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{w.name}</p>
                    <Badge tone="brand">{w.code}</Badge>
                  </div>
                  <p className="text-muted mt-1 flex items-center gap-1 text-xs">
                    <MapPin className="h-3 w-3" />
                    {[w.address, w.city, w.country].filter(Boolean).join(", ") || "No address"}
                  </p>
                  <p className="text-muted mt-1 text-xs">Manager: {w.manager ?? "—"}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(w);
                    setForm({
                      name: w.name,
                      code: w.code,
                      address: w.address ?? "",
                      city: w.city ?? "",
                      country: w.country ?? "",
                      manager: w.manager ?? "",
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>

              <div className="bg-surface-2 mt-4 grid grid-cols-3 gap-2 rounded-xl p-3 text-center">
                <div>
                  <p className="text-muted text-xs">Products</p>
                  <p className="font-semibold">{w.productCount}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Units</p>
                  <p className="font-semibold">{formatNumber(w.totalUnits)}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Value</p>
                  <p className="font-semibold">{formatCurrency(w.stockValue)}</p>
                </div>
              </div>

              <button
                onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                className="text-brand mt-3 text-xs font-medium"
              >
                {expanded === w.id ? "Hide" : "Show"} {w.locations.length} storage locations
              </button>
              {expanded === w.id ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {w.locations.map((l) => (
                    <span
                      key={l.id}
                      className="border-line text-muted rounded-lg border px-2 py-1 font-mono text-[11px]"
                    >
                      {l.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit warehouse" : "New warehouse"}
        description={editing ? undefined : "Zones A–B with 3 shelves are created automatically."}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Code">
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="PAR"
            />
          </Field>
          <Field label="Manager">
            <Input
              value={form.manager}
              onChange={(e) => setForm({ ...form, manager: e.target.value })}
            />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="Country">
            <Input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.name || !form.code}
            >
              {editing ? "Save changes" : "Create warehouse"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
