"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState, type ReactNode, useEffect } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 20_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  useEffect(() => {
    const id = setInterval(
      () => {
        fetch("/api/auth/refresh", { method: "POST" }).catch(() => {});
      },
      30 * 60 * 1000,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={client}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
