"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useEffect } from "react";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("surface shadow-card rounded-2xl", className)}>{children}</div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="text-muted mt-0.5 text-sm">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger" | "soft";
  size?: "sm" | "md" | "icon";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-4 py-2 text-sm",
        size === "icon" && "h-9 w-9",
        variant === "primary" && "bg-brand text-white hover:opacity-90 active:scale-[0.98]",
        variant === "outline" && "surface hover:bg-surface-2",
        variant === "ghost" && "hover:bg-surface-2 text-muted hover:text-[color:var(--ink)]",
        variant === "soft" && "bg-brand-soft text-brand hover:opacity-80",
        variant === "danger" && "bg-red-500 text-white hover:bg-red-600",
        className,
      )}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "surface w-full rounded-xl px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20",
        className,
      )}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "surface w-full rounded-xl px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20",
        className,
      )}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "surface w-full rounded-xl px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20",
        className,
      )}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-medium tracking-wide uppercase text-muted">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-red-500">{error}</span>
      ) : hint ? (
        <span className="text-muted block text-xs">{hint}</span>
      ) : null}
    </label>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "brand" | "info";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "neutral" && "bg-surface-2 text-muted",
        tone === "success" && "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
        tone === "warning" && "bg-amber-500/12 text-amber-600 dark:text-amber-400",
        tone === "danger" && "bg-red-500/12 text-red-600 dark:text-red-400",
        tone === "info" && "bg-sky-500/12 text-sky-600 dark:text-sky-400",
        tone === "brand" && "bg-brand-soft text-brand",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="bg-brand-soft text-brand flex h-12 w-12 items-center justify-center rounded-2xl">
        {icon}
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        {description ? <p className="text-muted mt-1 text-sm">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm sm:p-8"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={cn(
              "surface shadow-card my-auto w-full rounded-2xl",
              wide ? "max-w-3xl" : "max-w-lg",
            )}
          >
            <div className="border-line flex items-start justify-between gap-4 border-b p-5">
              <div>
                <h3 className="font-semibold">{title}</h3>
                {description ? (
                  <p className="text-muted mt-0.5 text-sm">{description}</p>
                ) : null}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onClose,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-muted text-sm">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? "Working…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function StockBadge({ stock, min }: { stock: number; min: number }) {
  if (stock <= 0) return <Badge tone="danger">Out of stock</Badge>;
  if (stock <= min) return <Badge tone="warning">Low stock</Badge>;
  return <Badge tone="success">In stock</Badge>;
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="surface shadow-card overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
