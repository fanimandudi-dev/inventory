"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Monitor, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { api } from "@/lib/client";
import { Badge, Button, Card, Field, Input, SectionTitle, Skeleton } from "@/components/ui";
import { formatDateTime, relativeTime } from "@/lib/utils";

type Me = {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    phone: string | null;
    jobTitle: string | null;
    lastLoginAt: string | null;
    createdAt: string;
  };
  sessions: {
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: string;
    expiresAt: string;
  }[];
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    jobTitle: "",
    currentPassword: "",
    newPassword: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<Me>("/api/auth/me"),
  });

  useEffect(() => {
    if (data?.user) {
      setForm((f) => ({
        ...f,
        fullName: data.user.fullName,
        phone: data.user.phone ?? "",
        jobTitle: data.user.jobTitle ?? "",
      }));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch("/api/auth/me", {
        fullName: form.fullName,
        phone: form.phone,
        jobTitle: form.jobTitle,
        ...(form.newPassword
          ? { currentPassword: form.currentPassword, newPassword: form.newPassword }
          : {}),
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      setForm((f) => ({ ...f, currentPassword: "", newPassword: "" }));
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/api/auth/sessions/${id}`),
    onSuccess: () => {
      toast.success("Session revoked");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  if (isLoading || !data) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-5">
      <SectionTitle title="Settings" subtitle="Profile, security and workspace preferences" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle
            title="Profile"
            subtitle="Displayed across the workspace and audit trail"
            action={<UserCog className="text-muted h-4 w-4" />}
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input value={data.user.email} disabled />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Job title">
              <Input
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              />
            </Field>
            <Field label="Current password" hint="Required only when changing the password">
              <Input
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              />
            </Field>
            <Field label="New password">
              <Input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save profile
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle title="Access" subtitle="Role-based permissions" />
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Role</span>
                <Badge tone="brand">
                  <ShieldCheck className="h-3 w-3" /> {data.user.role}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Member since</span>
                <span>{formatDateTime(data.user.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Last login</span>
                <span>{data.user.lastLoginAt ? relativeTime(data.user.lastLoginAt) : "—"}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Appearance" subtitle="Theme preference" />
            <div className="mt-4 flex gap-2">
              {["light", "dark"].map((t) => (
                <Button
                  key={t}
                  variant={theme === t ? "primary" : "outline"}
                  className="flex-1 capitalize"
                  onClick={() => setTheme(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Active sessions"
          subtitle="Refresh tokens currently valid for your account"
          action={<Monitor className="text-muted h-4 w-4" />}
        />
        <div className="mt-4 space-y-2">
          {data.sessions.map((s) => (
            <div
              key={s.id}
              className="border-line flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{s.userAgent ?? "Unknown device"}</p>
                <p className="text-muted text-xs">
                  {s.ipAddress ?? "unknown IP"} · started {relativeTime(s.createdAt)} · expires{" "}
                  {formatDateTime(s.expiresAt)}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => revoke.mutate(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {data.sessions.length === 0 ? (
            <p className="text-muted text-sm">No active sessions.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
