"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Boxes, Loader2, LogIn } from "lucide-react";
import { api } from "@/lib/client";
import { Button, Card, Field, Input } from "@/components/ui";

type FormValues = { email: string; password: string };

const DEMO_ACCOUNTS = [
  { role: "Administrator", email: "admin@stockflow.io" },
  { role: "Inventory Manager", email: "manager@stockflow.io" },
  { role: "Employee", email: "employee@stockflow.io" },
  { role: "Auditor", email: "auditor@stockflow.io" },
];

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { email: "admin@stockflow.io", password: "Password123!" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      if (forgot) {
        const res = await api.post<{ message: string }>("/api/auth/forgot-password", {
          email: values.email,
        });
        toast.success(res.message);
        setForgot(false);
        return;
      }
      await api.post("/api/auth/login", values);
      toast.success("Welcome back!");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="bg-brand flex h-9 w-9 items-center justify-center rounded-xl text-white">
          <Boxes className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold">StockFlow</span>
      </div>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {forgot ? "Reset your password" : "Sign in to your workspace"}
        </h2>
        <p className="text-muted mt-1 text-sm">
          {forgot
            ? "We'll email you a secure reset link."
            : "Use one of the demo accounts below or your own credentials."}
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              {...register("email", { required: "Email is required" })}
            />
          </Field>
          {!forgot ? (
            <Field label="Password" error={errors.password?.message}>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password", { required: "Password is required" })}
              />
            </Field>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {forgot ? "Send reset link" : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={() => setForgot((v) => !v)}
            className="text-muted hover:text-brand w-full text-center text-xs"
          >
            {forgot ? "Back to sign in" : "Forgot your password?"}
          </button>
        </form>
      </Card>

      <Card className="p-4">
        <p className="text-muted mb-3 text-xs font-semibold tracking-wide uppercase">
          Demo accounts · password: Password123!
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => {
                setValue("email", acc.email);
                setValue("password", "Password123!");
                toast.info(`${acc.role} credentials filled`);
              }}
              className="hover:bg-surface-2 border-line rounded-xl border p-3 text-left transition"
            >
              <p className="text-sm font-medium">{acc.role}</p>
              <p className="text-muted text-xs">{acc.email}</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
