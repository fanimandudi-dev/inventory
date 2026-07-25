"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Pencil, Phone, Plus, Trash2, Truck } from "lucide-react";
import { api } from "@/lib/client";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  SectionTitle,
  Skeleton,
  Textarea,
} from "@/components/ui";

type SupplierRow = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  notes: string | null;
  productCount: number;
};

const EMPTY = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  country: "",
  notes: "",
};

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierRow | null>(null);
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get<{ items: SupplierRow[] }>("/api/suppliers"),
  });

  const save = useMutation({
    mutationFn: () =>
      editing ? api.patch(`/api/suppliers/${editing.id}`, form) : api.post("/api/suppliers", form),
    onSuccess: () => {
      toast.success(editing ? "Supplier updated" : "Supplier created");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/suppliers/${id}`),
    onSuccess: () => {
      toast.success("Supplier archived");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Suppliers"
        subtitle="Vendor directory linked to purchasing and replenishment"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setForm(EMPTY);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New supplier
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={<Truck className="h-5 w-5" />} title="No suppliers yet" />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <Card key={s.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-muted text-xs">{s.contactPerson ?? "No contact"}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(s);
                      setForm({
                        name: s.name,
                        contactPerson: s.contactPerson ?? "",
                        email: s.email ?? "",
                        phone: s.phone ?? "",
                        address: s.address ?? "",
                        country: s.country ?? "",
                        notes: s.notes ?? "",
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-muted mt-3 space-y-1 text-sm">
                {s.email ? (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3 w-3" /> {s.email}
                  </p>
                ) : null}
                {s.phone ? (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3 w-3" /> {s.phone}
                  </p>
                ) : null}
                <p>{[s.address, s.country].filter(Boolean).join(", ") || "—"}</p>
              </div>
              <div className="border-line mt-auto flex items-center justify-between border-t pt-3 text-sm">
                <Badge tone="brand">{s.productCount} products</Badge>
                <span className="text-muted line-clamp-1 text-xs">{s.notes ?? ""}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit supplier" : "New supplier"} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Contact person">
            <Input
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>
              {editing ? "Save changes" : "Create supplier"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Archive supplier"
        message={`${deleteTarget?.name ?? ""} will be archived.`}
        confirmLabel="Archive"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}
