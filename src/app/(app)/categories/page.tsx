"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  SectionTitle,
  Select,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  parentId: string | null;
  productCount: number;
  stockValue: string;
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "#6366f1", parentId: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<{ items: CategoryRow[] }>("/api/categories"),
  });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api.patch(`/api/categories/${editing.id}`, form)
        : api.post("/api/categories", form),
    onSuccess: () => {
      toast.success(editing ? "Category updated" : "Category created");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/categories/${id}`),
    onSuccess: () => {
      toast.success("Category archived");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.items ?? [];

  function openNew() {
    setEditing(null);
    setForm({ name: "", description: "", color: "#6366f1", parentId: "" });
    setOpen(true);
  }

  function openEdit(row: CategoryRow) {
    setEditing(row);
    setForm({
      name: row.name,
      description: row.description ?? "",
      color: row.color,
      parentId: row.parentId ?? "",
    });
    setOpen(true);
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Categories"
        subtitle="Hierarchical product classification with live valuation"
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> New category
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tags className="h-5 w-5" />}
            title="No categories yet"
            description="Group your catalogue to unlock valuation insights."
            action={<Button onClick={openNew}>Create category</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                  <p className="font-semibold">{c.name}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-muted mt-2 line-clamp-2 text-sm">{c.description ?? "—"}</p>
              <div className="border-line mt-4 flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted">{c.productCount} products</span>
                <span className="font-semibold">{formatCurrency(c.stockValue)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit category" : "New category"}
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Color">
              <Input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </Field>
            <Field label="Parent category">
              <Select
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              >
                <option value="">None (top level)</option>
                {items
                  .filter((c) => c.id !== editing?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>
              {editing ? "Save changes" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Archive category"
        message={`${deleteTarget?.name ?? ""} will be archived. Products keep their history.`}
        confirmLabel="Archive"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}
